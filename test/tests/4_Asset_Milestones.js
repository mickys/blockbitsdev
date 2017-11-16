module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

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

        /*
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

        */

        context("states", async () => {
            beforeEach(async () => {
                await TestBuildHelper.AddAssetSettingsAndLock("Milestones");

                let FundingContract = await TestBuildHelper.getDeployedByName("Funding");

                // funding inputs
                let FundingInputDirectAddress = await FundingContract.DirectInput.call();
                let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();
                let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
                let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');
                FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
                FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

                // time travel to pre ico start time
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await FundingContract.doStateChanges(true);

                await FundingInputMilestone.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: accounts[10]
                });

                await FundingInputDirect.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: accounts[11]
                });

                // time travel to start of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                tx = await FundingContract.doStateChanges(true);

                await FundingInputDirect.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: accounts[10]
                });

                await FundingInputMilestone.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: accounts[11]
                });

                // time travel to end of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                tx = await FundingContract.doStateChanges(true);

                await TestBuildHelper.FundingManagerProcessVaults(false);

                // await TestBuildHelper.displayAllVaultDetails();

            });


            it('starts with state as New and requires a change to WAITING if current time is before any funding stage', async () => {

                await helpers.utils.showCurrentState(helpers, assetContract);

                /*
                validation = await TestBuildHelper.ValidateEntityAndRecordState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NEW").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
                */
            });

            /*
            it('handles ENTITY state change from NEW to WAITING when funding does not start yet', async () => {
                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getEntityStateNameById(assetName, "NEW").toString(),
                    helpers.utils.getEntityStateNameById(assetName, "WAITING").toString(),
                    helpers.utils.getRecordStateNameById(assetName, "NEW").toString(),
                    helpers.utils.getRecordStateNameById(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
                tx = await assetContract.doStateChanges(true);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getEntityStateNameById(assetName, "WAITING").toString(),
                    helpers.utils.getEntityStateNameById(assetName, "NONE").toString(),
                    helpers.utils.getRecordStateNameById(assetName, "NEW").toString(),
                    helpers.utils.getRecordStateNameById(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });
            */
        });

    });
};