const web3                      = require('web3');
const web3util                  = require('web3-utils');
const utils                     = require('./helpers/utils');

const { assertInvalidOpcode }   = require('./helpers/assertThrow');
const EmptyStub                 = artifacts.require('EmptyStub');

const ApplicationEntity         = artifacts.require('TestApplicationEntity');
const Proposals                 = artifacts.require('TestProposals');
const ListingContract           = artifacts.require('TestListingContract');


contract('Listing Contract', accounts => {
    let app, assetContract, proposals = {};

    beforeEach(async () => {
        app = await ApplicationEntity.new();
        assetContract = await ListingContract.new();
    });

    it('initializes with empty properties', async () => {
        assert.equal(await assetContract.newsItemNum.call(), 0x0, 'newsItemNum should be 0x0');
        assert.equal(await assetContract.childItemNum.call(), 0x0, 'childItemNum should be 0x0');
        assert.isFalse(await assetContract._initialized.call(), false, '_initialized should be false');
        assert.equal(await assetContract.owner.call(), 0x0, 'Asset Owner is not 0x0')
    });
});
