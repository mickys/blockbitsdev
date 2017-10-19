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
        /*
         let AmountCapSoft = 1000 * ether;
         let AmountCapHard = 3000 * ether;
         let Funding_Setting_funding_time_start = now + 1 * days;
         let Funding_Setting_pre_ico_duration = 7 * days;
         let Funding_Setting_pre_ico_cooldown_duration = 14 * days;
         let Funding_Setting_ico_duration = 30 * days;
         let Funding_Setting_cashback_duration = 90 * days;
         */

        let pre_ico_settings = {
            name: "PRE ICO",                        //  bytes32 _name,
            description: "PRE ICO Funding Phase",   //  bytes32 _description,
            start_time: now + 1 * days,             //  uint256 _time_start,
            end_time: now + 2 * days,               //  uint256 _time_end,
            amount_cap_soft: 1000 * ether,          //  uint256 _amount_cap_soft,
            amount_cap_hard: 3000 * ether,          //  uint256 _amount_cap_hard,
            methods: 3,                             //  uint8   _methods, 3 = DIRECT_AND_MILESTONE
            minimum_entry: 10,                      //  uint256 _minimum_entry,
            start_parity: 0,                        //  uint256 _start_parity,
            use_parity_from_previous: false,        //  bool
            token_share_percentage: 10,             //  uint8
        };

        let ico_settings = {
            name: "ICO",
            description: "ICO Funding Phase",
            start_time: pre_ico_settings.end_time + 1 * days,
            end_time: pre_ico_settings.end_time + 2 * days,
            amount_cap_soft: 19000 * ether,
            amount_cap_hard: 57000 * ether,
            methods: 3,
            minimum_entry: 0,
            start_parity: 0,
            use_parity_from_previous: true,
            token_share_percentage: 40,
        };

        beforeEach(async () => {
            now = Date.now() / 1000;
            app = await contracts.ApplicationEntity.new();
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

            context("a funding stage already exists", async () => {

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

                    // await showDebugSettings(helpers, assetContract);
                    // await showDebugFundingStages(helpers, assetContract);
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
                            pre_ico_settings.end_time - 1,
                            ico_settings.end_time,
                            ico_settings.amount_cap_soft,
                            ico_settings.amount_cap_hard,
                            ico_settings.methods,
                            ico_settings.minimum_entry,
                            ico_settings.start_parity,
                            ico_settings.use_parity_from_previous,
                            95
                        );
                    });
                    assert.equal(await assetContract.FundingStageNum.call(), 1, 'FundingStageNum is not 0!');
                });
            });
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

let logPre = "      ";

async function showDebugSettings(helpers, assetContract) {

    helpers.utils.toLog("\n" + logPre + " Debug - Settings: ");
    helpers.utils.toLog(
        logPre + "-----------------------------------------------------------"
    );
    let AmountRaised = await assetContract.AmountRaised.call();
    let AmountCapSoft = await assetContract.AmountCapSoft.call();
    let AmountCapHard = await assetContract.AmountCapHard.call();
    let TokenSellPercentage = await assetContract.TokenSellPercentage.call();


    let Funding_Setting_funding_time_start = await assetContract.Funding_Setting_funding_time_start.call();
    let Funding_Setting_funding_time_end = await assetContract.Funding_Setting_funding_time_end.call();
    let Funding_Setting_cashback_time_start = await assetContract.Funding_Setting_cashback_time_start.call();
    let Funding_Setting_cashback_time_end = await assetContract.Funding_Setting_cashback_time_end.call();

    helpers.utils.toLog(logPre + "AmountRaised ether:    " + helpers.web3util.fromWei(AmountRaised, "ether"));
    helpers.utils.toLog(logPre + "AmountCapSoft ether:   " + helpers.web3util.fromWei(AmountCapSoft, "ether"));
    helpers.utils.toLog(logPre + "AmountCapHard ether:   " + helpers.web3util.fromWei(AmountCapHard, "ether"));
    helpers.utils.toLog(logPre + "TokenSellPercentage %: " + helpers.web3util.toDecimal(TokenSellPercentage));



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

