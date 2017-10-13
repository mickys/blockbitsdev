const web3                      = require('web3');
const web3util                  = require('web3-utils');
const utils                     = require('./helpers/utils');

const { assertInvalidOpcode }   = require('./helpers/assertThrow');
const EmptyStub                 = artifacts.require('EmptyStub');
// const GenericCaller             = artifacts.require('GenericCaller');

const GatewayInterface          = artifacts.require('TestGatewayInterface');
const ApplicationEntity         = artifacts.require('TestApplicationEntity');
const Proposals                 = artifacts.require('TestProposals');
const Funding                   = artifacts.require('TestFunding');
const Milestones                = artifacts.require('TestMilestones');
const Meetings                  = artifacts.require('TestMeetings');
const GeneralVault              = artifacts.require('TestGeneralVault');
const ListingContract           = artifacts.require('TestListingContract');

const sourceCodeUrl             = "http://test.com/SourceCodeValidator";
const getContract               = (name) => artifacts.require(name);
const getContractName           = (obj) => obj.contract._json.contract_name;


const assetContractNames = [
    'Proposals',
    'Funding',
    'Milestones',
    'Meetings',
    'GeneralVault',
    'ListingContract'
];

contract('Gateway Interface', accounts => {
    let gateway = {};

    beforeEach(async () => {
        gateway = await GatewayInterface.new();
    });

    it('initializes with empty properties', async () => {
        assert.equal( await gateway.getApplicationAddress() , 0x0, 'address should be empty');
    });

    context('requestCodeUpgrade()', async () => {
        let testapp, emptystub, testapp2 = {};

        beforeEach(async () => {
            emptystub = await EmptyStub.new();
            testapp = await ApplicationEntity.new();
        });

        it('throws if address is empty ( 0x0 )', async () => {
            return assertInvalidOpcode(async () => {
                await gateway.requestCodeUpgrade(0x0, sourceCodeUrl)
            })
        });

        it('throws if calling object misses the initialize() method', async () => {
            return assertInvalidOpcode(async () => {
                await gateway.requestCodeUpgrade(emptystub.address, sourceCodeUrl)
            })
        });

        it('links Application if valid', async () => {
            await testapp.setTestGatewayInterfaceEntity(gateway.address);
            const eventFilter = utils.hasEvent(
                await gateway.requestCodeUpgrade(testapp.address, sourceCodeUrl),
                'EventGatewayNewAddress(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.')
        });

        it('creates "Upgrade Proposal" if a previous Application is already linked', async () => {
            let proposals = await Proposals.new();
            await testapp.addAssetProposals(proposals.address);
            await testapp.linkToGateway(gateway.address, sourceCodeUrl);
            testapp2 = await ApplicationEntity.new();
            await testapp2.setTestGatewayInterfaceEntity(gateway.address);
            const eventFilter = utils.hasEvent(
                await gateway.requestCodeUpgrade(testapp2.address, sourceCodeUrl),
                'EventProposalsCodeUpgradeNew(bytes32,uint256)'
            );
            assert.equal(eventFilter.length, 1, 'EventProposalsCodeUpgradeNew event not received.')
        })

    });

    context('approveCodeUpgrade()', async () => {
        let testapp, emptystub = {};

        beforeEach(async () => {
            emptystub = await EmptyStub.new();
            testapp = await ApplicationEntity.new();
        });

        it('throws if sender is not current Application', async () => {
            await gateway.setTestCurrentApplicationEntityAddress(0x01);
            return assertInvalidOpcode(async () => {
                await gateway.approveCodeUpgrade(emptystub.address)
            });
        });

        it('works if sender is current Application', async () => {
            let proposals = await Proposals.new();
            await testapp.addAssetProposals(proposals.address);
            await testapp.linkToGateway(gateway.address, sourceCodeUrl);
            let testapp2 = await ApplicationEntity.new();
            await testapp2.setTestGatewayInterfaceEntity(gateway.address);
            let approveTx = await testapp.callTestApproveCodeUpgrade(testapp2.address);
            let eventFilter = utils.hasEvent(
                approveTx,
                'EventGatewayNewAddress(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.')
            eventFilter = utils.hasEvent(
                approveTx,
                'EventAppEntityAssetsToNewApplication(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventAppEntityAssetsToNewApplication event not received.')

        });
    });

});

contract('Application Entity', accounts => {
    let app, app2, gateway = {};

    beforeEach(async () => {
        app = await ApplicationEntity.new();
    });

    it('initializes with empty properties', async () => {
        assert.equal(await app.getParentAddress(), 0x0, 'parent address should be empty');
        assert.isFalse(await app._initialized(), false, '_initialized should be false');
    });

    context('initialize()', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
        });

        it('throws if called when already initialized', async () => {
            await app.setTestGatewayInterfaceEntity(gateway.address);
            await app.setTestInitialized();
            return assertInvalidOpcode(async () => {
                await app.initialize()
            });
        });

        it('throws if called with owner missing ( gateway )', async () => {
            await app.setTestInitialized();
            return assertInvalidOpcode(async () => {
                await app.initialize()
            });
        });

        it('works if owner is set, and it\'s the one calling', async () => {
            await app.setTestGatewayInterfaceEntity(gateway.address);
            await gateway.setTestCurrentApplicationEntityAddress(app.address);
            let eventFilter = utils.hasEvent(
                await gateway.callTestApplicationEntityInitialize(),
                'EventAppEntityReady(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventAppEntityReady event not received.')
        });

    });


    context('lock()', async () => {

        beforeEach(async () => {
            gateway = await GatewayInterface.new();
        });

        it('throws if sender is not gateway', async () => {
            return assertInvalidOpcode(async () => {
                await app.lock()
            });
        });

        it('works if sender is gateway', async () => {
            await app.setTestGatewayInterfaceEntity(gateway.address);
            await gateway.setTestCurrentApplicationEntityAddress(app.address);
            let eventFilter = utils.hasEvent(
                await gateway.callTestLockCurrentApp()
                , 'EventAppEntityLocked(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventAppEntityLocked event not received.')
        });

    });

    context('linkToGateway()', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
        });

        it('throws if called when owner already exists', async () => {
            await app.setTestGatewayInterfaceEntity(gateway.address);
            return assertInvalidOpcode(async () => {
                await app.linkToGateway(gateway.address, sourceCodeUrl)
            });
        });

        it('throws if called when already initialized', async () => {
            await app.setTestInitialized();
            return assertInvalidOpcode(async () => {
                await app.linkToGateway(gateway.address, sourceCodeUrl)
            });
        });

        it('will emit EventAppEntityReady on initial linking', async () => {
            let eventFilter = utils.hasEvent(
                await app.linkToGateway(gateway.address, sourceCodeUrl)
                , 'EventAppEntityReady(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventApplicationReady event not received.')
        });


        it('will emit EventProposalsCodeUpgradeNew if a previous ApplicationEntity is already linked', async () => {
            let proposals = await Proposals.new();
            await app.addAssetProposals(proposals.address);
            await app.linkToGateway(gateway.address, sourceCodeUrl);
            app2 = await ApplicationEntity.new();
            let eventFilter = await utils.hasEvent(
                await app2.linkToGateway(gateway.address, sourceCodeUrl),
                'EventProposalsCodeUpgradeNew(bytes32,uint256)'
            );
            assert.equal(eventFilter.length, 1, 'EventProposalsCodeUpgradeNew event not received.')
        });


    });


    context('addAsset[AssetName]()', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
        });

        it('throws if called when already initialized', async () => {
            await app.setTestInitialized();
            let asset = assetContractNames[0];
            let contract = await getContract("Test" + asset).new();
            return assertInvalidOpcode(async () => {
                let assetInsertionTx = await app["addAsset" + asset](contract.address);
            });
        });

        it('linking an asset will emit EventAppEntityInitAsset event', async () => {
            let asset = assetContractNames[0];
            let contract = await getContract("Test" + asset).new();
            let assetInsertionTx = await app["addAsset" + asset](contract.address);
            let eventFilter = utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
            assert.equal(eventFilter.length, 1, 'EventAppEntityInitAsset event not received.')
        });



        it('linking all assets will emit the same number of EventAppEntityInitAsset events', async () => {
            let eventCollection = await Promise.all(assetContractNames.map(async (asset) => {
                let contract = await getContract("Test" + asset).new();
                let assetInsertionTx = await app["addAsset" + asset](contract.address);
                return utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
            }));
            assert.equal(eventCollection.length, assetContractNames.length, 'EventAppEntityInitAsset event not received.')
        });
    });

    /*
    context('transferAssetsToNewApplication()', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
        });

        // transferAssetsToNewApplication

    });
    */

});

contract('Application Assets', accounts => {
    let app = {};
    beforeEach(async () => {
        app = await ApplicationEntity.new();
    });

    context("setInitialOwnerAndName()", async () => {
        let assetContract, assetName = {};
        beforeEach(async () => {
            assetName = assetContractNames[0];
            assetContract = await getContract("Test" + assetName).new();
        });

        it('works if linking an asset for the first time', async () => {
            let eventFilter = utils.hasEvent(
                await assetContract.setInitialOwnerAndName(assetName),
                'EventAppAssetOwnerSet(bytes32,address)'
            );
            assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
            assert.equal(await assetContract.owner(), accounts[0], 'Asset Owner is not accounts[0]')
        });

        it('throws if already owned', async () => {
            await assetContract.setInitialOwnerAndName(assetName);
            return assertInvalidOpcode(async () => {
                await assetContract.setInitialOwnerAndName(assetName);
            });
        });


    });

    context("transferToNewOwner()", async () => {
        let assetContract, assetName = {};

        beforeEach(async () => {
            app = await ApplicationEntity.new();
            assetName = assetContractNames[0];
            assetContract = await getContract("Test" + assetName).new();
        });

        it('throws if called when internal owner address is invalid', async () => {
            return assertInvalidOpcode(async () => {
                await assetContract.transferToNewOwner(app.address)
            });
        });

        it('throws if owned and called by other address', async () => {
            await assetContract.setInitialOwnerAndName(assetName, {from:accounts[0]});
            return assertInvalidOpcode(async () => {
                await assetContract.transferToNewOwner(app.address, {from:accounts[1]})
            });
        });

        it('works if current caller is owner and requested address is not 0x0', async () => {
            let app2 = await ApplicationEntity.new();
            await assetContract.setInitialOwnerAndName(assetName);

            let eventFilter = utils.hasEvent(
                await assetContract.transferToNewOwner(app2.address),
                'EventAppAssetOwnerSet(bytes32,address)'
            );
            assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.')
        });
    });
});

contract('Gateway and Application Integration', accounts => {
    let app, gateway = {};

    beforeEach(async () => {
        gateway = await GatewayInterface.new();
        app = await ApplicationEntity.new();
    });

    it('initial deployment', async () => {
        assert.equal(await gateway.getApplicationAddress(), 0x0, 'gateway should have returned empty address');
        assert.equal(await app.getParentAddress(), 0x0, 'app should have returned empty address');
        assert.isFalse(await app._initialized(), 'app _initialized should be false')
    });

    it('first linking', async () => {
        await app.linkToGateway(gateway.address, sourceCodeUrl);
        assert.equal(await gateway.getApplicationAddress(), app.address, 'gateway should have returned correct app address');
        assert.equal(await app.GatewayInterfaceAddress(), gateway.address, 'app should have returned gateway app address');
        assert.isTrue(await app._initialized(), 'app _initialized should be true');
    });

    context('Application upgrades', async () => {
        let proposals, app2 = {};

        beforeEach(async () => {
            proposals = await Proposals.new();
            await app.addAssetProposals(proposals.address);
            await app.linkToGateway(gateway.address, sourceCodeUrl);
        });

        it('first upgrade', async () => {

            app2 = await ApplicationEntity.new();
            await app2.addAssetProposals(proposals.address);
            let eventFilter = await utils.hasEvent(
                await app2.linkToGateway(gateway.address, sourceCodeUrl),
                'EventProposalsCodeUpgradeNew(bytes32,uint256)'
            );
            const requestId = utils.getProposalRequestId(eventFilter);
            eventFilter = utils.hasEvent(
                await proposals.callTestAcceptCodeUpgrade(requestId),
                'EventGatewayNewAddress(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.');
            assert.equal(await gateway.getApplicationAddress(), app2.address, 'gateway should have returned correct app address');
            assert.equal(await app2.getParentAddress(), gateway.address, 'app2 should have returned gateway app address');
            assert.isTrue(await app2._initialized(), 'app2 _initialized should be true');
            assert.isTrue(await app._locked(), 'app1 _lock should be true');

        });

        it('second upgrade', async () => {
            app2 = await ApplicationEntity.new();
            await app2.addAssetProposals(proposals.address);
            let eventFilter = await utils.hasEvent(
                await app2.linkToGateway(gateway.address, sourceCodeUrl),
                'EventProposalsCodeUpgradeNew(bytes32,uint256)'
            );
            let requestId = utils.getProposalRequestId(eventFilter);
            eventFilter = utils.hasEvent(
                await proposals.callTestAcceptCodeUpgrade(requestId),
                'EventGatewayNewAddress(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.');
            assert.equal(await gateway.getApplicationAddress(), app2.address, 'gateway should have returned correct app address');
            assert.equal(await app2.getParentAddress(), gateway.address, 'app2 should have returned gateway app address');
            assert.isTrue(await app2._initialized(), 'app2 _initialized should be true');
            assert.isTrue(await app._locked(), 'app1 _lock should be true');

            // do deployment of second upgrade
            let app3 = await ApplicationEntity.new();
            await app3.addAssetProposals(proposals.address);

            eventFilter = await utils.hasEvent(
                await app3.linkToGateway(gateway.address, sourceCodeUrl),
                'EventProposalsCodeUpgradeNew(bytes32,uint256)'
            );
            requestId = utils.getProposalRequestId(eventFilter);

            eventFilter = utils.hasEvent(
                await proposals.callTestAcceptCodeUpgrade(requestId),
                'EventGatewayNewAddress(address)'
            );

            assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.');
            assert.equal(await gateway.getApplicationAddress(), app3.address, 'gateway should have returned correct app address');
            assert.equal(await app3.getParentAddress(), gateway.address, 'app3 should have returned gateway app address');
            assert.isTrue(await app3._initialized(), 'app3 _initialized should be true');
            assert.isTrue(await app2._locked(), 'app2 _lock should be true');
            assert.equal(await proposals.owner(), app3.address, 'proposal asset should have returned correct owner address');

        });

    });



});

/*
contract('Gateway with Linked Application Entity', accounts => {



    it('requestCodeUpgrade emits EventGatewayNewLinkRequest if address is usable', async () => {
        const eventFilter = hasEvent(
            await gateway.requestCodeUpgrade(ApplicationEntity.address, "http://test.url"),
            'EventGatewayNewLinkRequest'
        );

        console.log( eventFilter );

        assert.equal(1, 1, 'EventGatewayNewLinkRequest event not received.')
    });

    context('Application - Initial Linking', async () => {
        beforeEach(async () => {
            app = await ApplicationEntity.new();
        });


        it('app has correct parent address (gateway)', async () => {
            // app2 returns the double of the value in storage
            let parent = await app.ParentAddress();
            console.log("Parent Address: "+parent);

            assert.equal(parent, gateway.address, 'app should have returned correct parent address')
        })
    })

    context('Application - Code Upgrades', async () => {
        beforeEach(async () => {
            app = await ApplicationEntity.new();
        });


        it('app has correct parent address (gateway)', async () => {
            // app2 returns the double of the value in storage
            let parent = await app.ParentAddress();
            console.log("Parent Address: "+parent);

            assert.equal(parent, gateway.address, 'app should have returned correct parent address')
        })
    })
});
*/
    /*
    it('throws when called by unauthorized entity', async () => {
        return assertInvalidOpcode(async () => {
            await linkdb.add(10, { from: accounts[1] })
        })
    })
    */

    // linkdb.add( address _new, bytes32 _url)
    /*
    context('link database deployed', async 0xc4fc67e7ad06d848d89e6c6628e53c0b9871709c() => {
        beforeEach(async () => {
            await linkdb.setAppCode(appId, appCode1.address)
        })

        it('app has correct parent address (gateway)', async () => {
            // app2 returns the double of the value in storage
            let parent = await app.ParentAddress();
            console.log("Parent Address: "+parent);

            assert.equal(parent, gateway.address, 'app should have returned correct parent address')
        })

    })
    */

    /*

    it('app has correct parent address (gateway)', async () => {
        // app2 returns the double of the value in storage
        let parent = await app.ParentAddress();
        console.log("Parent Address: "+parent);

        assert.equal(parent, gateway.address, 'app should have returned correct parent address')
    })

    */



    /*

    context('setting app code in kernel', async () => {

        beforeEach(async () => {
            await kernel.setAppCode(appId, appCode1.address)
        })

        it('app call works if sent from authed entity', async () => {
            await app.setValue(10)
            assert.equal(await app.getValue(), 10, 'should have returned correct value')
        })

        it('throws when called by unauthorized entity', async () => {
            return assertInvalidOpcode(async () => {
                await app.setValue(10, { from: accounts[1] })
            })
        })

        it('can update app code and storage is preserved', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            // app2 returns the double of the value in storage
            assert.equal(await app.getValue(), 20, 'app 2 should have returned correct value')
        })

        it('can update app code and removed functions throw', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            return assertInvalidOpcode(async () => {
                await app.setValue(10)
            })
        })
    })





const Kernel = artifacts.require('Kernel')
const AppProxy = artifacts.require('AppProxy')
const AppStub = artifacts.require('AppStub')
const AppStub2 = artifacts.require('AppStub2')


contract('Kernel apps', accounts => {
    let kernel, app, appCode1, appCode2 = {}
    const appId = hash('stub.aragonpm.test')

    beforeEach(async () => {
        kernel = await Kernel.new()
        await kernel.initialize(accounts[0])
        const r = await kernel.APP_UPGRADER_ROLE()
        await kernel.createPermission(accounts[0], kernel.address, r, accounts[0])

        appCode1 = await AppStub.new()
        appCode2 = await AppStub2.new()

        const appProxy = await AppProxy.new(kernel.address, appId)
        const r2 = await appCode1.ROLE()
        await kernel.createPermission(accounts[0], appProxy.address, r2, accounts[0])
        app = AppStub.at(appProxy.address)
    })

    it('throws if using app without reference in kernel', async () => {
        return assertInvalidOpcode(async () => {
            await app.setValue(10)
        })
    })

    context('setting app code in kernel', async () => {
        beforeEach(async () => {
            await kernel.setAppCode(appId, appCode1.address)
        })

        it('app call works if sent from authed entity', async () => {
            await app.setValue(10)
            assert.equal(await app.getValue(), 10, 'should have returned correct value')
        })

        it('throws when called by unauthorized entity', async () => {
            return assertInvalidOpcode(async () => {
                await app.setValue(10, { from: accounts[1] })
            })
        })

        it('can update app code and storage is preserved', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            // app2 returns the double of the value in storage
            assert.equal(await app.getValue(), 20, 'app 2 should have returned correct value')
        })

        it('can update app code and removed functions throw', async () => {
            await app.setValue(10)
            await kernel.setAppCode(appId, appCode2.address)
            return assertInvalidOpcode(async () => {
                await app.setValue(10)
            })
        })
    })
})
*/