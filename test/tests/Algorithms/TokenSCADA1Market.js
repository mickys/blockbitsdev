module.exports = function(setup) {

    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;

    contract('Token Stake Calculation And Distribution: Type 1 - Market decides token value', accounts => {
        let assetContract, assetName, fundingContract, FundingInputDirect = {};

        // solidity calc helpers
        let ether = 1000000000000000000;
        let days = 3600 * 24;
        let now = parseInt(( Date.now() / 1000 ).toFixed());

        // tests
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];

        // settings
        let platformWalletAddress = accounts[8];

        let pre_ico_duration = 7 * days;
        let pre_ico_start = now + 10 * days;
        let pre_ico_end = pre_ico_start + pre_ico_duration;

        let pre_ico_settings = {
            name: "PRE ICO",                        //  bytes32 _name,
            description: "PRE ICO Funding Phase",   //  bytes32 _description,
            start_time: pre_ico_start,              //  uint256 _time_start,
            end_time: pre_ico_end,                  //  uint256 _time_end,
            amount_cap_soft: 0,                     //  uint256 _amount_cap_soft,
            amount_cap_hard: 0,                     //  uint256 _amount_cap_hard,
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
            assetName = "TokenSCADA1Market";
            assetContract = await helpers.getContract("Test" + assetName).new();

            fundingContract = await helpers.getContract("TestFunding").new();

            let stage_pre = await fundingContract.addFundingStage(
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

            let stage_ico = await fundingContract.addFundingStage(
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
                await fundingContract.setInitialOwnerAndName(assetName),
                'EventAppAssetOwnerSet(bytes32,address)'
            );

            assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
            assert.equal(await fundingContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]');
            assert.isTrue(await fundingContract._initialized.call(), 'Asset not initialized');

            let FundingInputDirectAddress = await fundingContract.DirectInput.call();
            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);

        });

        it('this test', async () => {

            /*
            let decimals = 18;
            let tokenSupply = 2*10**6*10**decimals; // 2 mil tokens, with 18 decimals.

            let percentInStage = 50; // 50 percent
            let tokensInStage = tokenSupply * percentInStage / 100;

            let raisedAmount = 10000 * ether;




            console.log();

            // percision.. 100k => 7 chars + 18 for decimal places
            // let precision = 25 + 20;

            //uint256 tokenSubDiv = subDivision(1, tokens, precision);
            //uint256 weiStake = subDivision(mine, total, precision);
            // return  ( weiStake * tokenSubDiv ) / (10 ** ( precision ) );


            uint256 tokenSubDiv = subDivision(1, tokenSupply, precision);
            uint256 weiStake = subDivision(_ether_amount, raisedAmount, precision);
            return  ( weiStake * tokenSubDiv ) / (10 ** ( precision ) );


            */

            // let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');
            // await FundingInputDirect.sendTransaction({value: PaymentValue, from: investorWallet1});
            // await FundingInputDirect.sendTransaction({value: PaymentValue, from: investorWallet2});
            // await FundingInputDirect.sendTransaction({value: PaymentValue, from: investorWallet3});

            const BN = require('bn.js');    // using bn.js from web3-utils
            // let PaymentValue = new BN('123456789012345678');

            let oneHundred = new BN('100');                             // 100
            let percentInStage = new BN('50');                          // 50 percent
            let etherBN = new BN('1000000000000000000');                // 1 ether
            let raisedAmount = new BN('60000').mul(etherBN);            // 20k ether
            let totalTokenSupply = new BN('5000000').mul( etherBN );    // 5 mil tokens

            let tokensInStage = totalTokenSupply.mul(percentInStage).div(oneHundred);
            console.log("totalTokenSupply:", totalTokenSupply.toString());
            console.log("tokensInStage:   ", tokensInStage.toString());

            // my share of 10 ether.. => 0,00016%
            // my share of 10 ether.. => 0,00016%
            // my share of 6  ether.. => 0,0001%
            let PaymentValue = new BN('1').mul(etherBN);

            console.log("pay num:", PaymentValue.toString());
            console.log("pay len:", PaymentValue.toString().length);
            console.log("pay wei:", helpers.web3util.fromWei(PaymentValue, 'wei'));
            console.log("pay eth:", helpers.web3util.fromWei(PaymentValue, 'ether'));
            console.log();

            let num = await assetContract.getTokenAmountByEtherForFundingStage(1, PaymentValue.toString());
            //       val * numerator / denominator
            let myTokens = tokensInStage.mul(PaymentValue).div(raisedAmount);
            console.log("expected tokens:", myTokens.toString());
            console.log("tokens div:     ", helpers.web3util.fromWei(num, 'wei').toString());
            console.log("tokens div len: ", helpers.web3util.fromWei(num, 'wei').toString().length);

            console.log("expect integral:", helpers.web3util.fromWei(myTokens, 'ether').toString());
            console.log("tokens integral:", helpers.web3util.fromWei(num, 'ether').toString());
            console.log("tokens int len: ", helpers.web3util.fromWei(num, 'ether').toString().length);

            console.log("tokensInStage:  ", helpers.web3util.toWei(tokensInStage, 'wei').toString() );
            console.log("raisedAmount:   ", helpers.web3util.toWei(raisedAmount, 'wei').toString() );
            console.log("raisedAmount et:", helpers.web3util.fromWei(raisedAmount, 'ether').toString() );
            console.log("PaymentValue:   ", helpers.web3util.toWei(PaymentValue, 'wei').toString() );

            console.log();

            let parity2 = tokensInStage / raisedAmount ;
            console.log("parity fp>>>>>: ", parity2 );

            let myStake = PaymentValue / raisedAmount; // * oneHundred;
            console.log("my stake>>>>>>: ", myStake );

            let outputValue = PaymentValue * parity2;
            console.log("outputValue>>>: ", outputValue );
            console.log("outputValue eth:", helpers.web3util.fromWei(outputValue, 'ether').toString() );

            console.log("outputValue precision: ", '666666666666'.length);


            let zValue = myStake * tokensInStage;
            console.log("zValue >>>>>>: ", zValue );
            let ztoken = zValue *
            console.log("tokens div:     ", helpers.web3util.fromWei(num, 'wei').toString());


            // let allStakes = myStake *

            // console.log("total stakes>>: ",  outputValue );


            // console.log(num / 10**15);
            // console.log("18d:", num.div(10**18).toString());
            /*

            let tx = await assetContract.getTokenStakeForFundingStage(1, PaymentValue.toString());
            num = helpers.web3util.fromWei(tx, 'ether');
            console.log("eth:", num);
            console.log("len:", num.length);
            // console.log("18d", (num / 10**18).toString());
            */
            /*
            tx = await assetContract.getMaxTokenInUnits();
            num = helpers.web3util.fromWei(tx, 'wei');
            console.log(num);
            console.log(num.length);
            */

            /*
            let eventFilter = helpers.utils.hasEvent(
                paymentTx,
                'EventVaultReceivedPayment(address,uint8,uint256)'
            );


            let vaultAddress = helpers.utils.topicToAddress( eventFilter[0].topics[1] );
            let _method = helpers.web3util.toDecimal( eventFilter[0].topics[2] );
            let _value = helpers.web3util.fromWei( eventFilter[0].topics[3], "ether" );

            assert.equal(_method, 1, '_payment_method should be 1');
            assert.equal(_value, PaymentValueInEther, '_value should be '+PaymentValueInEther);

            let VaultBalance = helpers.web3util.fromWei( await getContractBalance(helpers, vaultAddress), "ether" );
            assert.equal(VaultBalance, PaymentValueInEther, 'Vault Contract balance should be '+PaymentValueInEther);

            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

            let amountDirect = await vaultContract.amount_direct.call();
            let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
            assert.equal(amountDirectInEther, PaymentValueInEther, 'amount_direct is invalid.');
            */

            // await showGasUsage(helpers, paymentTx, "     ↓ Direct Payment:");

        });


        /*
        it('throws if already owned', async () => {

            await fundingContract.setInitialOwnerAndName(assetName);
            return helpers.assertInvalidOpcode(async () => {
                await fundingContract.setInitialOwnerAndName(assetName);
            });

        });
        */
    });
};

async function getContractBalance(helpers, address) {
    return await helpers.utils.getBalance(helpers.artifacts, address);
}

let logPre = "      ";

function showGasUsage(helpers, tx, name) {
    helpers.utils.toLog(logPre + name + " GAS USAGE: " +
        helpers.utils.colors.purple +
        tx.receipt.cumulativeGasUsed
    );
}