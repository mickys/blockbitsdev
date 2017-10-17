module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;

    contract('Gateway Interface', accounts => {
        let gateway = {};

        beforeEach(async () => {
            gateway = await contracts.GatewayInterface.new();
        });

        it('initializes with empty properties', async () => {
            gateway = await contracts.GatewayInterface.new();
            assert.equal( await gateway.getApplicationAddress.call() , 0x0, 'address should be empty');
        });

        context('requestCodeUpgrade()', async () => {
            let testapp, emptystub, testapp2 = {};

            beforeEach(async () => {
                emptystub = await contracts.EmptyStub.new();
                testapp = await contracts.ApplicationEntity.new();
            });

            it('throws if address is empty ( 0x0 )', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await gateway.requestCodeUpgrade(0x0, settings.sourceCodeUrl)
                })
            });

            it('throws if calling object misses the initialize() method', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await gateway.requestCodeUpgrade(emptystub.address, settings.sourceCodeUrl)
                })
            });

            it('links Application if valid', async () => {
                await testapp.setTestGatewayInterfaceEntity(gateway.address);
                const eventFilter = helpers.utils.hasEvent(
                    await gateway.requestCodeUpgrade(testapp.address, settings.sourceCodeUrl),
                    'EventGatewayNewAddress(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.')
            });

            it('creates "Upgrade Proposal" if a previous Application is already linked', async () => {
                let proposals = await contracts.Proposals.new();
                await testapp.addAssetProposals(proposals.address);
                await testapp.linkToGateway(gateway.address, settings.sourceCodeUrl);
                testapp2 = await contracts.ApplicationEntity.new();
                await testapp2.setTestGatewayInterfaceEntity(gateway.address);
                const eventFilter = helpers.utils.hasEvent(
                    await gateway.requestCodeUpgrade(testapp2.address, settings.sourceCodeUrl),
                    'EventProposalsCodeUpgradeNew(bytes32,uint256)'
                );
                assert.equal(eventFilter.length, 1, 'EventProposalsCodeUpgradeNew event not received.')
            })
        });

        context('approveCodeUpgrade()', async () => {
            let testapp, emptystub = {};

            beforeEach(async () => {
                emptystub = await contracts.EmptyStub.new();
                testapp = await contracts.ApplicationEntity.new();
            });

            it('throws if sender is not current Application', async () => {
                await gateway.setTestCurrentApplicationEntityAddress(0x01);
                return helpers.assertInvalidOpcode(async () => {
                    await gateway.approveCodeUpgrade(emptystub.address)
                });
            });

            it('works if sender is current Application', async () => {
                let proposals = await contracts.Proposals.new();
                await testapp.addAssetProposals(proposals.address);
                await testapp.linkToGateway(gateway.address, settings.sourceCodeUrl);
                let testapp2 = await contracts.ApplicationEntity.new();
                await testapp2.setTestGatewayInterfaceEntity(gateway.address);
                let approveTx = await testapp.callTestApproveCodeUpgrade(testapp2.address);
                let eventFilter = helpers.utils.hasEvent(
                    approveTx,
                    'EventGatewayNewAddress(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.')
                eventFilter = helpers.utils.hasEvent(
                    approveTx,
                    'EventAppEntityAssetsToNewApplication(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityAssetsToNewApplication event not received.')
    
            });
        });
    });
};