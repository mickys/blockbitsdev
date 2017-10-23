module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;


    contract('Funding Vault', accounts => {

        let deploymentAddress = accounts[0];
        let investorAddress = accounts[1];
        let platformWalletAddress = accounts[8];
        let assetContract;
        let assetName = "FundingVault";
        let fundingContract, milestonesContract;
        let FUNDING_DIRECT_METHOD = 1;
        let FUNDING_MILESTONE_METHOD = 2;

        beforeEach(async () => {
            fundingContract = await helpers.getContract("TestFunding").new();
            milestonesContract = await helpers.getContract("TestMilestones").new();
            assetContract = await helpers.getContract("Test" + assetName).new();
        });

        it('initializes with empty properties', async () => {
            assert.equal(await assetContract.vaultOwner.call(), 0x0, 'vaultOwner address should be empty');
            assert.equal(await assetContract.outputAddress.call(), 0x0, 'outputAddress address should be empty');
            assert.equal(await assetContract.managerAddress.call(), 0x0, 'managerAddress address should be empty');
            assert.isFalse(await assetContract._initialized.call(), false, '_initialized should be false');
        });

        context('initialize()', async () => {
            beforeEach(async () => {

            });

            it('throws if called when already initialized', async () => {
                await assetContract.setTestInitialized();
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.initialize(
                        investorAddress,
                        platformWalletAddress,
                        fundingContract.address,
                        milestonesContract.address,
                        {from: deploymentAddress}
                    );
                });
            });

            it('works if settings are correct and has not been initialized before', async () => {
                await assetContract.initialize(
                    investorAddress,
                    platformWalletAddress,
                    fundingContract.address,
                    milestonesContract.address,
                    {from: deploymentAddress}
                );
                assert.equal(await assetContract.vaultOwner.call(), investorAddress, 'vaultOwner address should not be empty');
                assert.equal(await assetContract.outputAddress.call(), platformWalletAddress, 'outputAddress address should not be empty');
                assert.equal(await assetContract.managerAddress.call(), deploymentAddress, 'managerAddress address should not be empty');
                assert.isTrue(await assetContract._initialized.call(), '_initialized should be true');
            });
        });


        context('addPayment()', async () => {
            beforeEach(async () => {
                await assetContract.initialize(
                    investorAddress,
                    platformWalletAddress,
                    fundingContract.address,
                    milestonesContract.address,
                    {from: deploymentAddress}
                );
                assert.equal(await assetContract.vaultOwner.call(), investorAddress, 'vaultOwner address should not be empty');
                assert.equal(await assetContract.outputAddress.call(), platformWalletAddress, 'outputAddress address should not be empty');
                assert.equal(await assetContract.managerAddress.call(), deploymentAddress, 'managerAddress address should not be empty');
                assert.isTrue(await assetContract._initialized.call(), '_initialized should be true');
            });

            it('FUNDING_DIRECT_METHOD - works with correct settings and caller', async () => {
                let sendAmount = 1 * helpers.solidity.ether;
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD, {value: sendAmount, from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'EventPaymentReceived event not received.');

                let purchaseRecordsNum = await assetContract.purchaseRecordsNum.call();
                assert.equal(purchaseRecordsNum, 1, 'purchaseRecordsNum is not 1.');

                let Record = await assetContract.purchaseRecords.call(purchaseRecordsNum);
                let RecordAmountInEther = helpers.web3util.fromWei(Record[2], "ether");
                let SentAmountInEther = helpers.web3util.fromWei(sendAmount, "ether");
                assert.equal(RecordAmountInEther, SentAmountInEther, 'Record Amount is invalid.');

                let contractBalance = await helpers.utils.getBalance(helpers.artifacts, assetContract.address.toString());
                let contractBalanceInEther = helpers.web3util.fromWei(contractBalance, "ether");
                assert.equal(SentAmountInEther, contractBalanceInEther, 'Contract Amount is invalid.');

                let amountDirect = await assetContract.amount_direct.call();
                let amountDirectInEther = helpers.web3util.fromWei(amountDirect, "ether");
                assert.equal(amountDirectInEther, SentAmountInEther, 'amount_direct is invalid.');
            });

            it('FUNDING_MILESTONE_METHOD - works with correct settings and caller', async () => {
                let sendAmount = 1 * helpers.solidity.ether;
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_MILESTONE_METHOD, {value: sendAmount, from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'EventPaymentReceived event not received.');

                let purchaseRecordsNum = await assetContract.purchaseRecordsNum.call();
                assert.equal(purchaseRecordsNum, 1, 'purchaseRecordsNum is not 1.');

                let Record = await assetContract.purchaseRecords.call(purchaseRecordsNum);
                let RecordAmountInEther = helpers.web3util.fromWei(Record[2], "ether");
                let SentAmountInEther = helpers.web3util.fromWei(sendAmount, "ether");
                assert.equal(RecordAmountInEther, SentAmountInEther, 'Record Amount is invalid.');

                let contractBalance = await helpers.utils.getBalance(helpers.artifacts, assetContract.address.toString());
                let contractBalanceInEther = helpers.web3util.fromWei(contractBalance, "ether");
                assert.equal(SentAmountInEther, contractBalanceInEther, 'Contract Amount is invalid.');

                let amountMilestone = await assetContract.amount_milestone.call();
                let amountMilestoneInEther = helpers.web3util.fromWei(amountMilestone, "ether");
                assert.equal(amountMilestoneInEther, SentAmountInEther, 'amount_milestone is invalid.');
            });


            it('throws if msg.value is missing', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD);
                });
            });

            it('throws if payment method does not exist', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addPayment(3, {value: 1 * helpers.solidity.ether});
                });
            });

            it('throws if called by other address than manager (funding contract)', async () => {
                let sendAmount = 1 * helpers.solidity.ether;
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD, {value: sendAmount, from: accounts[3]})
                });
            });

            it('handles multiple payments, irregardless of funding method provided', async () => {

                let sendAmount = 1 * helpers.solidity.ether;
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_DIRECT_METHOD, {value: sendAmount, from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'Direct Payment: EventPaymentReceived event not received.');

                eventFilter = helpers.utils.hasEvent(
                    await assetContract.addPayment(FUNDING_MILESTONE_METHOD, {value: sendAmount * 5 , from: deploymentAddress}),
                    'EventPaymentReceived(uint8,uint256,uint16)'
                );
                assert.equal(eventFilter.length, 1, 'Milestone Payment: EventPaymentReceived event not received.');

                await showContractDebug(helpers, assetContract);
            });

        });



        /*
        it('test this thing', async () => {
                                                    // 1000000000000000000
            let tx = await factory.createVault({value: 50 * ether });
            let eventFilter = await helpers.utils.hasEvent(
                tx,
                'NewVaultCreated(address)'
            );

            console.log(tx);
            console.log(tx.logs[0].args);
            console.log( helpers.web3util.fromWei( tx.logs[0].args._amount , "ether" ) );

            eventFilter = await helpers.utils.hasEvent(
                tx,
                'VaultReceived(uint256)'
            );

            let t = eventFilter[0].topics[1];
            let amt = helpers.web3util.fromWei( t , "ether" );

            console.log( amt );

        });
        */




    });
};

/*
 await showAccountBalances(helpers, accounts);
 await helpers.utils.transferTo(artifacts, 99.5 * helpers.solidity.ether, accounts[9], accounts[0]);


 await showContractDebug(helpers, assetContract);
 await showAccountBalances(helpers, accounts);
 await showContractBalance(helpers, assetContract);

*/

let logPre = "      ";

async function showContractDebug(helpers, assetContract) {

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
}



async function showAccountBalances(helpers, accounts) {

    helpers.utils.toLog(logPre + " TestRPC Balances: ");
    for (let i = 0; i < 10; i++) {
        let balance = await helpers.utils.getBalance(helpers.artifacts, accounts[i]);
        helpers.utils.toLog(
            logPre +
            "["+i+"] "+accounts[i]+ ": "+ helpers.web3util.fromWei(balance, "ether")
        );
    }

}

async function showContractBalance(helpers, contract) {

    helpers.utils.toLog("\n" + logPre + " Contract Balances: ");
    let balance = await helpers.utils.getBalance(helpers.artifacts, contract.address.toString());
    helpers.utils.toLog(
        logPre +
        contract.address.toString()+ ": "+ helpers.web3util.fromWei(balance, "ether")
    );


}
