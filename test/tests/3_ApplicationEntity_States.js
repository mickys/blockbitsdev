module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    contract('ApplicationEntity States', accounts => {
        let assetContract, tx, TestBuildHelper, ApplicationEntity, FundingContract = {};
        let assetName = "ApplicationEntity";

        let platformWalletAddress = accounts[19];

        beforeEach(async () => {

            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLock();
            assetContract = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            ApplicationEntity = assetContract;

            FundingContract = await TestBuildHelper.getDeployedByName("Funding");

            await TestBuildHelper.doApplicationStateChanges("Initialization", true);

            // funding inputs
            let FundingInputDirectAddress = await FundingContract.DirectInput.call();
            let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();
            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');
            let FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            let FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

            // time travel to pre ico start time
            tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);

            await TestBuildHelper.doApplicationStateChanges("After PRE ICO START", true);

            // tx = await FundingContract.doStateChanges(true);

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
            await TestBuildHelper.doApplicationStateChanges("After ICO START", true);

            // tx = await FundingContract.doStateChanges(true);

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

            console.log("BEFORE ICO END - PROCESSING START");

            // console.log( await helpers.utils.showAllStates(helpers, TestBuildHelper) );
            await TestBuildHelper.doApplicationStateChanges("Processing Vaults", true);


            tx = await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
            // await TestBuildHelper.showApplicationStates();

            await TestBuildHelper.doApplicationStateChanges("Development Start", true);


            // tx = await FundingContract.doStateChanges(true);

            // await TestBuildHelper.FundingManagerProcessVaults(false);

            // await TestBuildHelper.displayAllVaultDetails();


        });

        context("states", async () => {

            it('starts with state as New and requires a change to WAITING if current time is before any funding stage', async () => {

                // await helpers.utils.showApplicationRequiredStateChanges(helpers, ApplicationEntity);
                // await helpers.utils.showGeneralRequiredStateChanges(helpers, FundingContract);




                // tx = await ApplicationEntity.doStateChanges(false);
                // await helpers.utils.showApplicationRequiredStateChanges(helpers, assetContract);


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