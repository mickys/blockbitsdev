let logPre = "      ";

function TestBuildHelper(setup, assert, accounts, platformWalletAddress) {
    this.setup = setup;
    this.assert = assert;
    this.accounts = accounts;
    this.deployed = [];
    this.platformWalletAddress = platformWalletAddress;

    this.gatewayAddress = this.accounts[0];
}

TestBuildHelper.prototype.linkToRealGateway = async function () {
    let gateway = await this.deploy("GatewayInterface");
    this.gatewayAddress = await gateway.address;
};

TestBuildHelper.prototype.deployAndInitializeApplication = async function () {

    // deploy application
    let app = await this.deploy("ApplicationEntity");

    // add bylaws into app
    await this.addBylawsIntoApp();

    // deploy and add requirement asset contracts
    for (let i = 0; i < this.setup.assetContractNames.length; i++) {
        let name = this.setup.assetContractNames[i];
        let deployed = await this.deploy(name);
        await deployed.setInitialApplicationAddress(app.address);
        await app["addAsset" + name](await deployed.address);
    }

    if(this.gatewayAddress === this.accounts[0]) {

        // set gw address so we can initialize
        await app.setTestGatewayInterfaceEntity(this.accounts[0]);

        // grab ownership of the assets so we can do tests
        await app.initializeAssetsToThisApplication();

    } else {

        // link to real gateway contract
        await app.linkToGateway(this.gatewayAddress, this.setup.settings.sourceCodeUrl);
    }
    return app;
};


TestBuildHelper.prototype.AddAllAssetSettingsAndLockExcept = async function (except) {
    for (let i = 0; i < this.setup.assetContractNames.length; i++) {
        let name = this.setup.assetContractNames[i];
        if(typeof except !== "undefined") {
            if(name !== except) {
                await this.AddAssetSettingsAndLock(name);
            }
        } else {
            await this.AddAssetSettingsAndLock(name);
        }
    }
};


TestBuildHelper.prototype.deployAndInitializeAsset = async function (assetName, requiredAssets) {

    // deploy application
    let app = await this.deploy("ApplicationEntity");

    // add bylaws into app
    await this.addBylawsIntoApp();

    // deploy asset contract
    let assetContract = await this.deploy(assetName);

    // as deployer, set asset owner, so we make sure noone else can initialize except app.
    await assetContract.setInitialApplicationAddress(app.address);

    // if requiredAssets exists
    if(typeof requiredAssets !== "undefined") {
        // deploy and add requirement asset contracts
        for (let i = 0; i < requiredAssets.length; i++) {
            let name = requiredAssets[i];
            let deployed = await this.deploy(name);
            await deployed.setInitialApplicationAddress(app.address);
            await app["addAsset" + name](await deployed.address);
        }
    }
    // add current asset
    await app["addAsset" + assetName](await assetContract.address);

    if(this.gatewayAddress === this.accounts[0]) {

        // set gw address so we can initialize
        await app.setTestGatewayInterfaceEntity(this.accounts[0]);

        // grab ownership of the assets so we can do tests
        await app.initializeAssetsToThisApplication();

    } else {
        // link to real gateway contract
        await app.linkToGateway(this.gatewayAddress, this.setup.settings.sourceCodeUrl);
    }

    return assetContract;
};

TestBuildHelper.prototype.addBylawsIntoApp = async function () {

    let application = await this.getDeployedByName("ApplicationEntity");
    for (let key in this.setup.settings.bylaws) {

        if(key.length > 32) {
            throw "TestBuildHelper.addBylawsIntoApp: ["+key+"] Bylaws key length higher than allowed 32 bytes!";
        }
        let value = this.setup.settings.bylaws[key];
        // store string bylaw

        if(typeof value === "string") {
            await application.setBylawBytes32(key, value);
        } else {
            // uints and booleans
            // convert booleans to 1 / 0
            if(typeof value === "boolean") {
                if(value === true) {
                    value = 1;
                } else {
                    value = 0;
                }
            }
            await application.setBylawUint256(key, value.toString());
        }
    }
};

TestBuildHelper.prototype.addFundingStage = async function (id, overrides) {

    let settings = {};
    let target = this.setup.settings.funding_periods[id];

    if (typeof overrides === 'object') {
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
        settings.start_time,
        settings.end_time,
        settings.amount_cap_soft,
        settings.amount_cap_hard,
        settings.methods,
        settings.minimum_entry,
        settings.start_parity,
        settings.price_addition_percentage,
        settings.token_share_percentage
    );
};

TestBuildHelper.prototype.addMilestoneRecord = async function (id, overrides) {

    let settings = {};
    let target = this.setup.settings.milestones[id];

    if (typeof overrides === 'object') {
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

    let object = this.getDeployedByName("Milestones");

    return await object.addRecord(
        settings.name,
        settings.description,
        settings.duration,
        settings.funding_percentage,
    );
};



TestBuildHelper.prototype.timeTravelTo = async function (newtime) {
    let DeployedApplication = this.getDeployedByName("ApplicationEntity");
    let time = await DeployedApplication.getTimestamp.call();
    await DeployedApplication.setTestTimestamp(newtime);
    // console.log("Current Time: ", this.setup.helpers.utils.toDate(time));
    // console.log("New Time:     ", this.setup.helpers.utils.toDate(newtime));
};

TestBuildHelper.prototype.FundingManagerProcessVaults = async function (debug, iteration) {

    if(typeof debug === "undefined") {
        debug = false;
    }

    if(typeof iteration === "undefined") {
        iteration = 0;
    }

    let FundingManager = this.getDeployedByName("FundingManager");
    if (debug) {
        console.log("FundingManagerProcessVaults _Before State:");
        await this.setup.helpers.utils.showCurrentState(this.setup.helpers, FundingManager);
    }
    let tx = await FundingManager.doStateChanges(false);

    if (debug) {
        console.log("FundingManagerProcessVaults _After State:");
        await this.setup.helpers.utils.showGasUsage(this.setup.helpers, tx, 'FundingManager State Change [' + iteration + ']');
        await this.setup.helpers.utils.showCurrentState(this.setup.helpers, FundingManager);
    }

    let hasChanges = await this.requiresStateChanges("FundingManager");

    if (hasChanges === true) {
        await this.FundingManagerProcessVaults(debug, iteration + 1);
    }
};

TestBuildHelper.prototype.requiresStateChanges = async function (assetName) {
    let Asset = this.getDeployedByName(assetName);
    return await Asset.hasRequiredStateChanges.call();
};

TestBuildHelper.prototype.getTokenContract = async function () {
    let TokenManager = await this.getDeployedByName("TokenManager");
    let TokenContractAddress = await TokenManager.TokenEntity.call();
    let TokenContract = await this.setup.helpers.getContract('TestToken');
    return await TokenContract.at(TokenContractAddress);
};

TestBuildHelper.prototype.displayAllVaultDetails = async function () {
    let FundingManager = await this.getDeployedByName("FundingManager");
    let vaultNum = await FundingManager.vaultNum.call();
    for (let i = 1; i <= vaultNum; i++) {
        let vaultAddress = await FundingManager.vaultById.call(i);
        await this.displayVaultDetails(vaultAddress, i);
    }

    let vaultAddress = await FundingManager.vaultById.call(1);
    let FundingVault = await this.getContract("TestFundingVault");
    let TokenSCADAContract = await this.getContract("TestTokenSCADA1Market");
    // get vault contents and display
    let vault = await FundingVault.at(vaultAddress);
    let SCADAAddress = await vault.TokenSCADAEntity.call();
    let TokenSCADA = await TokenSCADAContract.at(SCADAAddress);

    let preIcoParity = await TokenSCADA.getTokenParity.call(1);
    let IcoParity = await TokenSCADA.getTokenParity.call(2);

    let usedParity = IcoParity;
    if (preIcoParity.toNumber() < IcoParity.toNumber()) {
        usedParity = preIcoParity;
    }

    this.setup.helpers.utils.toLog("");
    this.setup.helpers.utils.toLog(logPre + "PRE Parity:          " + preIcoParity);
    this.setup.helpers.utils.toLog(logPre + "ICO Parity:          " + IcoParity);
    this.setup.helpers.utils.toLog(logPre + "Distribution Parity: " + usedParity);

    let unsoldTokenBalance = await TokenSCADA.getUnsoldTokenAmount.call();
    let unsoldTokenBalanceInFull = this.setup.helpers.web3util.fromWei(unsoldTokenBalance, "ether");
    this.setup.helpers.utils.toLog(logPre + "Tokens Unsold:       " + unsoldTokenBalanceInFull);

    this.setup.helpers.utils.toLog("");
    let total = new this.setup.helpers.BigNumber(0);

    for (let i = 1; i <= vaultNum; i++) {
        let vaultAddress = await FundingManager.vaultById.call(i);
        let TokenBalance = await this.getTokenBalance(vaultAddress);
        let TokenBalanceInFull = this.setup.helpers.web3util.fromWei(TokenBalance, "ether");
        this.setup.helpers.utils.toLog(logPre + "Vault Balance ["+i+"]:   " + TokenBalanceInFull);

        total = total.add( this.setup.helpers.web3util.fromWei(TokenBalance, "wei") );
        // this.setup.helpers.utils.toLog(logPre + "Vault Distributed:   " + total.toString());
    }

    let totalInFull = this.setup.helpers.web3util.fromWei(total, "ether");
    this.setup.helpers.utils.toLog(logPre + "Tokens ADDED:        " + total.toString());

    let FundingManagerTokenBalance = await this.getTokenBalance(FundingManager.address.toString());
    let FundingManagerTokenBalanceInFull = this.setup.helpers.web3util.fromWei(FundingManagerTokenBalance, "ether");
    this.setup.helpers.utils.toLog(logPre + "FundingManager:      " + FundingManagerTokenBalanceInFull);

    let totalBalance = new this.setup.helpers.BigNumber(0);
    totalBalance = totalBalance.add( FundingManagerTokenBalance );
    totalBalance = totalBalance.add( total );

    let totalBalanceInFull = this.setup.helpers.web3util.fromWei(totalBalance, "ether");
    this.setup.helpers.utils.toLog(logPre + "Total Balance:       " + totalBalanceInFull);
};

TestBuildHelper.prototype.displayVaultDetails = async function (vaultAddress, id) {

    let FundingVault = await this.getContract("TestFundingVault");
    let TokenSCADAContract = await this.getContract("TestTokenSCADA1Market");
    // get vault contents and display
    let vault = await FundingVault.at(vaultAddress);
    let SCADAAddress = await vault.TokenSCADAEntity.call();
    let TokenSCADA = await TokenSCADAContract.at(SCADAAddress);

    let vaultOwner = await vault.vaultOwner.call();
    let balance = await this.setup.helpers.utils.getBalance(this.setup.helpers.artifacts, vaultAddress);
    let balanceInEth = this.setup.helpers.web3util.fromWei(balance, "ether");

    this.setup.helpers.utils.toLog("\n" + logPre + "Vault Id:             " + "[" + id + "]");
    this.setup.helpers.utils.toLog(logPre + "Address:             " + vaultAddress);
    this.setup.helpers.utils.toLog(logPre + "Owner Address:       " + vaultOwner);
    this.setup.helpers.utils.toLog(logPre + "Balance in eth:      " + balanceInEth);

    for (let paymentId = 1; paymentId <= await vault.purchaseRecordsNum.call(); paymentId++) {
        let record = await vault.purchaseRecords.call(paymentId);
        let recordAmount = record[2];
        let recordAmountInEth = this.setup.helpers.web3util.fromWei(recordAmount, "ether");
        this.setup.helpers.utils.toLog(logPre + "Record [" + (paymentId) + "] eth:      " + recordAmountInEth);
    }

    let PreTokens;
    let IcoTokens;
    for (let stageId = 1; stageId <= this.setup.settings.funding_periods.length; stageId++) {
        let stageTokens = 0;
        let stageAmount = await vault.stageAmounts.call(stageId);

        if(stageId === 1) {
            stageTokens = await TokenSCADA.getMyTokensInFirstStage.call(vaultAddress);
            PreTokens = stageTokens;
        }
        else if(stageId === 2) {
            stageTokens = await TokenSCADA.getMyTokensInSecondStage.call(vaultAddress);
            IcoTokens = stageTokens;
        }

        let stageAmountInEth = this.setup.helpers.web3util.fromWei(stageAmount, "ether");
        this.setup.helpers.utils.toLog(logPre + "Stage [" + stageId + "] eth:       " + stageAmountInEth);
        let stageTokenIntegral = this.setup.helpers.web3util.fromWei(stageTokens, "ether");
        this.setup.helpers.utils.toLog(logPre + "Stage [" + stageId + "] tokens:    " + stageTokenIntegral);
    }

    let tokenBalance = await this.getTokenBalance(vaultAddress);
    let tokenBalanceInFull = this.setup.helpers.web3util.fromWei(tokenBalance, "ether");
    this.setup.helpers.utils.toLog(logPre + "Tokens (Integral):   " + tokenBalanceInFull);

    let PRETokenBalanceInFull = this.setup.helpers.web3util.fromWei(PreTokens, "ether");
    this.setup.helpers.utils.toLog(logPre + "Tokens PRE:          " + PRETokenBalanceInFull);
    let ICOTokenBalanceInFull = this.setup.helpers.web3util.fromWei(IcoTokens, "ether");
    this.setup.helpers.utils.toLog(logPre + "Tokens ICO:          " + ICOTokenBalanceInFull);

    let MyTokenBalance = PreTokens.add(IcoTokens);
    let MyTokenBalanceInFull = this.setup.helpers.web3util.fromWei(MyTokenBalance, "ether");
    this.setup.helpers.utils.toLog(logPre + "Tokens ALL:          " + MyTokenBalanceInFull);

    let unsoldTokenBalance = await TokenSCADA.getUnsoldTokenAmount.call();
    let unsoldTokenBalanceInFull = this.setup.helpers.web3util.fromWei(unsoldTokenBalance, "ether");
    this.setup.helpers.utils.toLog(logPre + "Tokens Unsold:       " + unsoldTokenBalanceInFull);

    let myUnsoldTokenBalance = await TokenSCADA.getUnsoldTokenFraction.call( unsoldTokenBalance, tokenBalance );
    let myUnsoldTokenBalanceInFull = this.setup.helpers.web3util.fromWei(myUnsoldTokenBalance, "ether");
    this.setup.helpers.utils.toLog(logPre + "My Unsold Fraction:  " + myUnsoldTokenBalanceInFull);

};

TestBuildHelper.prototype.getTokenBalance = async function (address) {
    let TokenContract = await this.getTokenContract();
    return await TokenContract.balanceOf.call(address);
};

TestBuildHelper.prototype.insertPaymentsIntoFunding = async function (reach_soft_cap, howMany) {

    let FundingAsset = this.getDeployedByName("Funding");

    // funding inputs
    let FundingInputDirectAddress = await FundingAsset.DirectInput.call();
    let FundingInputMilestoneAddress = await FundingAsset.MilestoneInput.call();

    let FundingInputDirectContract = await this.setup.helpers.getContract('FundingInputDirect');
    let FundingInputMilestoneContract = await this.setup.helpers.getContract('FundingInputMilestone');

    let FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
    let FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);


    let paymentNum = 9;
    if (howMany > 0) {
        paymentNum = howMany;
    }

    let PaymentValue = 1 * this.setup.helpers.solidity.ether; // 100 wei  //0.01 * helpers.solidity.ether;

    if (reach_soft_cap) {
        let cap = this.setup.settings.bylaws["funding_global_soft_cap"];
        cap = cap.add( cap.div(10) );
        PaymentValue = new this.setup.helpers.BigNumber(cap).div(paymentNum);
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

    if (debug === true) {
        console.log("lastProcessedVaultId: ", lastProcessedVaultId.toString());
    }

    let processTx = await FundingManager.ProcessVaultList(processPerCall);
    result.push(processTx);
    if (debug === true) {

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
    if (vaultNum > lastProcessedVaultId) {
        let res = await this.FundingProcessAllVaults(debug);
        for (let i = 0; i < res.length; i++) {
            result.push(res[i]);
        }
    }
    return result;
};


TestBuildHelper.prototype.ValidateFundingState = async function (entity_start, entity_required, record_start, record_required) {

    let FundingAsset = this.getDeployedByName("Funding");

    let CurrentRecordState, RecordStateRequired, CurrentEntityState, EntityStateRequired;
    let States = await FundingAsset.getRequiredStateChanges.call();
    CurrentRecordState = States[0];
    RecordStateRequired = States[1];
    EntityStateRequired = States[2];
    CurrentEntityState = await FundingAsset.CurrentEntityState.call();


    if (CurrentEntityState.toString() !== entity_start) {
        return false;
    }
    else if (EntityStateRequired.toString() !== entity_required) {
        return false;
    }
    else if (CurrentRecordState.toString() !== record_start) {
        return false;
    }
    else if (RecordStateRequired.toString() !== record_required) {
        return false;
    }

    return true;
};


TestBuildHelper.prototype.ValidateAssetState = async function (assetName, entity_start, entity_required) {

    let Asset = this.getDeployedByName(assetName);

    let States = await Asset.getRequiredStateChanges.call();
    let CurrentEntityState = States[0];
    let RequiredEntityState = States[1];

    if (CurrentEntityState.toString() !== entity_start) {
        return false;
    }
    else if (RequiredEntityState.toString() !== entity_required) {
        return false;
    }

    return true;
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

    let raisedAmount = new this.setup.helpers.BigNumber(amount_raised.toString());                  // should be paymentValue
    let totalTokenSupply = new this.setup.helpers.BigNumber(tokenSupplyInSettings.toString());      // 5 mil integral tokens

    let tokensInStage = totalTokenSupply.mul(percentInSettings).div(100);

    let result = tokensInStage.mul(DirectPaymentValue).div(raisedAmount);
    if (result.toString() === "NaN") {
        result = new this.setup.helpers.BigNumber(0);
    }
    return result;
};


TestBuildHelper.prototype.AddAssetSettingsAndLock = async function (name) {
    let object = this.getDeployedByName(name);

    if (name === "TokenManager") {
        // add token settings
        let token_settings = this.setup.settings.token;

        await object.addTokenSettingsAndInit(
            token_settings.supply.toString(),
            token_settings.decimals,
            token_settings.name,
            token_settings.symbol,
            token_settings.version
        );

    } else if (name === "Funding") {
        // add funding phases

        for (let i = 0; i < this.setup.settings.funding_periods.length; i++) {
            await this.addFundingStage(i);
        }

        // add global funding settings like hard cap and such
        await this.addFundingSettings();

    } else if (name === "Milestones") {

        for (let i = 0; i < this.setup.settings.milestones.length; i++) {
            await this.addMilestoneRecord(i);
        }
    }

    // lock contract settings and apply them
    await object.applyAndLockSettings();
    return object;
};

TestBuildHelper.prototype.deploy = async function (name) {
    let object = await this.getContract("Test" + name);
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

