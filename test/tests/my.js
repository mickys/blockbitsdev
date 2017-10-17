module.exports = function(setup) {

    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;

    contract('Proposals my', accounts => {
        let app, assetContract, assetName = {};

        beforeEach(async () => {
            app = await contracts.ApplicationEntity.new();
            assetContract = await contracts.Proposals.new();
            assetName = "Proposals";
        });

        context("purchase using direct funding", async () => {

            it('works if linking an asset for the first time', async () => {
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.setInitialOwnerAndName(assetName),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
                assert.equal(await assetContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]')
            });

            it('throws if already owned', async () => {
                await assetContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.setInitialOwnerAndName(assetName);
                });
            });
        });
    });

};