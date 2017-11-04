
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


TestBuildHelper.prototype.FundingProcessToEndState = async function (test) {
    let FundingAsset = this.getDeployedByName("Funding");

    if(test === true) {
        // we use the mock test methods to force state
        let state = await FundingAsset.getEntityState.call("FUNDING_ENDED");
        await FundingAsset.setTestCurrentEntityState(state);
    } else {
        // follow required procedure to get to required state!
    }
    // run ticks and such till
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

