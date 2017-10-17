const web3                      = require('web3');
const web3util                  = require('web3-utils');
const utils                     = require('../helpers/utils');

const { assertInvalidOpcode }   = require('../helpers/assertThrow');
const EmptyStub                 = artifacts.require('EmptyStub');

const GatewayInterface          = artifacts.require('TestGatewayInterface');
const ApplicationEntity         = artifacts.require('TestApplicationEntity');
const Proposals                 = artifacts.require('TestProposals');

const sourceCodeUrl             = "http://test.com/SourceCodeValidator";
const getContract               = (name) => artifacts.require(name);


contract('Proposals Asset 1', accounts => {
    let app, assetContract, assetName = {};

    beforeEach(async () => {
        app = await ApplicationEntity.new();
        assetContract = await Proposals.new();
        assetName = "Proposals";
    });

    context("purchase using direct funding", async () => {

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

});


