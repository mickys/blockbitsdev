module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Application Assets', accounts => {
        let app = {};
        beforeEach(async () => {
            app = await contracts.ApplicationEntity.new();
        });

        context("setInitialOwnerAndName()", async () => {
            let assetContract, assetName = {};
            beforeEach(async () => {
                assetName = assetContractNames[0];
                assetContract = await helpers.getContract("Test" + assetName).new();
            });

            it('works if linking an asset for the first time', async () => {
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.setInitialOwnerAndName(assetName),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
                assert.equal(await assetContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]');
                assert.isTrue(await assetContract._initialized.call(), 'Asset not initialized');
            });

            it('throws if already owned', async () => {
                await assetContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.setInitialOwnerAndName(assetName);
                });
            });
        });

        context("transferToNewOwner()", async () => {
            let assetContract, assetName = {};

            beforeEach(async () => {
                app = await contracts.ApplicationEntity.new();
                assetName = assetContractNames[0];
                assetContract = await helpers.getContract("Test" + assetName).new();
            });

            it('throws if called when internal owner address is invalid', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.transferToNewOwner(app.address)
                });
            });

            it('throws if owned and called by other address', async () => {
                await assetContract.setInitialOwnerAndName(assetName, {from:accounts[0]});
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.transferToNewOwner(app.address, {from:accounts[1]})
                });
            });

            it('works if current caller is owner and requested address is not 0x0', async () => {
                let app2 = await contracts.ApplicationEntity.new();
                await assetContract.setInitialOwnerAndName(assetName);

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.transferToNewOwner(app2.address),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.')
            });
        });
    });
};