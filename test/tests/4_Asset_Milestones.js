module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Milestones Asset', accounts => {
        let assetContract, tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, myFundingVault, validation = {};
        let assetName = "Milestones";

        let platformWalletAddress = accounts[19];


        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept("Milestones");

            // let's not lock Milestones yet. need to do tests on this baby
            // await TestBuildHelper.AddAssetSettingsAndLock("Milestones");
            assetContract = await TestBuildHelper.getDeployedByName("Milestones");
        });


        context("addRecord()", async () => {
            it('works if not already initialized', async () => {
                let rec = settings.milestones[0];
                await assetContract.addRecord(rec.name, rec.description, rec.duration, rec.funding_percentage);
                let recordNumAfter = await assetContract.RecordNum.call();
                assert.equal(1, recordNumAfter.toString(), "Record number does not match.");
            });

            it('throws if already initialized', async () => {

                await TestBuildHelper.AddAssetSettingsAndLock("Milestones");

                let rec = settings.milestones[0];
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addRecord(rec.name, rec.description, rec.duration, rec.funding_percentage);
                });
            });
        });





    });
};