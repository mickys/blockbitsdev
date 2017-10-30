
function TestBuildHelper(setup, assert, accounts){
    this.setup = setup;
    this.assert = assert;
    this.accounts = accounts;
    this.deployed = [];
}

TestBuildHelper.prototype.deployAndInitializeAsset = async function (assetName, requiredAssets) {

    // deploy application
    let app = await this.deploy("ApplicationEntity");

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

TestBuildHelper.prototype.addFundingSettings = async function () {

};

TestBuildHelper.prototype.AddAssetSettingsAndLock = async function (name) {
    let object = this.getDeployedByName(name);
    if(name === "TokenManager") {
        // add token settings
        let token_settings = this.setup.settings.token;

        await object.addTokenSettingsAndInit(
            token_settings.supply,
            token_settings.decimals,
            token_settings.name,
            token_settings.symbol,
            token_settings.version
        );

    } else if(name === "Funding") {
        // add funding phases

        for(let i = 0; i < this.setup.funding_periods.length; i++) {
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

