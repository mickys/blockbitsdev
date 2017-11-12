module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


    contract('FundingManager Asset', accounts => {
        let app, assetContract, TestBuildHelper = {};
        let assetName = "FundingManager";

        // test wallets
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];
        let investorWallet6 = accounts[8];
        let investorWallet7 = accounts[9];
        let investorWallet8 = accounts[10];
        let investorWallet9 = accounts[11];
        let investorWallet10 = accounts[12];

        // settings
        let platformWalletAddress = accounts[8];

        let FundingInputDirect, FundingInputMilestone, tx, FundingManager, FundingContract;
        let validation;

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            FundingContract = await TestBuildHelper.deployAndInitializeAsset( "Funding", ["TokenManager", "FundingManager", "Milestones"] );
            await TestBuildHelper.AddAssetSettingsAndLock("TokenManager");
            await TestBuildHelper.AddAssetSettingsAndLock("FundingManager");
            await TestBuildHelper.AddAssetSettingsAndLock("Milestones");
            // apply and lock settings in funding last
            await TestBuildHelper.AddAssetSettingsAndLock("Funding");

            // funding inputs
            let FundingInputDirectAddress = await FundingContract.DirectInput.call();
            let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

            FundingManager = await TestBuildHelper.getDeployedByName("FundingManager");

        });

        /*

        it('Successful funding, soft cap reached in ico', async () => {

            // time travel to pre ico start time
            tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
            tx = await FundingContract.doStateChanges(true);

            // insert payments, under soft cap.
            await TestBuildHelper.insertPaymentsIntoFunding(false, 2);

            // time travel to start of ICO, and change states
            tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
            tx = await FundingContract.doStateChanges(true);

            // insert payments, over soft cap.
            await TestBuildHelper.insertPaymentsIntoFunding(true, 2);
            // time travel to end of ICO, and change states
            tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
            tx = await FundingContract.doStateChanges(true);

            // runs internal vault processor until all vaults are processed for current task
            // once that happens the state is changed to TASK DONE
            // this will require a new state change to WAITING
            await TestBuildHelper.FundingManagerProcessVaults(0, false);

            validation = await TestBuildHelper.ValidateAssetState(
                assetName,
                helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');

            await TestBuildHelper.displayAllVaultDetails();

        });

        it('Successful funding, soft cap reached in pre-ico', async () => {

                // time travel to pre ico start time
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await FundingContract.doStateChanges(true);

                // insert payments, under soft cap.
                await TestBuildHelper.insertPaymentsIntoFunding(true, 2);

                // time travel to start of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                tx = await FundingContract.doStateChanges(true);

                // insert payments, over soft cap.
                await TestBuildHelper.insertPaymentsIntoFunding(false, 2);
                // time travel to end of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                tx = await FundingContract.doStateChanges(true);

                // runs internal vault processor until all vaults are processed for current task
                // once that happens the state is changed to TASK DONE
                // this will require a new state change to WAITING
                await TestBuildHelper.FundingManagerProcessVaults(0, false);

                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

                await TestBuildHelper.displayAllVaultDetails();

        });

        */

        it('Successful funding, soft cap reached in pre-ico', async () => {

            // time travel to pre ico start time
            tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
            tx = await FundingContract.doStateChanges(true);

            // insert payments, under soft cap.
            await TestBuildHelper.insertPaymentsIntoFunding(true, 3);

            // time travel to start of ICO, and change states
            tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
            tx = await FundingContract.doStateChanges(true);

            // insert payments, over soft cap.
            await TestBuildHelper.insertPaymentsIntoFunding(false, 3);
            // time travel to end of ICO, and change states
            tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
            tx = await FundingContract.doStateChanges(true);

            // runs internal vault processor until all vaults are processed for current task
            // once that happens the state is changed to TASK DONE
            // this will require a new state change to WAITING
            await TestBuildHelper.FundingManagerProcessVaults(0, true);

            validation = await TestBuildHelper.ValidateAssetState(
                assetName,
                helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');

            await TestBuildHelper.displayAllVaultDetails();

        });


        /*

        it('Successful funding, soft cap reached in ico', async () => {

                // time travel to pre ico start time
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await FundingContract.doStateChanges(true);

                // insert payments, under soft cap.
                await TestBuildHelper.insertPaymentsIntoFunding(true, 1);

                // time travel to start of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                tx = await FundingContract.doStateChanges(true);

                // insert payments, over soft cap.
                await TestBuildHelper.insertPaymentsIntoFunding(false, 2);
                // time travel to end of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                tx = await FundingContract.doStateChanges(true);


                // runs internal vault processor until all vaults are processed for current task
                // once that happens the state is changed to TASK DONE
                // this will require a new state change to WAITING
                await TestBuildHelper.FundingManagerProcessVaults(0, false);

                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
                await TestBuildHelper.displayAllVaultDetails();
        });
        */
    });
};

