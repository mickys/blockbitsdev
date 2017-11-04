module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


    contract('Funding Asset - States', accounts => {
        let app, assetContract, TestBuildHelper = {};
        let assetName = "Funding";

        // test wallets
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];
        let investorWallet6 = accounts[8];
        let investorWallet7 = accounts[9];

        // settings
        let platformWalletAddress = accounts[8];

        let FundingInputDirect, FundingInputMilestone, myFundingVault, tx, validation;

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            assetContract = await TestBuildHelper.deployAndInitializeAsset( assetName, ["TokenManager", "FundingManager", "Milestones"] );
            await TestBuildHelper.AddAssetSettingsAndLock("TokenManager");
            await TestBuildHelper.AddAssetSettingsAndLock("FundingManager");
            await TestBuildHelper.AddAssetSettingsAndLock("Milestones");
            // apply and lock settings in funding
            await TestBuildHelper.AddAssetSettingsAndLock(assetName);

            // funding inputs
            let FundingInputDirectAddress = await assetContract.DirectInput.call();
            let FundingInputMilestoneAddress = await assetContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);
        });


        it('starts with state as New and requires a change to WAITING if current time is before any funding stage', async () => {
            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("NEW").toString(),
                helpers.utils.getFundingEntityStateIdByName("WAITING").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        it('handles ENTITY state change from NEW to WAITING when funding does not start yet', async () => {
            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("NEW").toString(),
                helpers.utils.getFundingEntityStateIdByName("WAITING").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
            tx = await assetContract.doStateChanges(true);

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("WAITING").toString(),
                helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        it('handles ENTITY state change from NEW or WAITING to IN_PROGRESS when funding time start has passed', async () => {

            tx = await assetContract.setTestTimestamp( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);
            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        it('is in IN_PROGRESS, receives payments, pre_ico time passes, should Require change to COOLDOWN', async () => {

            tx = await assetContract.setTestTimestamp( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await assetContract.setTestTimestamp( pre_ico_settings.end_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("COOLDOWN").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("FINAL").toString()
            );
            assert.isTrue(validation, 'State validation failed..');

        });


        it('handles ENTITY state change from IN_PROGRESS to COOLDOWN when funding period time start has passed', async () => {

            tx = await assetContract.setTestTimestamp( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await assetContract.setTestTimestamp( pre_ico_settings.end_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("COOLDOWN").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("FINAL").toString()
            );
            assert.isTrue(validation, 'State validation failed..');

        });

        it('is in COOLDOWN, ico start time passes, should Require change to IN_PROGRESS', async () => {

            tx = await assetContract.setTestTimestamp( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await assetContract.setTestTimestamp( pre_ico_settings.end_time + 1 );
            tx = await assetContract.doStateChanges(true);


            tx = await assetContract.setTestTimestamp( ico_settings.start_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("COOLDOWN").toString(),
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });


        it('handles ENTITY state change from COOLDOWN to IN_PROGRESS when next funding period time start has passed', async () => {

            tx = await assetContract.setTestTimestamp( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await assetContract.setTestTimestamp( pre_ico_settings.end_time + 1 );
            tx = await assetContract.doStateChanges(true);

            tx = await assetContract.setTestTimestamp( ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );

            assert.isTrue(validation, 'State validation failed..');

        });


        it('is IN_PROGRESS, ico end time passes, should Require change to FUNDING_ENDED', async () => {

            tx = await assetContract.setTestTimestamp( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);

            let DirectPaymentValue = 0.01 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await assetContract.setTestTimestamp( pre_ico_settings.end_time + 1 );
            tx = await assetContract.doStateChanges(true);

            tx = await assetContract.setTestTimestamp( ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges(true);

            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await assetContract.setTestTimestamp( ico_settings.end_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("FUNDING_ENDED").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("FINAL").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        context('handles ENTITY state change from IN_PROGRESS when last funding period time end has passed', async () => {

            it('to FAILED when payments did not reach soft cap', async () => {

                tx = await assetContract.setTestTimestamp(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges(true);

                let DirectPaymentValue = 0.01 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

                tx = await assetContract.setTestTimestamp(pre_ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges(true);

                tx = await assetContract.setTestTimestamp(ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges(true);

                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

                tx = await assetContract.setTestTimestamp(ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges(false);

                // await helpers.utils.showDebugRequiredStateChanges(helpers, assetContract);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("FAILED").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });


            it('to SUCCESSFUL when payments reached soft cap', async () => {

                tx = await assetContract.setTestTimestamp(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges(true);

                let DirectPaymentValue = 5000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

                tx = await assetContract.setTestTimestamp(pre_ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges(true);

                tx = await assetContract.setTestTimestamp(ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges(true);

                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

                tx = await assetContract.setTestTimestamp(ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges(false);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("SUCCESSFUL").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });

        });

        context('handles ENTITY state change from IN_PROGRESS when Hard Cap is Reached', async () => {

            it('to SUCCESSFUL when payments reached hard cap in first funding stage (pre-ico)', async () => {
                tx = await assetContract.setTestTimestamp(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges(true);

                let DirectPaymentValue = 5000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

                DirectPaymentValue = 50000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet5});

                tx = await assetContract.doStateChanges(true);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("SUCCESSFUL").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });


            it('to SUCCESSFUL when payments reached hard cap in last funding stage (ico)', async () => {

                tx = await assetContract.setTestTimestamp(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges(true);

                let DirectPaymentValue = 5000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

                // not really required since we're going to end up there by using a recursive doStateChanges(true)
                tx = await assetContract.setTestTimestamp(pre_ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges(true);

                tx = await assetContract.setTestTimestamp(ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges(true);

                DirectPaymentValue = 50000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet6});

                // await helpers.utils.showDebugRequiredStateChanges(helpers, assetContract);

                tx = await assetContract.doStateChanges(true);
                // await helpers.utils.showGasUsage(helpers, tx);
                // await helpers.utils.showDebugRequiredStateChanges(helpers, assetContract);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("SUCCESSFUL").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });

        });


        // receive some payments and move to COOLDOWN by updating time to after pre_ico
        // receive payments over hard cap, should move to funding ended
    });
};

