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

        context("purchase using direct funding", async () => {

            it('works if linking an asset for the first time', async () => {

                let PaymentValue = 1 * ether;
                let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');
                let paymentTx = await FundingInputDirect.sendTransaction({value: PaymentValue, from: investorWallet1});

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

                await showGasUsage(helpers, paymentTx, "     ↓ Direct Payment:");

            });

            it('throws if already owned', async () => {
                /*
                await fundingContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await fundingContract.setInitialOwnerAndName(assetName);
                });
                */
            });
        });
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