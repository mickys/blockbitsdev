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

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            FundingContract = await TestBuildHelper.deployAndInitializeAsset( "Funding", ["TokenManager", "FundingManager", "Milestones"] );
            await TestBuildHelper.AddAssetSettingsAndLock("TokenManager");
            await TestBuildHelper.AddAssetSettingsAndLock("FundingManager");
            await TestBuildHelper.AddAssetSettingsAndLock("Milestones");
            // apply and lock settings in funding
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

        it('receivePayment() throws if caller is not funding asset', async () => {

            let FundingAddress = await FundingManager.getApplicationAssetAddressByName.call('Funding');
            assert.equal(FundingAddress, FundingContract.address, 'FundingAddress does not match.');

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            helpers.assertInvalidOpcode(async () => {
                tx = await FundingManager.receivePayment( investorWallet1, 1, {value: DirectPaymentValue, from: investorWallet1});
            });
        });

        context('FundingEndedProcessVaultList()', async () => {

            let paymentNum, accNum;
            beforeEach( async () => {

                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                tx = await FundingContract.doStateChanges(true);

                let PaymentValue = 1 * helpers.solidity.ether; // 100 wei  //0.01 * helpers.solidity.ether;
                paymentNum = 11;

                let acc_start = 10;
                let acc_end = 20;
                let acc = acc_start;
                accNum = acc_end - acc_start + 1;
                if(accNum > paymentNum) {
                    accNum = paymentNum;
                }

                for(let i = 0; i < paymentNum; i++) {
                    // console.log("Payment ["+i+"] from account["+acc+"]", accounts[acc]);
                    await FundingInputMilestone.sendTransaction({
                        value: PaymentValue,
                        from: accounts[acc] // starts at investorWallet1
                    });

                    acc++;
                    if(acc === acc_end+1) {
                        acc = acc_start;
                    }
                }


            });


            it('vaultNum has correct number of payments', async () => {
                let vaultNum = await FundingManager.vaultNum.call();
                assert.equal(vaultNum.toString(), accNum, "vaultNum should be "+accNum);
            });

            it('throws if Funding State is not "FUNDING_ENDED"', async () => {
                helpers.assertInvalidOpcode(async () => {
                    tx = await FundingManager.FundingEndedProcessVaultList(2);
                });
            });

            it('Funding State is "FUNDING_ENDED"', async () => {

                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                tx = await FundingContract.doStateChanges(true);

                // await helpers.utils.showCurrentState(helpers, FundingManager);
//                await TestBuildHelper.FundingManagerProcessVaults(0, true);
                await TestBuildHelper.FundingManagerProcessVaults(0, false);

                // let key = await FundingManager.getHash.call("FUNDING_FAILED_START", "");
                // let TaskValue = await FundingManager.taskByHash.call(key);
                // console.log("Task hashkey value => ", TaskValue);
            });

        });

        */

        /*

         Contract: Funding Asset - States
         ✓ starts with state as New and requires a change to WAITING if current time is before any funding stage (348ms)
         ✓ handles ENTITY state change from NEW to WAITING when funding does not start yet (734ms)
         ✓ handles ENTITY state change from NEW or WAITING to IN_PROGRESS when funding time start has passed (474ms)
         ✓ is in IN_PROGRESS, receives payments, pre_ico time passes, should Require change to COOLDOWN (685ms)
         ✓ handles ENTITY state change from IN_PROGRESS to COOLDOWN when funding period time start has passed (646ms)
         ✓ is in COOLDOWN, ico start time passes, should Require change to IN_PROGRESS (822ms)
         ✓ handles ENTITY state change from COOLDOWN to IN_PROGRESS when next funding period time start has passed (898ms)
         ✓ is IN_PROGRESS, ico end time passes, should Require change to FUNDING_ENDED (1048ms)
         handles ENTITY state change from IN_PROGRESS when last funding period time end has passed
         ✓ to FAILED when payments did not reach soft cap (1119ms)
         ✓ to SUCCESSFUL when payments reached soft cap (1104ms)
         handles ENTITY state change from IN_PROGRESS when Hard Cap is Reached
         ✓ to SUCCESSFUL when payments reached hard cap in first funding stage (pre-ico) (800ms)
         ✓ to SUCCESSFUL when payments reached hard cap in last funding stage (ico) (1017ms)
         misc for extra coverage
         ✓ isFundingStageUpdateAllowed returns false if not allowed (426ms)
         ✓ should run doStateChanges even if no changes are required (168ms)


        */

        context('states', async () => {

            let validation;
            beforeEach( async () => {

                // TestBuildHelper.insertPaymentsIntoFunding(false);
            });

            /*
            it("starts with state as New and requires a change to WAITING", async() => {
                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });

            it("handles ENTITY state change from NEW to WAITING", async() => {
                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
                tx = await FundingManager.doStateChanges(true);
                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });

            */


            /*
            it("handles ENTITY state change from NEW or WAITING to FUNDING_FAILED_START when funding state is FAILED ", async() => {

                // insert payments, but not enough to reach soft cap.
                await TestBuildHelper.insertPaymentsIntoFunding(false);
                // time travel to end of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                tx = await FundingContract.doStateChanges(true);

                // validate funding state
                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("FAILED").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'Funding State validation failed..');


                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

                // await helpers.utils.showCurrentState(helpers, FundingManager);

                tx = await FundingManager.doStateChanges(false);

                // await helpers.utils.showCurrentState(helpers, FundingManager);

                validation = await TestBuildHelper.ValidateAssetState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "FUNDING_FAILED_START").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

            });



            context('Funding has payments, but does not reach Soft Cap', async () => {

                let validation;
                beforeEach(async () => {

                    // insert payments, but not enough to reach soft cap.
                    await TestBuildHelper.insertPaymentsIntoFunding(false);
                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    tx = await FundingContract.doStateChanges(true);

                });

                it("handles ENTITY state change from FUNDING_FAILED_START to FUNDING_FAILED_PROGRESS", async () => {

                    // validate funding state
                    validation = await TestBuildHelper.ValidateFundingState(
                        helpers.utils.getFundingEntityStateIdByName("FAILED").toString(),
                        helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                        helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                        helpers.utils.getFundingStageStateIdByName("NONE").toString()
                    );
                    assert.isTrue(validation, 'Funding State validation failed..');


                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // funding manager state NEW to WAITING
                    // await helpers.utils.showCurrentState(helpers, FundingManager);
                    tx = await FundingManager.doStateChanges(false);

                    // funding manager state WAITING to FUNDING_FAILED_START
                    // await helpers.utils.showCurrentState(helpers, FundingManager);
                    tx = await FundingManager.doStateChanges(false);

                    // funding manager state FUNDING_FAILED_START to FUNDING_FAILED_PROGRESS
                    // await helpers.utils.showCurrentState(helpers, FundingManager);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "FUNDING_FAILED_PROGRESS").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "FUNDING_FAILED_PROGRESS").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                });

                it("handles ENTITY state change from FUNDING_FAILED_PROGRESS to FUNDING_FAILED_DONE, and processes all vaults", async () => {

                    // runs internal vault processor until all vaults are processed for current task
                    // once that happens the state is changed to TASK DONE
                    // this is the final state of the object in this case.
                    await TestBuildHelper.FundingManagerProcessVaults(0, false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "FUNDING_FAILED_DONE").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                });

            });
            */

            context('Funding has payments, and Soft Cap is reached', async () => {

                let validation;
                beforeEach(async () => {

                    // insert payments, over soft cap.
                    await TestBuildHelper.insertPaymentsIntoFunding(true);
                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    tx = await FundingContract.doStateChanges(true);

                });

                it("handles ENTITY state change from FUNDING_SUCCESSFUL_START to FUNDING_SUCCESSFUL_PROGRESS", async () => {

                    // validate funding state
                    validation = await TestBuildHelper.ValidateFundingState(
                        helpers.utils.getFundingEntityStateIdByName("SUCCESSFUL").toString(),
                        helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                        helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                        helpers.utils.getFundingStageStateIdByName("NONE").toString()
                    );
                    assert.isTrue(validation, 'Funding State validation failed..');


                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    // funding manager state NEW to WAITING
                    // await helpers.utils.showCurrentState(helpers, FundingManager);
                    tx = await FundingManager.doStateChanges(false);

                    // funding manager state WAITING to FUNDING_SUCCESSFUL_START
                    // await helpers.utils.showCurrentState(helpers, FundingManager);
                    tx = await FundingManager.doStateChanges(false);

                    // funding manager state FUNDING_SUCCESSFUL_START to FUNDING_SUCCESSFUL_PROGRESS
                    // await helpers.utils.showCurrentState(helpers, FundingManager);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "FUNDING_SUCCESSFUL_PROGRESS").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "FUNDING_SUCCESSFUL_PROGRESS").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                });

                it("handles ENTITY state change from FUNDING_SUCCESSFUL_PROGRESS to FUNDING_SUCCESSFUL_DONE, and processes all vaults", async () => {

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

                });

            });

        });

    });
};

