// const web3                      = require('web3');
const web3util                  = require('web3-utils');

const utils                     = require('./helpers/utils');
const { assertInvalidOpcode }   = require('./helpers/assertThrow');
const getContract               = (name) => artifacts.require(name);

const EmptyStub                 = artifacts.require('EmptyStub');

const GatewayInterface          = artifacts.require('TestGatewayInterface');
const ApplicationEntity         = artifacts.require('TestApplicationEntity');
const Proposals                 = artifacts.require('TestProposals');
const Token                     = artifacts.require('TestToken');
const TokenManager              = artifacts.require('TestTokenManager');
const sourceCodeUrl             = "http://test.com/SourceCodeValidator";

const solidity = {
    // solidity calc helpers
    ether:1000000000000000000,
    days:3600 * 24,
    now: parseInt(( Date.now() / 1000 ).toFixed())
};


const setup = {
    helpers:{
        assertInvalidOpcode:assertInvalidOpcode,
        utils:utils,
        web3util:web3util,
        web3:web3,
        getContract:getContract,
        solidity:solidity,
        artifacts:artifacts
    },
    contracts:{
        EmptyStub:EmptyStub,
        GatewayInterface:GatewayInterface,
        ApplicationEntity:ApplicationEntity,
        Proposals:Proposals,
        Token:Token,
        TokenManager:TokenManager
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

let tests = [];
tests.push("external/SafeMath");
tests.push("ERC20Token");
tests.push("1_GatewayInterface");
tests.push("2_ApplicationAsset");
tests.push("3_ApplicationEntity");
tests.push("integration_Gateway_and_ApplicationEntity");

tests.push("4_FundingVault");
tests.push("4_Asset_Funding");

if(! process.env.SOLIDITY_COVERAGE ) {


}



utils.toLog('\n  ----------------------------------------------------------------');
utils.toLog("  Running test collections ["+utils.colors.orange+tests.length+utils.colors.none+"]." );
utils.toLog(' ----------------------------------------------------------------');

tests.map( async (name) => {
    if(name.length > 0) {
        let filename = './tests/' + name + '.js';
        let runTest = require(filename);
        await runTest(setup);
    }
});
