module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


    contract('Test Deploy One', accounts => {

        let app, assetContract, TestBuildHelper = {};
        let assetName = "Funding";

        beforeEach(async () => {

            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts);

            TestBuildHelper.deploy("Funding");

            /*
            assetContract = await TestBuildHelper.deployAndInitializeAsset( assetName, ["TokenManager", "Milestones"] );
            await TestBuildHelper.AddAssetSettingsAndLock("TokenManager");
            await TestBuildHelper.AddAssetSettingsAndLock("Milestones");
            */
        });

        it('runs', async () => {

        });

    });
};