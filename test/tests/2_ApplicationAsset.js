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

        context("applyAndLockSettings()", async () => {
            let assetContract, assetName = {};

            beforeEach(async () => {
                app = await contracts.ApplicationEntity.new();
                assetName = assetContractNames[0];
                assetContract = await helpers.getContract("Test" + assetName).new();
            });

            it('works if called by deployer account and asset is not locked already', async () => {
                await assetContract.setInitialOwnerAndName(assetName);
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.applyAndLockSettings(),
                    'EventRunBeforeApplyingSettings(bytes32)'
                );
                assert.equal(eventFilter.length, 1, 'EventRunBeforeApplyingSettings event not received.');
                assert.isTrue(await assetContract._settingsApplied.call(), '_settingsApplied not true.');
            });

            it('throws if called before initialization', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.applyAndLockSettings()
                });
            });

            it('throws if called when settings are already applied', async () => {
                await assetContract.setInitialOwnerAndName(assetName, {from:accounts[0]});
                await assetContract.applyAndLockSettings();
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.applyAndLockSettings()
                });
            });

            it('throws if not called by deployer\'s account', async () => {
                await assetContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.applyAndLockSettings({from:accounts[1]})
                });
            });

        });

        context("getApplicationAssetAddressByName()", async () => {
            let assetContract, assetName = {};

            beforeEach(async () => {
                assetName = assetContractNames[0];

                app = await contracts.ApplicationEntity.new();
                assetContract = await helpers.getContract("Test"+assetName).new();
                await app["addAsset"+assetName](assetContract.address);

                // set gw address so we can initialize
                await app.setTestGatewayInterfaceEntity(accounts[0]);
            });

            it('works if asset is initialized and owned by an application', async () => {
                // grab ownership of the assets so we can do tests
                await app.initializeAssetsToThisApplication();
                let address = await assetContract.getApplicationAssetAddressByName.call( assetName );
                assert.equal(address, assetContract.address, 'Asset address mismatch!');
            });

            it('works if asset has settings and they are applied', async () => {
                // grab ownership of the assets so we can do tests
                await app.initializeAssetsToThisApplication();

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.applyAndLockSettings(),
                    'EventRunBeforeApplyingSettings(bytes32)'
                );
                assert.equal(eventFilter.length, 1, 'EventRunBeforeApplyingSettings event not received.');
                assert.isTrue(await assetContract._settingsApplied.call(), '_settingsApplied not true.');

                let address = await assetContract.getApplicationAssetAddressByName.call( assetName );
                assert.equal(address, assetContract.address, 'Asset address mismatch!');
            });

            /*

            we can't throw here because funding needs to have token manager already internally initialized in order
            to accept settings.

            it('throws if asset is not initialized', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.getApplicationAssetAddressByName.call('Milestones');
                });
            });
            */

            it('throws if asset name does not exist in the app\'s mapping', async () => {
                // grab ownership of the assets so we can do tests
                await app.initializeAssetsToThisApplication();
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.getApplicationAssetAddressByName.call('SomeRandomAssetName');
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

            it('works if current caller is owner and requested address is not 0x0', async () => {
                let app2 = await contracts.ApplicationEntity.new();
                await assetContract.setInitialOwnerAndName(assetName);

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.transferToNewOwner(app2.address),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.')
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
        });
    });
};