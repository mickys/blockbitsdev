module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Proposals Asset', accounts => {
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