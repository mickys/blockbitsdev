module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Milestones Asset', accounts => {
        let assetContract, tx, TestBuildHelper = {};
        let assetName = "Milestones";

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts);
            assetContract = await TestBuildHelper.deployAndInitializeAsset( assetName );
        });


        context("setInitialOwnerAndName()", async () => {
            let assetContract, assetName = {};
            beforeEach(async () => {
                assetName = assetContractNames[0];
                assetContract = await helpers.getContract("Test" + assetName).new();
            });


            it('throws if already owned', async () => {
                await assetContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.setInitialOwnerAndName(assetName);
                });
            });

        });

    });
};