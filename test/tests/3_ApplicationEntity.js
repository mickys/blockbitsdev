module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Application Entity', accounts => {
        let app, app2, gateway = {};

        beforeEach(async () => {
            app = await contracts.ApplicationEntity.new();
        });

        it('initializes with empty properties', async () => {
            assert.equal(await app.getParentAddress.call(), 0x0, 'parent address should be empty');
            assert.isFalse(await app._initialized.call(), false, '_initialized should be false');
        });

        context('initialize()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if called when already initialized', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.setTestInitialized.call();
                return helpers.assertInvalidOpcode(async () => {
                    await app.initialize()
                });
            });

            it('throws if called with owner missing ( gateway )', async () => {
                await app.setTestInitialized();
                return helpers.assertInvalidOpcode(async () => {
                    await app.initialize()
                });
            });

            it('works if owner is set, and it\'s the one calling', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await gateway.setTestCurrentApplicationEntityAddress(app.address);
                let eventFilter = helpers.utils.hasEvent(
                    await gateway.callTestApplicationEntityInitialize(),
                    'EventAppEntityReady(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityReady event not received.')
            });
        });

        context('lock()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if sender is not gateway', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await app.lock()
                });
            });

            it('works if sender is gateway', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await gateway.setTestCurrentApplicationEntityAddress(app.address);
                let eventFilter = helpers.utils.hasEvent(
                    await gateway.callTestLockCurrentApp()
                    , 'EventAppEntityLocked(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityLocked event not received.')
            });
        });

        context('linkToGateway()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if called when owner already exists', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                return helpers.assertInvalidOpcode(async () => {
                    await app.linkToGateway(gateway.address, settings.sourceCodeUrl)
                });
            });

            it('throws if called when already initialized', async () => {
                await app.setTestInitialized();
                return helpers.assertInvalidOpcode(async () => {
                    await app.linkToGateway(gateway.address, settings.sourceCodeUrl)
                });
            });

            it('will emit EventAppEntityReady on initial linking', async () => {
                let eventFilter = helpers.utils.hasEvent(
                    await app.linkToGateway(gateway.address, settings.sourceCodeUrl)
                    , 'EventAppEntityReady(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventApplicationReady event not received.')
            });

            it('will emit EventProposalsCodeUpgradeNew if a previous ApplicationEntity is already linked', async () => {
                let proposals = await contracts.Proposals.new();
                await app.addAssetProposals(proposals.address);
                await app.linkToGateway(gateway.address, settings.sourceCodeUrl);
                app2 = await contracts.ApplicationEntity.new();
                let eventFilter = await helpers.utils.hasEvent(
                    await app2.linkToGateway(gateway.address, settings.sourceCodeUrl),
                    'EventProposalsCodeUpgradeNew(bytes32,uint256)'
                );
                assert.equal(eventFilter.length, 1, 'EventProposalsCodeUpgradeNew event not received.')
            });
        });

        context('addAsset[AssetName]()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if called when already initialized', async () => {
                await app.setTestInitialized();
                let asset = assetContractNames[0];
                let contract = await helpers.getContract("Test" + asset).new();
                return helpers.assertInvalidOpcode(async () => {
                    let assetInsertionTx = await app["addAsset" + asset](contract.address);
                });
            });

            it('linking an asset will emit EventAppEntityInitAsset event', async () => {
                let asset = assetContractNames[0];
                let contract = await helpers.getContract("Test" + asset).new();
                let assetInsertionTx = await app["addAsset" + asset](contract.address);
                let eventFilter = helpers.utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
                assert.equal(eventFilter.length, 1, 'EventAppEntityInitAsset event not received.')
            });

            it('linking all assets will emit the same number of EventAppEntityInitAsset events', async () => {
                let eventCollection = await Promise.all(assetContractNames.map(async (asset) => {
                    let contract = await helpers.getContract("Test" + asset).new();
                    let assetInsertionTx = await app["addAsset" + asset](contract.address);
                    return helpers.utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
                }));
                assert.equal(eventCollection.length, assetContractNames.length, 'EventAppEntityInitAsset event not received.')
            });
        });

        context('initializeAssetsToThisApplication()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if not an asset', async () => {
                // gateway is accounts[0].. deployment account
                await app.setTestGatewayInterfaceEntity(accounts[0]);

                let emptystub = await contracts.EmptyStub.new();
                await app.setTestAsset("Test", emptystub.address);

                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeAssetsToThisApplication();
                });
            });

            it('throws if caller is not gateway', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);

                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeAssetsToThisApplication();
                });
            });
        });
    });
};