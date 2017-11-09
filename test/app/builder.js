
function TestBuildHelper(setup, assert, accounts, platformWalletAddress){
    this.setup = setup;
    this.assert = assert;
    this.accounts = accounts;
    this.deployed = [];
    this.platformWalletAddress = platformWalletAddress;

    this.assignTeamWallets();
}

TestBuildHelper.prototype.deployAndInitializeAsset = async function (assetName, requiredAssets) {

    // deploy application
    let app = await this.deploy("ApplicationEntity");

    // add bylaws into app
    await this.addBylawsIntoApp();

    // deploy asset contract
    let assetContract = await this.deploy(assetName);

    // deploy and add requirement asset contracts
    for(let i = 0; i < requiredAssets.length; i++) {
        let name = requiredAssets[i];
        let deployed = await this.deploy(name);
        await app["addAsset"+name](await deployed.address);
    }

    // add current asset
    await app["addAsset"+assetName](await assetContract.address);

    // set gw address so we can initialize
    await app.setTestGatewayInterfaceEntity(this.accounts[0]);

    // grab ownership of the assets so we can do tests
    await app.initializeAssetsToThisApplication();

    return assetContract;
};

TestBuildHelper.prototype.addBylawsIntoApp = async function () {

};

TestBuildHelper.prototype.addFundingStage = async function ( id, overrides ) {

    let settings = {};
    let target = this.setup.settings.funding_periods[id];

    if(typeof overrides === 'object') {
        for (let key in target) {
            if (overrides.hasOwnProperty(key)) {
                settings[key] = overrides[key];
            } else {
                settings[key] = target[key];
            }
        }
    } else {
        settings = target;
    }

    let object = this.getDeployedByName("Funding");

    return await object.addFundingStage(
        settings.name,
        settings.description,
        settings.start_time,
        settings.end_time,
        settings.amount_cap_soft,
        settings.amount_cap_hard,
        settings.methods,
        settings.minimum_entry,
        settings.start_parity,
        settings.use_parity_from_previous,
        settings.token_share_percentage
    );
};

TestBuildHelper.prototype.timeTravelTo = async function (newtime) {
    let DeployedApplication = this.getDeployedByName("ApplicationEntity");
    let time = await DeployedApplication.getTimestamp.call();
    await DeployedApplication.setTestTimestamp(newtime);
    // console.log("Current Time: ", this.setup.helpers.utils.toDate(time));
    // console.log("New Time:     ", this.setup.helpers.utils.toDate(newtime));
};

TestBuildHelper.prototype.FundingManagerProcessVaults = async function (iteration, debug) {
    let FundingManager = this.getDeployedByName("FundingManager");
    let tx = await FundingManager.doStateChanges(false);

    if(debug) {
        await this.setup.helpers.utils.showGasUsage(this.setup.helpers, tx, 'FundingManager State Change [' + iteration + ']');
        await this.setup.helpers.utils.showCurrentState(this.setup.helpers, FundingManager);
    }

//    let vaultNum = await FundingManager.vaultNum.call();
//    let lastProcessedVaultId = await FundingManager.lastProcessedVaultId.call();
    let hasChanges = await this.requiresStateChanges("FundingManager");

//    if(vaultNum >= lastProcessedVaultId && hasChanges === true) {
    if(hasChanges === true) {
        await this.FundingManagerProcessVaults(iteration+1, debug);
    }
};

TestBuildHelper.prototype.requiresStateChanges = async function (assetName) {
    let Asset = this.getDeployedByName(assetName);
    return await Asset.hasRequiredStateChanges.call();
};

TestBuildHelper.prototype.insertPaymentsIntoFunding = async function (reach_soft_cap) {

    let FundingAsset = this.getDeployedByName("Funding");

    // funding inputs
    let FundingInputDirectAddress = await FundingAsset.DirectInput.call();
    let FundingInputMilestoneAddress = await FundingAsset.MilestoneInput.call();

    let FundingInputDirectContract = await this.setup.helpers.getContract('FundingInputDirect');
    let FundingInputMilestoneContract = await this.setup.helpers.getContract('FundingInputMilestone');

    let FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
    let FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

    let tx = await this.timeTravelTo(this.setup.settings.funding_periods[1].start_time + 1);
    tx = await FundingAsset.doStateChanges(true);

    let paymentNum = 9;
    let PaymentValue = 1 * this.setup.helpers.solidity.ether; // 100 wei  //0.01 * helpers.solidity.ether;

    if(reach_soft_cap) {
        PaymentValue = new this.setup.helpers.BigNumber(5000).mul( 10 ** 18 );
    }

    let acc_start = 10;
    let acc_end = 20;
    let acc = acc_start;
    let accNum = acc_end - acc_start + 1;
    if (accNum > paymentNum) {
        accNum = paymentNum;
    }

    for (let i = 0; i < paymentNum; i++) {
        // console.log("Payment ["+i+"] from account["+acc+"]", accounts[acc]);
        await FundingInputMilestone.sendTransaction({
            value: PaymentValue.toString(),
            from: this.accounts[acc] // starts at investorWallet1
        });

        acc++;
        if (acc === acc_end + 1) {
            acc = acc_start;
        }
    }
};

TestBuildHelper.prototype.FundingProcessAllVaults = async function (debug) {
    let result = [];
    let processPerCall = 5;
    let FundingManager = this.getDeployedByName("FundingManager");
    let lastProcessedVaultId = await FundingManager.lastProcessedVaultId.call();

    if(debug === true) {
        console.log("lastProcessedVaultId: ", lastProcessedVaultId.toString());
    }

    let processTx = await FundingManager.ProcessVaultList(processPerCall);
    result.push(processTx);
    if(debug === true) {

        let eventFilter = this.setup.helpers.utils.hasEvent(
            processTx,
            'EventFundingManagerProcessedVault(address,uint256)'
        );

        for (let i = 0; i < eventFilter.length; i++) {
            let vaultAddress = this.setup.helpers.utils.topicToAddress(eventFilter[i].topics[1]);
            let _cnt = this.setup.helpers.web3util.toDecimal(eventFilter[i].topics[2]);

            console.log(vaultAddress, " cnt: ", _cnt);
        }
        await this.setup.helpers.utils.showGasUsage(this.setup.helpers, processTx, " Process Gas Usage");
    }

    let vaultNum = await FundingManager.vaultNum.call();
    lastProcessedVaultId = await FundingManager.lastProcessedVaultId.call();
    if(vaultNum > lastProcessedVaultId) {
        let res = await this.FundingProcessAllVaults(debug);
        for(let i = 0; i < res.length; i++){
            result.push(res[i]);
        }
    }
    return result;
};


TestBuildHelper.prototype.ValidateFundingState = async function ( entity_start, entity_required, record_start, record_required ) {

    let FundingAsset = this.getDeployedByName("Funding");

    let CurrentRecordState, RecordStateRequired, CurrentEntityState, EntityStateRequired;
    let States = await FundingAsset.getRequiredStateChanges.call();
    CurrentRecordState = States[0];
    RecordStateRequired = States[1];
    EntityStateRequired = States[2];
    CurrentEntityState = await FundingAsset.CurrentEntityState.call();


    if(CurrentEntityState.toString() !== entity_start) {
        return false;
    }
    else if(EntityStateRequired.toString() !== entity_required) {
        return false;
    }
    else if(CurrentRecordState.toString() !== record_start) {
        return false;
    }
    else if(RecordStateRequired.toString() !== record_required) {
        return false;
    }

    return true;
};


TestBuildHelper.prototype.ValidateAssetState = async function ( assetName, entity_start, entity_required ) {

    let Asset = this.getDeployedByName(assetName);

    let States = await Asset.getRequiredStateChanges.call();
    let CurrentEntityState = States[0];
    let RequiredEntityState = States[1];

    if(CurrentEntityState.toString() !== entity_start) {
        return false;
    }
    else if(RequiredEntityState.toString() !== entity_required) {
        return false;
    }

    return true;
};



TestBuildHelper.prototype.assignTeamWallets = async function () {
    for(i = 0; i < this.setup.settings.team_wallets.length; i++) {
        if(this.setup.settings.team_wallets[i].address === 0) {
            this.setup.settings.team_wallets[i].address = this.accounts[this.setup.settings.team_wallets[i].address_rpc];
        }
    }
};

TestBuildHelper.prototype.getMyVaultAddress = async function (myAddress) {
    let FundingManager = this.getDeployedByName("FundingManager");
    let VaultAddress = await FundingManager.getMyVaultAddress.call(myAddress);
    let contract = await this.getContract("TestFundingVault");
    return await contract.at(VaultAddress.toString());
};

TestBuildHelper.prototype.addFundingSettings = async function () {
    let fundingAsset = this.getDeployedByName("Funding");
    await fundingAsset.addSettings(
        this.platformWalletAddress,
        this.setup.settings.bylaws["funding_global_soft_cap"],
        this.setup.settings.bylaws["funding_global_hard_cap"]
    );

};

TestBuildHelper.prototype.getTokenStakeInFundingPeriod = async function (FundingPeriodId, DirectPaymentValue) {

    let fundingAsset = this.getDeployedByName("Funding");
    let FundingSettings = await fundingAsset.getFundingStageVariablesRequiredBySCADA.call(FundingPeriodId);
    // let token_share_percentage = FundingSettings[0];
    let amount_raised = FundingSettings[1];

    let percentInSettings = this.setup.settings.funding_periods[FundingPeriodId].token_share_percentage.toString();
    let tokenSupplyInSettings = this.setup.settings.token.supply;

    let raisedAmount = new this.setup.helpers.BigNumber( amount_raised.toString() );                  // should be paymentValue
    let totalTokenSupply = new this.setup.helpers.BigNumber( tokenSupplyInSettings.toString() );      // 5 mil integral tokens

    let tokensInStage = totalTokenSupply.mul(percentInSettings).div(100);

    let result = tokensInStage.mul( DirectPaymentValue ).div(raisedAmount);
    if(result.toString() === "NaN") {
        result = new this.setup.helpers.BigNumber(0);
    }
    return result;
};



TestBuildHelper.prototype.AddAssetSettingsAndLock = async function (name) {
    let object = this.getDeployedByName(name);
    if(name === "TokenManager") {
        // add token settings
        let token_settings = this.setup.settings.token;

        await object.addTokenSettingsAndInit(
            token_settings.supply.toString(),
            token_settings.decimals,
            token_settings.name,
            token_settings.symbol,
            token_settings.version
        );

    } else if(name === "Funding") {
        // add funding phases

        for(let i = 0; i < this.setup.settings.funding_periods.length; i++) {
            await this.addFundingStage(i);
        }

        // add global funding settings like hard cap and such
        await this.addFundingSettings();
    }

    // lock contract settings and apply them
    await object.applyAndLockSettings();
    return object;
};

TestBuildHelper.prototype.deploy = async function (name) {
    let object = await this.getContract("Test"+name);
    this.deployed[name] = await object.new();
    return this.deployed[name];
};

TestBuildHelper.prototype.getDeployedByName = function (name) {
    return this.deployed[name];
};

TestBuildHelper.prototype.getDeployedContracts = function () {
    return this.deployed;
};

TestBuildHelper.prototype.getContract = async function (assetName) {
    return await this.setup.helpers.getContract(assetName);
};

module.exports = TestBuildHelper;

