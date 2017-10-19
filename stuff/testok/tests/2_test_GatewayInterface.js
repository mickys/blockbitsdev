const web3                      = require('web3');
const web3util                  = require('web3-utils');
const utils                     = require('../helpers/utils');

const { assertInvalidOpcode }   = require('../helpers/assertThrow');
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
        gateway = await GatewayInterface.new();
        assert.equal( await gateway.getApplicationAddress.call() , 0x0, 'address should be empty');
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

