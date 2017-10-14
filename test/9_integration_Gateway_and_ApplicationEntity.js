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


contract('Gateway and Application Integration', accounts => {
    let app, gateway = {};

    beforeEach(async () => {
        gateway = await GatewayInterface.new();
        app = await ApplicationEntity.new();
    });

    it('initial deployment', async () => {
        assert.equal(await gateway.getApplicationAddress.call(), 0x0, 'gateway should have returned empty address');
        assert.equal(await app.getParentAddress.call(), 0x0, 'app should have returned empty address');
        assert.isFalse(await app._initialized.call(), 'app _initialized should be false')
    });

    it('first linking', async () => {
        await app.linkToGateway(gateway.address, sourceCodeUrl);
        assert.equal(await gateway.getApplicationAddress.call(), app.address, 'gateway should have returned correct app address');
        assert.equal(await app.GatewayInterfaceAddress.call(), gateway.address, 'app should have returned gateway app address');
        assert.isTrue(await app._initialized.call(), 'app _initialized should be true');
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
            assert.equal(await gateway.getApplicationAddress.call(), app2.address, 'gateway should have returned correct app address');
            assert.equal(await app2.getParentAddress.call(), gateway.address, 'app2 should have returned gateway app address');
            assert.isTrue(await app2._initialized.call(), 'app2 _initialized should be true');
            assert.isTrue(await app._locked.call(), 'app1 _lock should be true');

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
            assert.equal(await gateway.getApplicationAddress.call(), app2.address, 'gateway should have returned correct app address');
            assert.equal(await app2.getParentAddress.call(), gateway.address, 'app2 should have returned gateway app address');
            assert.isTrue(await app2._initialized.call(), 'app2 _initialized should be true');
            assert.isTrue(await app._locked.call(), 'app1 _lock should be true');

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
            assert.equal(await gateway.getApplicationAddress.call(), app3.address, 'gateway should have returned correct app address');
            assert.equal(await app3.getParentAddress.call(), gateway.address, 'app3 should have returned gateway app address');
            assert.isTrue(await app3._initialized.call(), 'app3 _initialized should be true');
            assert.isTrue(await app2._locked.call(), 'app2 _lock should be true');
            assert.equal(await proposals.owner.call(), app3.address, 'proposal asset should have returned correct owner address');

        });
    });
});

