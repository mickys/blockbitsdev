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
            assert.equal(await assetContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]')
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


