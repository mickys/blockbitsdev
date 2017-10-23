module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;


    contract('Funding Asset', accounts => {
        let app, assetContract = {};
        let assetName = "Funding";

        // solidity calc helpers
        let ether = 1000000000000000000;
        let days = 3600 * 24;
        let now = parseInt(( Date.now() / 1000 ).toFixed());

        // settings
        let pre_ico_duration = 7 * days;
        let pre_ico_start = now + 10 * days;
        let pre_ico_end = pre_ico_start + pre_ico_duration;

        let pre_ico_settings = {
            name: "PRE ICO",                        //  bytes32 _name,
            description: "PRE ICO Funding Phase",   //  bytes32 _description,
            start_time: pre_ico_start,              //  uint256 _time_start,
            end_time: pre_ico_end,                  //  uint256 _time_end,
            amount_cap_soft: 10 * ether,            //  uint256 _amount_cap_soft,
            amount_cap_hard: 30 * ether,            //  uint256 _amount_cap_hard,
            methods: 3,                             //  uint8   _methods, 3 = DIRECT_AND_MILESTONE
            minimum_entry: 1,                       //  uint256 _minimum_entry,
            start_parity: 0,                        //  uint256 _start_parity,
            use_parity_from_previous: false,        //  bool
            token_share_percentage: 10,             //  uint8
        };

        let ico_duration = 30 * days;
        let ico_start = pre_ico_end + 7 * days;
        let ico_end = ico_start + ico_duration;

        let ico_settings = {
            name: "ICO",
            description: "ICO Funding Phase",
            start_time: ico_start,
            end_time: ico_end,
            amount_cap_soft: 190 * ether,
            amount_cap_hard: 570 * ether,
            methods: 3,
            minimum_entry: 0,
            start_parity: 0,
            use_parity_from_previous: true,
            token_share_percentage: 40,
        };

        beforeEach(async () => {
            now = Date.now() / 1000;
            assetContract = await helpers.getContract("Test" + assetName).new();
        });

        it('deploys with no Funding Stages', async () => {
            assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum should be 0!');
        });

        context("first funding stage", async () => {

            it('successfully creates a funding stage with proper settings', async () => {
                let tx = await assetContract.addFundingStage(
                    pre_ico_settings.name,
                    pre_ico_settings.description,
                    pre_ico_settings.start_time,
                    pre_ico_settings.end_time,
                    pre_ico_settings.amount_cap_soft,
                    pre_ico_settings.amount_cap_hard,
                    pre_ico_settings.methods,
                    pre_ico_settings.minimum_entry,
                    pre_ico_settings.start_parity,
                    pre_ico_settings.use_parity_from_previous,
                    pre_ico_settings.token_share_percentage
                );
                assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 0!');
            });

            it('throws if end time is before or equal to start time', async () => {
                helpers.assertInvalidOpcode(async () => {
                    await assetContract.addFundingStage(
                        pre_ico_settings.name,
                        pre_ico_settings.description,
                        pre_ico_settings.start_time,
                        pre_ico_settings.start_time - 1,   // << this
                        pre_ico_settings.amount_cap_soft,
                        pre_ico_settings.amount_cap_hard,
                        pre_ico_settings.methods,
                        pre_ico_settings.minimum_entry,
                        pre_ico_settings.start_parity,
                        pre_ico_settings.use_parity_from_previous,
                        pre_ico_settings.token_share_percentage
                    );
                });
                assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
            });

            it('throws if soft cap is higher than hard cap', async () => {
                helpers.assertInvalidOpcode(async () => {
                    await assetContract.addFundingStage(
                        pre_ico_settings.name,
                        pre_ico_settings.description,
                        pre_ico_settings.start_time,
                        pre_ico_settings.end_time,
                        101,   // << this
                        100,
                        pre_ico_settings.methods,
                        pre_ico_settings.minimum_entry,
                        pre_ico_settings.start_parity,
                        pre_ico_settings.use_parity_from_previous,
                        pre_ico_settings.token_share_percentage
                    );
                });
                assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
            });

            it('throws if token selling percentage is higher than 100%', async () => {
                helpers.assertInvalidOpcode(async () => {
                    await assetContract.addFundingStage(
                        pre_ico_settings.name,
                        pre_ico_settings.description,
                        pre_ico_settings.start_time,
                        pre_ico_settings.end_time,
                        pre_ico_settings.amount_cap_soft,
                        pre_ico_settings.amount_cap_hard,
                        pre_ico_settings.methods,
                        pre_ico_settings.minimum_entry,
                        pre_ico_settings.start_parity,
                        pre_ico_settings.use_parity_from_previous,
                        101   // << this
                    );
                });
                assert.equal(await assetContract.FundingStageNum.call(), 0, 'FundingStageNum is not 0!');
            });

            context("when at least 1 funding stage already exists", async () => {

                beforeEach(async () => {
                    let stage_pre = await assetContract.addFundingStage(
                        pre_ico_settings.name,
                        pre_ico_settings.description,
                        pre_ico_settings.start_time,
                        pre_ico_settings.end_time,
                        pre_ico_settings.amount_cap_soft,
                        pre_ico_settings.amount_cap_hard,
                        pre_ico_settings.methods,
                        pre_ico_settings.minimum_entry,
                        pre_ico_settings.start_parity,
                        pre_ico_settings.use_parity_from_previous,
                        pre_ico_settings.token_share_percentage
                    );
                });

                it('successfully creates the second funding stage with proper settings', async () => {
                    let stage_ico = await assetContract.addFundingStage(
                        ico_settings.name,
                        ico_settings.description,
                        ico_settings.start_time,
                        ico_settings.end_time,
                        ico_settings.amount_cap_soft,
                        ico_settings.amount_cap_hard,
                        ico_settings.methods,
                        ico_settings.minimum_entry,
                        ico_settings.start_parity,
                        ico_settings.use_parity_from_previous,
                        ico_settings.token_share_percentage
                    );
                    assert.equal(await assetContract.FundingStageNum.call(), 2, 'FundingStageNum is not 0!');
                });

                it('throws if new funding stage start time overlaps existing stage', async () => {
                    helpers.assertInvalidOpcode(async () => {
                        await assetContract.addFundingStage(
                            ico_settings.name,
                            ico_settings.description,
                            pre_ico_settings.end_time - 1,
                            ico_settings.end_time,
                            ico_settings.amount_cap_soft,
                            ico_settings.amount_cap_hard,
                            ico_settings.methods,
                            ico_settings.minimum_entry,
                            ico_settings.start_parity,
                            ico_settings.use_parity_from_previous,
                            ico_settings.token_share_percentage
                        );
                    });
                    assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 0!');
                });

                it('throws if new funding stage + existing stage sell more than 100% of tokens', async () => {

                    helpers.assertInvalidOpcode(async () => {
                        await assetContract.addFundingStage(
                            ico_settings.name,
                            ico_settings.description,
                            ico_settings.start_time,
                            ico_settings.end_time,
                            ico_settings.amount_cap_soft,
                            ico_settings.amount_cap_hard,
                            ico_settings.methods,
                            ico_settings.minimum_entry,
                            ico_settings.start_parity,
                            ico_settings.use_parity_from_previous,
                            100
                        );
                    });
                    assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 0!');
                });
            });
        });


        context("funding stages added, asset initialized", async () => {
            let tx;
            beforeEach(async () => {
                // app = await contracts.ApplicationEntity.new();

                let stage_pre = await assetContract.addFundingStage(
                    pre_ico_settings.name,
                    pre_ico_settings.description,
                    pre_ico_settings.start_time,
                    pre_ico_settings.end_time,
                    pre_ico_settings.amount_cap_soft,
                    pre_ico_settings.amount_cap_hard,
                    pre_ico_settings.methods,
                    pre_ico_settings.minimum_entry,
                    pre_ico_settings.start_parity,
                    pre_ico_settings.use_parity_from_previous,
                    pre_ico_settings.token_share_percentage
                );

                let stage_ico = await assetContract.addFundingStage(
                    ico_settings.name,
                    ico_settings.description,
                    ico_settings.start_time,
                    ico_settings.end_time,
                    ico_settings.amount_cap_soft,
                    ico_settings.amount_cap_hard,
                    ico_settings.methods,
                    ico_settings.minimum_entry,
                    ico_settings.start_parity,
                    ico_settings.use_parity_from_previous,
                    ico_settings.token_share_percentage
                );

                // grab ownership of the asset so we can do tests
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.setInitialOwnerAndName(assetName),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );

                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
                assert.equal(await assetContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]');
                assert.isTrue(await assetContract._initialized.call(), 'Asset not initialized');

            });






            /*


             enum FundingEntityStates {
             __IGNORED__,
             NEW,
             WAITING,
             IN_PROGRESS,
             COOLDOWN,
             ALL_FUNDING_PERIODS_PROCESSED,
             SUCCESSFUL,
             FAILED,
             CASHBACK_IN_PROGRESS,
             CASHBACK_COMPLETE,
             FINAL
             }

             */

            /*
            context("handles direct state change from NEW", async () => {
                let tx;

                it('changes state to FundingEntityStates.WAITING if current time is before any funding stage', async () => {
                    tx = await assetContract.setTestTimestamp( pre_ico_start - 1 );
                    tx = await assetContract.doStateChanges(true);
                    let CurrentEntityState = await assetContract.CurrentEntityState.call();
                    assert.equal(
                        CurrentEntityState,
                        getFundingEntityStateIdByName("WAITING"),
                        'CurrentEntityState not FundingEntityStates.WAITING.'
                    );
                });

                it('changes state to FundingEntityStates.IN_PROGRESS if current time is after current stage start_time', async () => {
                    tx = await assetContract.setTestTimestamp( pre_ico_start + 1 );
                    tx = await assetContract.doStateChanges(true);
                    let CurrentEntityState = await assetContract.CurrentEntityState.call();
                    assert.equal(
                        CurrentEntityState,
                        getFundingEntityStateIdByName("IN_PROGRESS"),
                        'CurrentEntityState not FundingEntityStates.IN_PROGRESS.'
                    );
                });

                it('changes state to FundingEntityStates.COOLDOWN if current time is after current stage end_time and we have at least 1 stage left', async () => {

                    let stageId = helpers.web3util.toDecimal(  await assetContract.currentFundingStage.call() );
                    let FundingStageNum = await assetContract.FundingStageNum.call();

                    tx = await assetContract.setTestTimestamp( pre_ico_end + 1 );
                    tx = await assetContract.doStateChanges(true);

                    let CurrentEntityState = await assetContract.CurrentEntityState.call();

                    assert.isBelow(
                        stageId,
                        FundingStageNum,
                        'current stageId is not lower than FundingStageNum.'
                    );

                    assert.equal(
                        CurrentEntityState,
                        getFundingEntityStateIdByName("COOLDOWN"),
                        'CurrentEntityState not FundingEntityStates.COOLDOWN.'
                    );

                });

                context("time is after ico end", async () => {

                    beforeEach(async () => {
                        tx = await assetContract.setTestTimestamp( ico_end + 1 );
                    });

                    it('changes state to FundingEntityStates.ALL_FUNDING_PERIODS_PROCESSED if current time is after all stage end_time', async () => {

                        let stageId = helpers.web3util.toDecimal(  await assetContract.currentFundingStage.call() );
                        let FundingStageNum = await assetContract.FundingStageNum.call();

                        tx = await assetContract.setTestTimestamp( ico_end + 1 );
                        // tx = await assetContract.doStateChanges(true);
                        await runStateChanger(helpers, assetContract);

                        let CurrentEntityState = await assetContract.CurrentEntityState.call();
                        assert.isBelow(
                            stageId,
                            FundingStageNum,
                            'current stageId is not lower than FundingStageNum.'
                        );

                        assert.equal(
                            CurrentEntityState,
                            getFundingEntityStateIdByName("ALL_FUNDING_PERIODS_PROCESSED"),
                            'CurrentEntityState not FundingEntityStates.ALL_FUNDING_PERIODS_PROCESSED.'
                        );

                    });


                });

            });

            */


            /*
            it('test one by one', async () => {

                // await showCurrentState(helpers, assetContract);
                // await showDebugSettings(helpers, assetContract);
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Bumping current Time to funding start ..." );
                let tx = await assetContract.setTestTimestamp( pre_ico_start );

                // await showDebugSettings(helpers, assetContract);
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running nextStepCycle ..." );
                tx = await assetContract.nextStepCycle();
                //await showGasUsage(helpers,tx);

                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);


                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Bumping current Time to after pre ico end ..." );
                let tx2 = await assetContract.setTestTimestamp( pre_ico_end + 1 );

                // await showDebugSettings(helpers, assetContract);
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);
                // await showDebugFundingStages(helpers, assetContract);

                // tx = await assetContract.saveRequiredStateChanges();
                //

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running nextStepCycle ..." );
                tx = await assetContract.nextStepCycle();
                //await showGasUsage(helpers,tx);

                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Bumping current Time to ico start ..." );
                tx = await assetContract.setTestTimestamp( ico_start );
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running nextStepCycle ..." );
                tx = await assetContract.nextStepCycle();
                //await showGasUsage(helpers,tx);
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);



            });

            */
            /*
            it('test jump to future', async () => {


                let tx ;

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Bumping current Time to pre_ico_start ..." );
                tx = await assetContract.setTestTimestamp( pre_ico_start );

                await showDebugRequiredStateChanges(helpers, assetContract);

                await runStateChanger(helpers, assetContract);

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "insertPayment( 10 ether ) ..." );
                tx = await assetContract.insertPayment( 10 * ether );

                await runStateChanger(helpers, assetContract);
                await showCurrentSettings(helpers, assetContract);


                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "insertPayment( 20 ether ) ..." );
                tx = await assetContract.insertPayment( 19 * ether );
                await showDebugRequiredStateChanges(helpers, assetContract);
                await showCurrentSettings(helpers, assetContract);

                */

                // await runStateChanger(helpers, assetContract);


                // tx = await assetContract.setTestCurrentFundingStageState( 3 );
                // tx = await assetContract.setTestCurrentEntityState( 4 );

                // tx = await assetContract.currentFundingStage.call();
                // console.log(tx);

                // await showDebugRequiredStateChanges(helpers, assetContract);
                // await showGasUsage(helpers,tx);





                // await showCurrentState(helpers, assetContract);
                // await showDebugSettings(helpers, assetContract);
                // await showDebugFundingStageStateRequiredChanges(helpers, assetContract);


                // await assetContract.getRequiredStateChanges.call();
                /*

                // await showDebugSettings(helpers, assetContract);
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running nextStepCycle..." );
                tx = await assetContract.nextStepCycle();

                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);



                // await showDebugSettings(helpers, assetContract);
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);
                // await showDebugFundingStages(helpers, assetContract);

                // tx = await assetContract.saveRequiredStateChanges();
                //

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running nextStepCycle..." );
                tx = await assetContract.nextStepCycle();

                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);

                */

                /*
                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Bumping current Time to after ico end ..." );
                let tx = await assetContract.setTestTimestamp( ico_end );
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);

                helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running nextStepCycle ..." );
                tx = await assetContract.nextStepCycle();
                await showGasUsage(helpers,tx);
                await showDebugFundingStageStateRequiredChanges(helpers, assetContract);
                await showDebugFundingStages(helpers, assetContract);

            });

            */

        });




        /*


         /*
         let eventFilter = await helpers.utils.hasEvent(
         tx,
         'FundingStageCreated(uint8,bytes32)'
         );


         let fundingStageIndex = helpers.web3util.toDecimal( eventFilter[0].topics[1] );
         let fundingStageName = helpers.web3util.toAscii( eventFilter[0].topics[2] );

         helpers.utils.toLog("Funding Stage Index: "  + fundingStageIndex);
         helpers.utils.toLog("Funding Stage Name:  "  + fundingStageName);
         */


        // await showDebug(helpers, assetContract);
        // await showDebugFundingStages(helpers, assetContract);

        /*
         context("addSettings()", async () => {
         beforeEach(async () => {

         });

         it('sets correct properties', async () => {

         await assetContract.addSettings(
         AmountCapSoft,
         AmountCapHard,
         Funding_Setting_funding_time_start,
         Funding_Setting_pre_ico_duration,
         Funding_Setting_pre_ico_cooldown_duration,
         Funding_Setting_ico_duration,
         Funding_Setting_cashback_duration
         );

         assert.equal(await assetContract.AmountCapSoft.call(), AmountCapSoft, 'AmountCapSoft different');
         assert.equal(await assetContract.AmountCapHard.call(), AmountCapHard, 'AmountCapHard different');
         assert.equal(
         await assetContract.Funding_Setting_funding_time_start.call(),
         Funding_Setting_funding_time_start,
         'Funding_Setting_funding_time_start different'
         );
         assert.equal(
         await assetContract.Funding_Setting_pre_ico_duration.call(),
         Funding_Setting_pre_ico_duration,
         'Funding_Setting_pre_ico_duration different'
         );
         assert.equal(
         await assetContract.Funding_Setting_pre_ico_cooldown_duration.call(),
         Funding_Setting_pre_ico_cooldown_duration,
         'Funding_Setting_pre_ico_cooldown_duration different'
         );
         assert.equal(
         await assetContract.Funding_Setting_ico_duration.call(),
         Funding_Setting_ico_duration,
         'Funding_Setting_ico_duration different'
         );
         assert.equal(
         await assetContract.Funding_Setting_cashback_duration.call(),
         Funding_Setting_cashback_duration,
         'Funding_Setting_cashback_duration different'
         );

         // await showDebug(helpers, assetContract);

         });

         });
         */

        /*
         it('initializes properly', async () => {
         await assetContract.setInitialOwnerAndName(assetName);


         return helpers.assertInvalidOpcode(async () => {
         await assetContract.setInitialOwnerAndName(assetName);
         });
         });

         it('throws if already owned', async () => {
         await assetContract.setInitialOwnerAndName(assetName);
         return helpers.assertInvalidOpcode(async () => {
         await assetContract.setInitialOwnerAndName(assetName);
         });
         });
         */


        /*
         context("setInitialOwnerAndName()", async () => {
         beforeEach(async () => {

         });

         it('works if linking an asset for the first time', async () => {
         let eventFilter = helpers.utils.hasEvent(
         await assetContract.setInitialOwnerAndName(assetName),
         'EventAppAssetOwnerSet(bytes32,address)'
         );
         assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
         assert.equal(await assetContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]')
         });


         });

         */
    });
};

let FundingStageStates = [
    { key: 0,  name: "NONE"},
    { key: 1,  name: "NEW"}, 				// not started
    { key: 2,  name: "IN_PROGRESS"}, 		// accepts payments
    { key: 3,  name: "FINAL"}				// ended
];

function getFundingStageStateNameById(_id) {
    return FundingStageStates.filter(x => x.key === _id)[0].name;
}

function getFundingStageStateIdByName(_name) {
    return FundingStageStates.filter(x => x.name === _name)[0].key;
}

let FundingEntityStates = [
    { key: 0,  name: "NONE"},
    { key: 1,  name: "NEW"},
    { key: 2,  name: "WAITING"},
    { key: 3,  name: "IN_PROGRESS"},
    { key: 4,  name: "COOLDOWN"},
    { key: 5,  name: "ALL_FUNDING_PERIODS_PROCESSED"},
    { key: 6,  name: "SUCCESSFUL"},
    { key: 7,  name: "FAILED"},
    { key: 8,  name: "CASHBACK_IN_PROGRESS"},
    { key: 9,  name: "CASHBACK_COMPLETE"},
    { key: 10, name: "FINAL"}
];

function getFundingEntityStateNameById(_id) {
    return FundingEntityStates.filter(x => x.key === _id)[0].name;
}

function getFundingEntityStateIdByName(_name) {
    return FundingEntityStates.filter(x => x.name === _name)[0].key;
}

let FundingMethodIds = [
    "NONE",
    "DIRECT_ONLY",
    "MILESTONE_ONLY",
    "DIRECT_AND_MILESTONE"
];



let logPre = "      ";

function showGasUsage(helpers, tx) {
    helpers.utils.toLog("\n" + logPre + " GAS USAGE: " +
        helpers.utils.colors.purple +
        tx.receipt.cumulativeGasUsed
    );
}

async function showCurrentState(helpers, assetContract) {
    await showDebugSettings(helpers, assetContract);
    await showDebugFundingStages(helpers, assetContract);
    await showDebugFundingStageStateRequiredChanges(helpers, assetContract);
}

async function runStateChanger(helpers, assetContract) {

    let hasChanges = await assetContract.hasStateChanges.call();
    if (hasChanges === true) {

        helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running doStateChanges ...");
        tx = await assetContract.doStateChanges(true);

        for (let log of tx.logs) {
            if (log.event === "DebugRecordRequiredChanges") {
                console.log(logPre + " Record C: " + getFundingStageStateNameById(helpers.web3util.toDecimal(log.args._current)));
                console.log(logPre + " Record R: " + getFundingStageStateNameById(helpers.web3util.toDecimal(log.args._required)));
            } else if (log.event === "DebugEntityRequiredChanges") {
                console.log(logPre + " Entity C: " + getFundingEntityStateNameById(helpers.web3util.toDecimal(log.args._current)));
                console.log(logPre + " Entity R: " + getFundingEntityStateNameById(helpers.web3util.toDecimal(log.args._required)));
            } else if (log.event === "DebugCallAgain") {
                let whoAr = [0, "Entity", "Record"];
                let who = helpers.web3util.toDecimal(log.args._who);
                console.log(logPre + " DebugCallAgain: " + whoAr[who]);
            } else if (log.event === "EventEntityProcessor") {
                console.log(logPre + " EventEntityProcessor: state:" + getFundingEntityStateNameById(helpers.web3util.toDecimal(log.args._state)) );
            }

        }

        await showGasUsage(helpers, tx);
        await showDebugRequiredStateChanges(helpers, assetContract);
    }
}

async function showDebugRequiredStateChanges(helpers, assetContract) {

    helpers.utils.toLog("\n" + logPre + " Debug - Required State Changes: ");
    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );

    let contractTimeStamp = await assetContract.getTimestamp.call();
    helpers.utils.toLog(
        logPre + "Contract Time and Date:  " + helpers.utils.toDate(contractTimeStamp)
    );

    let reqChanges = await assetContract.getRequiredStateChanges.call();

    let CurrentFundingStageState = getFundingStageStateNameById(helpers.web3util.toDecimal(reqChanges[0]));
    let FundingStageStateRequired = getFundingStageStateNameById(helpers.web3util.toDecimal(reqChanges[1]));
    let EntityStateRequired = getFundingEntityStateNameById(helpers.web3util.toDecimal(reqChanges[2]));


    let CurrentEntityStateReq =  await assetContract.CurrentEntityState.call();
    let CurrentEntityState = helpers.web3util.toDecimal(CurrentEntityStateReq);


    let stageId = helpers.web3util.toDecimal( await assetContract.currentFundingStage.call() );

    helpers.utils.toLog(
        logPre + "Current stage id:        " + stageId
    );

    helpers.utils.toLog(
        logPre + "Received RECORD state:   " +
        helpers.utils.colors.green +
        "["+reqChanges[0]+"] "+
        CurrentFundingStageState
    );

    let color = helpers.utils.colors.red;

    let stateChangeInt = helpers.web3util.toDecimal(reqChanges[1]);
    if(stateChangeInt == 0) {
        color = helpers.utils.colors.green;
    }

    helpers.utils.toLog(
        logPre + "Required RECORD change:  " +
        color +
        "["+stateChangeInt+"] "+
        FundingStageStateRequired
    );

    color = helpers.utils.colors.red;


    helpers.utils.toLog(
        logPre + "Current ENTITY:          " +
        helpers.utils.colors.green +
        "["+CurrentEntityState+"] "+
        getFundingEntityStateNameById(CurrentEntityState)
    );

    if(reqChanges[2] == 0 ) {
        color = helpers.utils.colors.green;
    }
    helpers.utils.toLog(
        logPre + "Required ENTITY change:  " +
        color +
        "["+reqChanges[2]+"] "+
        EntityStateRequired
    );

    // FundingStageStates

    // let FundingStage = await assetContract.Collection.call(stageId);
    // displayFundingStageStruct(helpers, FundingStage);


    helpers.utils.toLog("");
}

async function showDebugFundingStageStateRequiredChanges(helpers, assetContract) {

    helpers.utils.toLog("\n" + logPre + " Debug - FundingStage Required State Changes: ");
    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );

    let contractTimeStamp = await assetContract.getTimestamp.call();
    helpers.utils.toLog(
        logPre + "Contract Time and Date: " + helpers.utils.toDate(contractTimeStamp)
    );

    let stageId = helpers.web3util.toDecimal( await assetContract.currentFundingStage.call() );

    helpers.utils.toLog(
        logPre + "Current stage id:      " + stageId
    );

    let FundingStage = await assetContract.Collection.call(stageId);
    helpers.utils.toLog(
        logPre + "Current state:          " +
        helpers.utils.colors.green +
        getFundingStageStateNameById(helpers.web3util.toDecimal(FundingStage[2]))
    );

    let stateChanges = await assetContract.getFundingStageStateRequiredChanges.call();

    let stateChangeInt = helpers.web3util.toDecimal(stateChanges);
    if(stateChangeInt !== 0) {
        helpers.utils.toLog(
            logPre + "Required state change:  " +
            helpers.utils.colors.red +
            getFundingStageStateNameById(stateChangeInt)
        );
    } else {
        helpers.utils.toLog(
            logPre + "Required state change:  " +
            helpers.utils.colors.green +
            getFundingStageStateNameById(stateChangeInt)
        );
    }

    // FundingStageStates

    // let FundingStage = await assetContract.Collection.call(stageId);
    // displayFundingStageStruct(helpers, FundingStage);


    helpers.utils.toLog("");
}

async function showCurrentSettings(helpers, assetContract) {

    helpers.utils.toLog("\n" + logPre + " Debug - Current Settings: ");
    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );

    let AmountRaised = await assetContract.AmountRaised.call();
    let AmountCapSoft = await assetContract.AmountCapSoft.call();
    let AmountCapHard = await assetContract.AmountCapHard.call();
    helpers.utils.toLog(logPre + "AmountRaised ether:  " + helpers.web3util.fromWei(AmountRaised, "ether"));
    helpers.utils.toLog(logPre + "AmountCapSoft ether: " + helpers.web3util.fromWei(AmountCapSoft, "ether"));
    helpers.utils.toLog(logPre + "AmountCapHard ether: " + helpers.web3util.fromWei(AmountCapHard, "ether"));

    let stageId = helpers.web3util.toDecimal( await assetContract.currentFundingStage.call() );

    helpers.utils.toLog(
        logPre +
        "Current STAGE id:    " + stageId
    );

    let FundingStage = await assetContract.Collection.call(stageId);

    helpers.utils.toLog(
        logPre +
        "time_start:          " +
        helpers.utils.toDateFromHex(FundingStage[3])
    );

    helpers.utils.toLog(
        logPre +
        "time_end:            " +
        helpers.utils.toDateFromHex(FundingStage[4])
    );

    helpers.utils.toLog(
        logPre +
        "amount_cap_soft:     " +
        helpers.web3util.fromWei(FundingStage[5], "ether")
    );
    helpers.utils.toLog(
        logPre +
        "amount_cap_hard:     " +
        helpers.web3util.fromWei(FundingStage[6], "ether")
    );


    let Contract_current_timestamp = await assetContract.getTimestamp.call();

    helpers.utils.toLog(
        logPre +
        "CURRENT DATE:        " +
        helpers.utils.toDate(Contract_current_timestamp)
    );

}

async function showDebugSettings(helpers, assetContract) {

    helpers.utils.toLog("\n" + logPre + " Debug - Settings: ");
    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );
    let AmountRaised = await assetContract.AmountRaised.call();
    let AmountCapSoft = await assetContract.AmountCapSoft.call();
    let AmountCapHard = await assetContract.AmountCapHard.call();
    let TokenSellPercentage = await assetContract.TokenSellPercentage.call();

    let Contract_current_timestamp = await assetContract.getTimestamp.call();
    let Funding_Setting_funding_time_start = await assetContract.Funding_Setting_funding_time_start.call();
    let Funding_Setting_funding_time_end = await assetContract.Funding_Setting_funding_time_end.call();
    let Funding_Setting_cashback_time_start = await assetContract.Funding_Setting_cashback_time_start.call();
    let Funding_Setting_cashback_time_end = await assetContract.Funding_Setting_cashback_time_end.call();

    helpers.utils.toLog(logPre + "AmountRaised ether:    " + helpers.web3util.fromWei(AmountRaised, "ether"));
    helpers.utils.toLog(logPre + "AmountCapSoft ether:   " + helpers.web3util.fromWei(AmountCapSoft, "ether"));
    helpers.utils.toLog(logPre + "AmountCapHard ether:   " + helpers.web3util.fromWei(AmountCapHard, "ether"));
    helpers.utils.toLog(logPre + "TokenSellPercentage %: " + helpers.web3util.toDecimal(TokenSellPercentage));


    helpers.utils.toLog(
        logPre + "CURRENT DATE:        " + helpers.utils.toDate(Contract_current_timestamp)
    );
    helpers.utils.toLog(
        logPre + "Funding Start DATE:  " + helpers.utils.toDate(Funding_Setting_funding_time_start)
    );
    helpers.utils.toLog(
        logPre + "Funding End DATE:    " + helpers.utils.toDate(Funding_Setting_funding_time_end)
    );

    helpers.utils.toLog(
        logPre + "CashBack Start DATE: " + helpers.utils.toDate(Funding_Setting_cashback_time_start)
    );
    helpers.utils.toLog(
        logPre + "CashBack End DATE:   " + helpers.utils.toDate(Funding_Setting_cashback_time_end)
    );

    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );
    helpers.utils.toLog("");
}

async function showDebugFundingStages(helpers, assetContract) {

    helpers.utils.toLog("\n" + logPre + " Debug - Funding Stages: ");
    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );

    let FundingStageNum = await assetContract.FundingStageNum.call();
    if (FundingStageNum > 0) {
        helpers.utils.toLog(logPre +
            "[" +
            helpers.utils.colors.orange +
            FundingStageNum +
            helpers.utils.colors.none +
            "] Funding Stages: ");

        for (let i = 1; i <= FundingStageNum; i++) {
            let stageId = i;
            helpers.utils.toLog(logPre + "Checking stage id: " + stageId);

            let FundingStage = await assetContract.Collection.call(stageId);
            displayFundingStageStruct(helpers, FundingStage);

        }
    } else {
        helpers.utils.toLog(logPre + "None Found");
    }
    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );
    helpers.utils.toLog("");
}

function displayFundingStageStruct(helpers, struct) {

    // helpers.utils.toLog(struct);
    helpers.utils.toLog(logPre + "name:             " + helpers.web3util.toAscii(struct[0]));           // bytes32
    helpers.utils.toLog(logPre + "description:      " + helpers.web3util.toAscii(struct[1]));           // bytes32
    helpers.utils.toLog(logPre + "state:            " + helpers.web3util.toDecimal(struct[2]));         // uint8
    helpers.utils.toLog(logPre + "time_start:       " + helpers.utils.toDateFromHex(struct[3]));        // uint256
    helpers.utils.toLog(logPre + "time_end:         " + helpers.utils.toDateFromHex(struct[4]));        // uint256
    helpers.utils.toLog(logPre + "amount_cap_soft:  " + helpers.web3util.fromWei(struct[5], "ether"));  // uint256
    helpers.utils.toLog(logPre + "amount_cap_hard:  " + helpers.web3util.fromWei(struct[6], "ether"));  // uint256
    helpers.utils.toLog(logPre + "minimum_entry:    " + helpers.web3util.fromWei(struct[7], "ether"));  // uint256
    helpers.utils.toLog(logPre + "methods:          " + helpers.web3util.toDecimal(struct[8]));         // uint8
    helpers.utils.toLog(logPre + "start_parity:     " + helpers.web3util.toDecimal(struct[9]));         // uint256
    helpers.utils.toLog(logPre + "use_parity:       " + struct[10]);                                    // bool
    helpers.utils.toLog(logPre + "token_share_perc: " + helpers.web3util.toDecimal(struct[11]));        // uint8
    helpers.utils.toLog(logPre + "index:            " + helpers.web3util.toDecimal(struct[12]));        // uint8
    helpers.utils.toLog("");
}

