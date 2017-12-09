module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


    contract('Funding Asset', accounts => {

        let app, assetContract, TestBuildHelper = {};
        let assetName = "Funding";

        // test wallets
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];

        // settings
        let platformWalletAddress = accounts[8];

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept("Funding");

            assetContract = await TestBuildHelper.getDeployedByName("Funding");
        });


        context("funding stages added, asset initialized", async () => {
            let FundingInputDirect, FundingInputMilestone;

            beforeEach( async () => {

                assetContract = await TestBuildHelper.AddAssetSettingsAndLock("Funding");

                assert.isTrue(await assetContract._initialized.call(), 'Asset not initialized');
                assert.isTrue(await assetContract._settingsApplied.call(), 'Asset settings not applied');

                let FundingInputDirectAddress = await assetContract.DirectInput.call();
                let FundingInputMilestoneAddress = await assetContract.MilestoneInput.call();

                let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
                let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

                FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
                FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

            });


            context("Funding State: IN_PROGRESS", async () => {


                context("Funding Input: All", async () => {


                    context("Funding Input: Direct", async () => {

                        beforeEach(async () => {
                            let tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                            tx = await assetContract.doStateChanges();
                        });

                        it('accepts second payment from same investor', async () => {
                            let PaymentValue = 1 * helpers.solidity.ether;
                            let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');

                            let paymentTx = await FundingInputDirect.sendTransaction({
                                value: PaymentValue,
                                from: investorWallet1
                            });

                            let eventFilter = helpers.utils.hasEvent(
                                paymentTx,
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );
                            let secondPaymentTx = await FundingInputDirect.sendTransaction({
                                value: PaymentValue,
                                from: investorWallet1
                            });

                            eventFilter = helpers.utils.hasEvent(
                                secondPaymentTx,
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            let vaultAddress = helpers.utils.topicToAddress(eventFilter[0].topics[1]);
                            let _method = helpers.web3util.toDecimal(eventFilter[0].topics[2]);
                            let _value = helpers.web3util.fromWei(eventFilter[0].topics[3], "ether");

                            let TotalPaymentValues = PaymentValueInEther * 2;

                            assert.equal(_method, 1, '_payment_method should be 1');
                            assert.equal(_value, PaymentValueInEther, '_value should be ' + PaymentValueInEther);

                            let VaultBalance = helpers.web3util.fromWei(await helpers.utils.getContractBalance(helpers, vaultAddress), "ether");
                            assert.equal(VaultBalance, TotalPaymentValues, 'Vault Contract balance should be ' + TotalPaymentValues);

                            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

                            let amountDirect = await vaultContract.amount_direct.call();
                            let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
                            assert.equal(amountDirectInEther, TotalPaymentValues, 'amount_direct is invalid.');


                            await helpers.utils.showGasUsage(helpers, paymentTx, "     ↓ First Direct Payment:");
                            await helpers.utils.showGasUsage(helpers, secondPaymentTx, "     ↓ Second Direct Payment:");

                        });

                        it('accepts second payment from same investor using both payment methods ( Direct & Milestone )', async () => {
                            let DirectPaymentValue = 1 * helpers.solidity.ether;
                            let DirectPaymentValueInEther = helpers.web3util.fromWei(DirectPaymentValue, 'ether');

                            let MilestonePaymentValue = 2 * helpers.solidity.ether;
                            let MilestonePaymentValueInEther = helpers.web3util.fromWei(MilestonePaymentValue, 'ether');

                            // direct payment
                            let eventFilter = helpers.utils.hasEvent(
                                await FundingInputDirect.sendTransaction({
                                    value: DirectPaymentValue,
                                    from: investorWallet1
                                }),
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            // milestone payment
                            eventFilter = helpers.utils.hasEvent(
                                await FundingInputMilestone.sendTransaction({
                                    value: MilestonePaymentValue,
                                    from: investorWallet1
                                }),
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            let vaultAddress = helpers.utils.topicToAddress(eventFilter[0].topics[1]);
                            let _method = helpers.web3util.toDecimal(eventFilter[0].topics[2]);
                            let _value = helpers.web3util.fromWei(eventFilter[0].topics[3], "ether");

                            let TotalPaymentValues = parseInt(DirectPaymentValueInEther) + parseInt(MilestonePaymentValueInEther);

                            assert.equal(_method, 2, '_payment_method should be 2');
                            assert.equal(_value, MilestonePaymentValueInEther, '_value should be ' + MilestonePaymentValueInEther);

                            let VaultBalance = helpers.web3util.fromWei(await helpers.utils.getContractBalance(helpers, vaultAddress), "ether");
                            assert.equal(VaultBalance, TotalPaymentValues, 'Vault Contract balance should be ' + TotalPaymentValues);

                            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

                            let amountDirect = await vaultContract.amount_direct.call();
                            let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
                            assert.equal(amountDirectInEther, DirectPaymentValueInEther, 'amount_direct is invalid.');

                            let amountMilestone = await vaultContract.amount_milestone.call();
                            let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
                            assert.equal(amountMilestoneInEther, MilestonePaymentValueInEther, 'amount_milestone is invalid.');
                        });


                    });

                    context("Funding Input: Milestone", async () => {

                        beforeEach(async () => {
                            let tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                            tx = await assetContract.doStateChanges();
                        });

                        it('accepts payments using fallback () method and stores in valut\'s milestone pool', async () => {
                            let PaymentValue = 1 * helpers.solidity.ether;
                            let PaymentValueInEther = helpers.web3util.fromWei(PaymentValue, 'ether');
                            let paymentTx = await FundingInputMilestone.sendTransaction({
                                value: PaymentValue,
                                from: investorWallet1
                            });
                            let eventFilter = helpers.utils.hasEvent(
                                paymentTx,
                                'EventFundingManagerReceivedPayment(address,uint8,uint256)'
                            );

                            let vaultAddress = helpers.utils.topicToAddress(eventFilter[0].topics[1]);
                            let _method = helpers.web3util.toDecimal(eventFilter[0].topics[2]);
                            let _value = helpers.web3util.fromWei(eventFilter[0].topics[3], "ether");

                            assert.equal(_method, 2, '_payment_method should be 2');
                            assert.equal(_value, PaymentValueInEther, '_value should be ' + PaymentValueInEther);

                            let VaultBalance = helpers.web3util.fromWei(await helpers.utils.getContractBalance(helpers, vaultAddress), "ether");
                            assert.equal(VaultBalance, PaymentValueInEther, 'Vault Contract balance should be ' + PaymentValueInEther);

                            let vaultContract = await helpers.getContract("TestFundingVault").at(vaultAddress);

                            let amountMilestone = await vaultContract.amount_milestone.call();
                            let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
                            assert.equal(amountMilestoneInEther, PaymentValueInEther, 'amount_milestone is invalid.');

                            await helpers.utils.showGasUsage(helpers, paymentTx, "     ↓ Milestone Payment:");

                            // showContractDebug(helpers, assetContract)

                        });
                    });
                });
            });
        });
    });
};

