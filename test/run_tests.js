const dateFormat                = require('dateformat');
const web3                      = require('web3');
const web3util                  = require('web3-utils');
const utils                     = require('./helpers/utils');
const { assertInvalidOpcode }   = require('./helpers/assertThrow');
const getContract               = (name) => artifacts.require(name);

const EmptyStub                 = artifacts.require('EmptyStub');
const GatewayInterface          = artifacts.require('TestGatewayInterface');
const ApplicationEntity         = artifacts.require('TestApplicationEntity');
const Proposals                 = artifacts.require('TestProposals');

const sourceCodeUrl             = "http://test.com/SourceCodeValidator";

const setup = {
    helpers:{
        assertInvalidOpcode:assertInvalidOpcode,
        utils:utils,
        web3util:web3util,
        web3:web3,
        getContract:getContract,
        dateFormat:dateFormat
    },
    contracts:{
        EmptyStub:EmptyStub,
        GatewayInterface:GatewayInterface,
        ApplicationEntity:ApplicationEntity,
        Proposals:Proposals
    },
    settings:{
        sourceCodeUrl
    },
    assetContractNames: [
        'Proposals',
        'Funding',
        'Milestones',
        'Meetings',
        'GeneralVault',
        'ListingContract'
    ]
};

const tests = [
    // "1_GatewayInterface",
    // "2_ApplicationAsset",
    // "3_ApplicationEntity",
    // "integration_Gateway_and_ApplicationEntity",
    "4_Asset_Funding",
];

utils.toLog('\n  ----------------------------------------------------------------');
utils.toLog("  Running test collections ["+utils.colors.orange+tests.length+utils.colors.none+"]." );
utils.toLog(' ----------------------------------------------------------------');

tests.map( (name) => {
    if(name.length > 0) {
        let filename = './tests/' + name + '.js';
        let runTest = require(filename);
        runTest(setup);
    }
});
