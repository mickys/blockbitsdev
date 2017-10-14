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

contract('Application Entity', accounts => {
    let app, app2, gateway = {};

    beforeEach(async () => {
        app = await ApplicationEntity.new();
    });

    it('initializes with empty properties', async () => {
        assert.equal(await app.getParentAddress.call(), 0x0, 'parent address should be empty');
        assert.isFalse(await app._initialized.call(), false, '_initialized should be false');
    });

    context('initialize()', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
        });

        it('throws if called when already initialized', async () => {
            await app.setTestGatewayInterfaceEntity(gateway.address);
            await app.setTestInitialized.call();
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

    context('initializeAssetsToThisApplication()', async () => {
        beforeEach(async () => {
            gateway = await GatewayInterface.new();
        });

        it('throws if not an asset', async () => {
            // gateway is accounts[0].. deployment account
            await app.setTestGatewayInterfaceEntity(accounts[0]);

            let emptystub = await EmptyStub.new();
            await app.setTestAsset("Test", emptystub.address );

            // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
            return assertInvalidOpcode(async () => {
                await app.initializeAssetsToThisApplication();
            });
        });

        it('throws if caller is not gateway', async () => {
            await app.setTestGatewayInterfaceEntity(gateway.address);

            // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
            return assertInvalidOpcode(async () => {
                await app.initializeAssetsToThisApplication();
            });
        });
    });
});

