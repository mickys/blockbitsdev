const web3                      = require('web3');
const web3util                  = require('web3-utils');
const utils                     = require('../helpers/utils');

const { assertInvalidOpcode }   = require('../helpers/assertThrow');
const EmptyStub                 = artifacts.require('EmptyStub');
// const GenericCaller             = artifacts.require('GenericCaller');

const GatewayInterface          = artifacts.require('TestGatewayInterface');
const ApplicationEntity         = artifacts.require('TestApplicationEntity');
const Funding                   = artifacts.require('TestFunding');
const Milestones                = artifacts.require('TestMilestones');
const GeneralVault              = artifacts.require('TestGeneralVault');

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

contract('Direct Purchase', accounts => {
    let app = {};

    beforeEach(async () => {
        app = await ApplicationEntity.new();
    });
    /*
    context("purchase using direct funding", async () => {
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
    */
});


