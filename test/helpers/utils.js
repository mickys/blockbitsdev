const web3util      = require('web3-utils');
const dateFormat    = require('dateformat');
/*
 ascii escape codes

 Black        0;30     Dark Gray     1;30
 Red          0;31     Light Red     1;31
 Green        0;32     Light Green   1;32
 Brown/Orange 0;33     Yellow        1;33
 Blue         0;34     Light Blue    1;34
 Purple       0;35     Light Purple  1;35
 Cyan         0;36     Light Cyan    1;36
 Light Gray   0;37     White         1;37

 */

let colors = {
    none:         "\x1B[0m",
    black:        '\x1B[0;30m',
    dark_gray:    '\x1B[1;30m',
    red:          '\x1B[0;31m',
    light_red:    '\x1B[1;31m',
    green:        '\x1B[0;32m',
    light_green:  '\x1B[1;32m',
    orange:       '\x1B[0;33m',
    yellow:       '\x1B[1;33m',
    blue:         '\x1B[0;34m',
    light_blue:   '\x1B[1;34m',
    purple:       '\x1B[0;35m',
    light_purple: '\x1B[1;35m',
    cyan:         '\x1B[0;36m',
    light_cyan:   '\x1B[1;36m',
    light_gray:   '\x1B[0;37m',
    white:        '\x1B[1;37m'
};

let logPre = "      ";


let FundingStageStates = [
    { key: 0,  name: "NONE"},
    { key: 1,  name: "NEW"}, 				// not started
    { key: 2,  name: "IN_PROGRESS"}, 		// accepts payments
    { key: 3,  name: "FINAL"}				// ended
];

let FundingEntityStates = [
    { key: 0,  name: "NONE"},
    { key: 1,  name: "NEW"},
    { key: 2,  name: "WAITING"},
    { key: 3,  name: "IN_PROGRESS"},
    { key: 4,  name: "COOLDOWN"},
    { key: 5,  name: "FUNDING_ENDED"},
    { key: 6,  name: "FAILED"},
    { key: 7,  name: "FAILED_FINAL"},
    { key: 8,  name: "SUCCESSFUL"},
    { key: 9,  name: "SUCCESSFUL_FINAL"},
];

let FundingMethodIds = [
    "NONE",
    "DIRECT_ONLY",
    "MILESTONE_ONLY",
    "DIRECT_AND_MILESTONE"
];




module.exports = {
    hasEvent(tx, eventNamePlusReturn) {
        let eventSig = web3util.sha3(eventNamePlusReturn);
        return tx.receipt.logs.filter(x => x.topics[0] === eventSig);
    },
    getEventArgs(tx) {
        // tx.receipt.logs[0].topics[2];
    },
    getProposalRequestId(receipt) {
        return web3util.toDecimal( receipt[0].topics[2] );
    },
    colors,
    toLog( what ) {
        console.log(colors.white, what, colors.none);
    },
    toDate(seconds) {
        return dateFormat(parseInt(seconds) * 1000, "yyyy-mm-dd, HH:MM:ss TT");
    },
    topicToAddress(hexString) {
        return hexString.replace("0x000000000000000000000000", "0x");
    },
    toDateFromHex(hex) {
        return this.toDate( web3util.toDecimal(hex) );
    },
    getBalance(artifacts, address) {
        let solAccUtils = artifacts.require('SolidityAccountUtils');
        return solAccUtils.new().then(function(instance){ return instance.getBalance.call(address) });
    },
    transferTo(artifacts, _val, _from, _to) {
        let solAccUtils = artifacts.require('SolidityAccountUtils');
        return solAccUtils.new().then(function(instance){ return instance.transferTo(_to, {value: _val, from: _from}) });
    },


    async showContractDebug(helpers, assetContract) {

        helpers.utils.toLog("\n" + logPre + " Debug: ");
        helpers.utils.toLog(
            logPre + "-----------------------------------------------------------"
        );

        // purchaseRecords
        let RecordsNum = await assetContract.purchaseRecordsNum.call();

        helpers.utils.toLog(
            logPre + "Puchase Record Count: "+
            helpers.utils.colors.orange+
            RecordsNum
        );

        if (RecordsNum > 0) {

            for (let i = 1; i <= RecordsNum; i++) {
                let Record = await assetContract.purchaseRecords.call(i);
                helpers.utils.toLog(logPre + "Record ID:      " + i);         // uint16
                helpers.utils.toLog(logPre + "  unix_time:      " + helpers.utils.toDateFromHex(Record[0]));        // uint256
                helpers.utils.toLog(logPre + "  payment_method: " + helpers.web3util.toDecimal(Record[1]));         // uint8
                helpers.utils.toLog(logPre + "  amount:         " + helpers.web3util.fromWei(Record[2], "ether"));  // uint256
                helpers.utils.toLog(logPre + "  index:          " + helpers.web3util.toDecimal(Record[3]));         // uint16
                helpers.utils.toLog("");
            }
        }
        helpers.utils.toLog(
            logPre + "-----------------------------------------------------------"
        );

        let amountDirect = await assetContract.amount_direct.call();
        let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
        helpers.utils.toLog(
            logPre + "Direct balance:      "+amountDirectInEther
        );

        let amountMilestone = await assetContract.amount_milestone.call();
        let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
        helpers.utils.toLog(
            logPre + "Milestone balance:   "+amountMilestoneInEther
        );

        await showContractBalance(helpers, assetContract);

        helpers.utils.toLog(
            logPre + "-----------------------------------------------------------"
        );
        helpers.utils.toLog("");
    },
    async showAccountBalances(helpers, accounts) {
        helpers.utils.toLog(logPre + " TestRPC Balances: ");
        for (let i = 0; i < accounts.length; i++) {
            let balance = await helpers.utils.getBalance(helpers.artifacts, accounts[i]);
            helpers.utils.toLog(
                logPre +
                "["+i+"] "+accounts[i]+ ": "+ helpers.web3util.fromWei(balance, "ether")
            );
        }
    },
    async showContractBalance(helpers, contract) {
        helpers.utils.toLog("\n" + logPre + " Contract Balances: ");
        let balance = await helpers.utils.getBalance(helpers.artifacts, contract.address.toString());
        helpers.utils.toLog(
            logPre +
            contract.address.toString()+ ": "+ helpers.web3util.fromWei(balance, "ether")
        );
    },
    async showGasUsage(helpers, tx, name) {
        helpers.utils.toLog(logPre + name + " GAS USAGE: " +
            helpers.utils.colors.purple +
            tx.receipt.cumulativeGasUsed
        );
    },
    async showCurrentState(helpers, assetContract) {
        await helpers.utils.showDebugSettings(helpers, assetContract);
        await helpers.utils.showDebugFundingStages(helpers, assetContract);
        // await helpers.utils.showDebugFundingStageStateRequiredChanges(helpers, assetContract);
        await helpers.utils.showDebugRequiredStateChanges(helpers, assetContract);

    },
    async runStateChanger(helpers, assetContract) {

        let hasChanges = await assetContract.hasStateChanges.call();
        if (hasChanges === true) {

            helpers.utils.toLog(logPre + helpers.utils.colors.purple + "Running doStateChanges ...");
            tx = await assetContract.doStateChanges(true);

            for (let log of tx.logs) {
                if (log.event === "DebugRecordRequiredChanges") {
                    console.log(logPre + " Record C: " + helpers.utils.getFundingStageStateNameById(helpers.web3util.toDecimal(log.args._current)));
                    console.log(logPre + " Record R: " + helpers.utils.getFundingStageStateNameById(helpers.web3util.toDecimal(log.args._required)));
                } else if (log.event === "DebugEntityRequiredChanges") {
                    console.log(logPre + " Entity C: " + helpers.utils.getFundingEntityStateNameById(helpers.web3util.toDecimal(log.args._current)));
                    console.log(logPre + " Entity R: " + helpers.utils.getFundingEntityStateNameById(helpers.web3util.toDecimal(log.args._required)));
                } else if (log.event === "DebugCallAgain") {
                    let whoAr = [0, "Entity", "Record"];
                    let who = helpers.web3util.toDecimal(log.args._who);
                    console.log(logPre + " DebugCallAgain: " + whoAr[who]);
                } else if (log.event === "EventEntityProcessor") {
                    console.log(logPre + " EventEntityProcessor: state:" + helpers.utils.getFundingEntityStateNameById(helpers.web3util.toDecimal(log.args._state)) );
                }

            }

            await helpers.utils.showGasUsage(helpers, tx);
            await helpers.utils.showDebugRequiredStateChanges(helpers, assetContract);
        }
    },
    async showDebugRequiredStateChanges(helpers, assetContract) {

        helpers.utils.toLog("\n" + logPre + " Debug - Required State Changes: ");
        helpers.utils.toLog(
            logPre + "-----------------------------------------------------------"
        );

        let contractTimeStamp = await assetContract.getTimestamp.call();
        helpers.utils.toLog(
            logPre + "Contract Time and Date:  " + helpers.utils.toDate(contractTimeStamp)
        );

        let reqChanges = await assetContract.getRequiredStateChanges.call();

        let CurrentFundingStageState = helpers.utils.getFundingStageStateNameById(helpers.web3util.toDecimal(reqChanges[0]));
        let FundingStageStateRequired = helpers.utils.getFundingStageStateNameById(helpers.web3util.toDecimal(reqChanges[1]));
        let EntityStateRequired = helpers.utils.getFundingEntityStateNameById(helpers.web3util.toDecimal(reqChanges[2]));


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
            helpers.utils.getFundingEntityStateNameById(CurrentEntityState)
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
        // helpers.utils.displayFundingStageStruct(helpers, FundingStage);

        helpers.utils.toLog("");
    },
    async showDebugFundingStageStateRequiredChanges(helpers, assetContract) {

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
            helpers.utils.getFundingStageStateNameById(helpers.web3util.toDecimal(FundingStage[2]))
        );

        let stateChanges = await assetContract.getRequiredStateChanges.call();
        let RecordStateRequired = stateChanges[1];
        let EntityStateRequired = stateChanges[2];


        let stateChangeInt = helpers.web3util.toDecimal(RecordStateRequired);
        if(stateChangeInt !== 0) {
            helpers.utils.toLog(
                logPre + "Required record change: " +
                helpers.utils.colors.red +
                helpers.utils.getFundingStageStateNameById(stateChangeInt)
            );
        } else {
            helpers.utils.toLog(
                logPre + "Required record change: " +
                helpers.utils.colors.green +
                helpers.utils.getFundingStageStateNameById(stateChangeInt)
            );
        }

        // FundingStageStates

        // let FundingStage = await assetContract.Collection.call(stageId);
        // helpers.utils.displayFundingStageStruct(helpers, FundingStage);


        helpers.utils.toLog("");
    },
    async showCurrentSettings(helpers, assetContract) {

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

    },
    async showDebugSettings(helpers, assetContract) {

        helpers.utils.toLog("\n" + logPre + " Debug - Settings: ");
        helpers.utils.toLog(
            logPre + "-----------------------------------------------------------"
        );
        let AmountRaised = await assetContract.AmountRaised.call();
        let AmountCapSoft = await assetContract.GlobalAmountCapSoft.call();
        let AmountCapHard = await assetContract.GlobalAmountCapHard.call();
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
    ,
    async showDebugFundingStages(helpers, assetContract) {

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
                helpers.utils.displayFundingStageStruct(helpers, FundingStage);

            }
        } else {
            helpers.utils.toLog(logPre + "None Found");
        }
        helpers.utils.toLog(
            logPre + "-----------------------------------------------------------"
        );
        helpers.utils.toLog("");
    },
    displayFundingStageStruct(helpers, struct) {

        // helpers.utils.toLog(struct);
        helpers.utils.toLog(logPre + "name:             " + helpers.web3util.toAscii(struct[0]));           // bytes32
        helpers.utils.toLog(logPre + "description:      " + helpers.web3util.toAscii(struct[1]));           // bytes32
        helpers.utils.toLog(logPre + "state:            " + helpers.web3util.toDecimal(struct[2]));         // uint8
        helpers.utils.toLog(logPre + "time_start:       " + helpers.utils.toDateFromHex(struct[3]));        // uint256
        helpers.utils.toLog(logPre + "time_end:         " + helpers.utils.toDateFromHex(struct[4]));        // uint256
        helpers.utils.toLog(logPre + "amount_cap_soft:  " + helpers.web3util.fromWei(struct[5], "ether"));  // uint256
        helpers.utils.toLog(logPre + "amount_cap_hard:  " + helpers.web3util.fromWei(struct[6], "ether"));  // uint256
        helpers.utils.toLog(logPre + "amount_raised:    " + helpers.web3util.fromWei(struct[7], "ether"));  // uint256
        helpers.utils.toLog(logPre + "minimum_entry:    " + helpers.web3util.fromWei(struct[8], "ether"));  // uint256
        helpers.utils.toLog(logPre + "methods:          " + helpers.web3util.toDecimal(struct[9]));         // uint8
        helpers.utils.toLog(logPre + "start_parity:     " + helpers.web3util.toDecimal(struct[10]));         // uint256
        helpers.utils.toLog(logPre + "use_parity:       " + struct[11]);                                    // bool
        helpers.utils.toLog(logPre + "token_share_perc: " + helpers.web3util.toDecimal(struct[12]));        // uint8
        helpers.utils.toLog(logPre + "index:            " + helpers.web3util.toDecimal(struct[13]));        // uint8
        helpers.utils.toLog("");
    },
    getFundingStageStateNameById(_id) {
        return FundingStageStates.filter(x => x.key === _id)[0].name;
    },
    getFundingStageStateIdByName(_name) {
        return FundingStageStates.filter(x => x.name === _name)[0].key;
    },
    getFundingEntityStateNameById(_id) {
        return FundingEntityStates.filter(x => x.key === _id)[0].name;
    },
    getFundingEntityStateIdByName(_name) {
        return FundingEntityStates.filter(x => x.name === _name)[0].key;
    },
    async getContractBalance(helpers, address) {
        return await helpers.utils.getBalance(helpers.artifacts, address);
    }
};
