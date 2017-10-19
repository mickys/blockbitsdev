module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;


    contract('Vault Factory Test', accounts => {
        let factory = {};
        let ether = 1000000000000000000;

        beforeEach(async () => {
            factory = await helpers.getContract("VaultFactory").new();
        });


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





    });
};
