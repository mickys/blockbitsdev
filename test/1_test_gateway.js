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

        it('links ApplicationEntity if valid', async () => {
            await testapp.setGatewayInterfaceEntity(gateway.address);

            const eventFilter = utils.hasEvent(
                await gateway.requestCodeUpgrade(testapp.address, sourceCodeUrl),
                'EventGatewayNewAddress(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.')
        });

        it('creates Upgrade Proposal if a previous ApplicationEntity is already linked', async () => {

            // create proposals object, add app as it's parent and link it to the app
            let proposals = await Proposals.new();
            await proposals.setTestOwner(testapp.address);
            await testapp.addAssetProposals(proposals.address);

            await testapp.linkToGateway(gateway.address, sourceCodeUrl);
            testapp2 = await ApplicationEntity.new();
            await testapp2.setGatewayInterfaceEntity(gateway.address);

            const eventFilter = utils.hasEvent(
                await gateway.requestCodeUpgrade(testapp2.address, sourceCodeUrl),
                'EventAppEntityCodeUpgradeProposal(address,bytes32)'
            );
            assert.equal(eventFilter.length, 1, 'EventAppEntityCodeUpgradeProposal event not received.')
        })

    });

    context('approveCodeUpgrade()', async () => {
        let testapp, emptystub = {};

        beforeEach(async () => {
            emptystub = await EmptyStub.new();
            testapp = await ApplicationEntity.new();
        });

        it('throws if sender is not currentApplicationEntityAddress', async () => {
            await gateway.setCurrentApplicationEntityAddress(0x01);
            return assertInvalidOpcode(async () => {
                await gateway.approveCodeUpgrade(emptystub.address)
            });
        });

    });

});

contract('Application Entity', accounts => {
    let app, app2, gateway, proposals, deployedEntities = {};

    beforeEach(async () => {
        app = await ApplicationEntity.new();
    });

    it('initializes with empty properties', async () => {
        assert.equal( await app.getParentAddress() , 0x0, 'parent address should be empty');
        assert.isFalse( await app._initialized() , false, '_initialized should be false');
    });

    context('initialize()', async () => {
        beforeEach(async () => {
            let emptystub = await EmptyStub.new();
            gateway = await GatewayInterface.new();
        });

        it('works if owner is set, and it\'s the one calling', async () => {
            await app.setGatewayInterfaceEntity(gateway.address);
            let eventFilter = utils.hasEvent(
                await gateway.callApplicationEntityInitialize(app.address),
                'EventAppEntityReady(address)'
            );
            assert.equal(eventFilter.length, 1, 'EventAppEntityReady event not received.')
        });

        it('throws if called when already initialized', async () => {

            await app.setGatewayInterfaceEntity(gateway.address);
            await app.setInitialized();

            return assertInvalidOpcode(async () => {
                await app.initialize()
            });
        });

        it('throws if called with owner missing ( gateway )', async () => {
            await app.setInitialized();
            return assertInvalidOpcode(async () => {
                await app.initialize()
            });
        });

    });
    //     function initialize() external requireNotInitialised onlyGatewayInterface returns (bool) {


    context('Application - Initial Deployment - Linking', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();


            // proposals = await Proposals.new();

            // console.log("testing1 _json: ",proposals._json);
            // console.log("testing1 contract: ",proposals.contract_name);

            // let name = ProposalsEntity.at(proposals.address).contract_name;
            // console.log("testing2 contract: ",name);

            // console.log("testing4: ",proposals.contract.contract_name);
            // console.log("testing3: ",proposals.contract._json.contract_name);


            /*
            deployedEntities = {
                addresses: [ProposalsEntity.address],
                names: [ProposalsEntity.contract_name]
            }
            */
        });

        it('linking one asset will emit EventAppEntityInitAsset event', async () => {

            let asset = assetContractNames[0];
            let contract = await getContract("Test"+asset).new();
            let assetInsertionTx = await app["addAsset"+asset](contract.address);
            let eventFilter = utils.hasEvent(
                assetInsertionTx,
                'EventAppEntityInitAsset(bytes32,address)'
            );

            assert.equal(eventFilter.length, 1, 'EventAppEntityInitAsset event not received.')
        });

        it('linking all assets will emit the same number of EventAppEntityInitAsset events', async () => {

            let eventCollection = await Promise.all(assetContractNames.map(async (asset) => {
                let contract = await getContract("Test"+asset).new();
                let assetInsertionTx = await app["addAsset"+asset](contract.address);
                let eventFilter = utils.hasEvent(
                    assetInsertionTx,
                    'EventAppEntityInitAsset(bytes32,address)'
                );
                return eventFilter;
            }));

            assert.equal(eventCollection.length, assetContractNames.length, 'EventAppEntityInitAsset event not received.')
        });


        it('app1: linkToGateway will emit EventApplicationReady', async () => {
            /*
            const eventFilter = hasEvent(
                await app.linkToGateway(gateway.address, sourceCodeUrl),
                'EventApplicationReady'
            );
            */


            tx = await app.linkToGateway(gateway.address, sourceCodeUrl);

            //console.log("tx: ", tx, "\n");
            //console.log("tx.logs: ", tx.logs, "\n");
            //console.log("tx.receipt.logs: ", tx.receipt.logs, "\n");

            assert.equal(tx.logs.length, 1, 'EventApplicationReady event not received.')
        });

    });

    /*
    context('Application - Initial Deployment - Validation', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
            app = await ApplicationEntity.new();
            await app.linkToGateway(gateway.address, sourceCodeUrl);
        });

        it('app1: parent address is gateway address', async () => {
            let value = await app.getParentAddress();
            assert.equal(value, gateway.address, 'app should have returned correct parent address')
        });

        it('gw: current Application Entity address is app address', async () => {
            let value = await gateway.getApplicationAddress();
            assert.equal(value, app.address, 'app should have returned correct app address')
        });

        it('app1: _initialized is bool: true', async () => {
            let value = await app._initialized();
            assert.isTrue(value, 'app should have returned true for initialized')
        });
    });

    context('Application - Upgrade - Linking', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
            app = await ApplicationEntity.new();
            await app.linkToGateway(gateway.address, sourceCodeUrl);
            app2 = await ApplicationEntity.new();
        });

        it('app2: linkToGateway will emit EventAppEntityCodeUpgradeProposal', async () => {
            const eventFilter = hasEvent(
                await app2.linkToGateway(gateway.address, sourceCodeUrl),
                'EventAppEntityCodeUpgradeProposal'
            );
            assert.equal(eventFilter.length, 1, 'EventAppEntityCodeUpgradeProposal event not received.')
        });

    });

    context('Application - Upgrade - Validation', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
            app = await ApplicationEntity.new();
            await app.linkToGateway(gateway.address, sourceCodeUrl);
            app2 = await ApplicationEntity.new();
            await app2.linkToGateway(gateway.address, sourceCodeUrl);
        });

        it('app2: parent address is gateway address', async () => {
            let value = await app.getParentAddress();
            assert.equal(value, gateway.address, 'app should have returned correct parent address')
        });

        it('gw: current Application Entity address is still app1 address', async () => {
            let value = await gateway.getApplicationAddress();
            assert.equal(value, app.address, 'app should have returned correct app address')
        });

        it('app2: _initialized is bool: false', async () => {
            let value = await app2._initialized();
            assert.isFalse(value, 'app should have returned true for initialized')
        });
    });

    context('Application - Upgrade - Validation', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
            app = await ApplicationEntity.new();
            await app.linkToGateway(gateway.address, sourceCodeUrl);


            app2 = await ApplicationEntity.new();
            await app2.linkToGateway(gateway.address, sourceCodeUrl);
        });

        it('app2: parent address is gateway address', async () => {
            let value = await app.getParentAddress();
            assert.equal(value, gateway.address, 'app should have returned correct parent address')
        });

        it('gw: current Application Entity address is still app1 address', async () => {
            let value = await gateway.getApplicationAddress();
            assert.equal(value, app.address, 'app should have returned correct app address')
        });

        it('app2: _initialized is bool: false', async () => {
            let value = await app2._initialized();
            assert.isFalse(value, 'app should have returned true for initialized')
        });
    });


    context('Application - Upgrade - Acceptance', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
            app = await ApplicationEntity.new();
            await app.linkToGateway(gateway.address, sourceCodeUrl);



            app2 = await ApplicationEntity.new();
            await app2.linkToGateway(gateway.address, sourceCodeUrl);


        });

        it('app2: parent address is gateway address', async () => {
            let value = await app.getParentAddress();
            assert.equal(value, gateway.address, 'app should have returned correct parent address')
        });

        it('gw: current Application Entity address is still app1 address', async () => {
            let value = await gateway.getApplicationAddress();
            assert.equal(value, app.address, 'app should have returned correct app address')
        });

        it('app2: _initialized is bool: false', async () => {
            let value = await app2._initialized();
            assert.isFalse(value, 'app should have returned true for initialized')
        });
    });


    */
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