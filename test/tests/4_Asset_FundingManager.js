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
                paymentNum = 9;

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

                await helpers.utils.showCurrentState(helpers, FundingManager);
                await TestBuildHelper.FundingManagerProcessVaults(0);
            });

            /*
            it('receivePayment() throws if caller is not funding asset', async () => {
                let PaymentValue = 1 * helpers.solidity.ether;
                let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');
                let paymentTx = await FundingInputMilestone.sendTransaction({value: PaymentValue, from: investorWallet1});
                let eventFilter = helpers.utils.hasEvent(
                    paymentTx,
                    'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                );

                let vaultAddress = helpers.utils.topicToAddress( eventFilter[0].topics[1] );
                let _method = helpers.web3util.toDecimal( eventFilter[0].topics[2] );
                let _value = helpers.web3util.fromWei( eventFilter[0].topics[3], "ether" );

                assert.equal(_method, 2, '_payment_method should be 2');
                assert.equal(_value, PaymentValueInEther, '_value should be '+PaymentValueInEther);

                let VaultBalance = helpers.web3util.fromWei( await helpers.utils.getContractBalance(helpers, vaultAddress), "ether" );
                assert.equal(VaultBalance, PaymentValueInEther, 'Vault Contract balance should be '+PaymentValueInEther);

                let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

                let amountMilestone = await vaultContract.amount_milestone.call();
                let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
                assert.equal(amountMilestoneInEther, PaymentValueInEther, 'amount_milestone is invalid.');

                await helpers.utils.showGasUsage(helpers, paymentTx, "     ↓ Milestone Payment:");
            });
            */
        });


    });
};

