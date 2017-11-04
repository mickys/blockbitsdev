// const web3                   = require('web3');
const web3util                  = require('web3-utils');
const BigNumber                 = require('bignumber.js');

BigNumber.config({ DECIMAL_PLACES: 0 , ROUNDING_MODE: 1 }); // ROUND_DOWN = 1


const TestBuildHelper           = require('./app/builder.js');
const ProjectSettings           = require('../project-settings.js');

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


let settings = ProjectSettings.application_settings;
settings.sourceCodeUrl = sourceCodeUrl;

const setup = {
    helpers:{
        assertInvalidOpcode:assertInvalidOpcode,
        utils:utils,
        web3util:web3util,
        web3:web3,
        getContract:getContract,
        solidity:settings.solidity,
        artifacts:artifacts,
        TestBuildHelper:TestBuildHelper,
        BigNumber:BigNumber
    },
    contracts:{
        EmptyStub:EmptyStub,
        GatewayInterface:GatewayInterface,
        ApplicationEntity:ApplicationEntity,
        Proposals:Proposals,
        Token:Token,
        TokenManager:TokenManager
    },
    settings:settings,
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
tests.push("ERC20Token");
tests.push("external/SafeMath");
tests.push("1_GatewayInterface");
tests.push("2_ApplicationAsset");
tests.push("3_ApplicationEntity");
tests.push("integration_Gateway_and_ApplicationEntity");
tests.push("4_Asset_TokenManager");
// fix this shit first - 1 test .. add more - tests.push("Algorithms/TokenSCADA1Market");
tests.push("4_FundingVault");
tests.push("4_Asset_Funding");
tests.push("4_Asset_Funding_Payments");
tests.push("4_Asset_FundingManager");
tests.push("4_Asset_Funding_States");

tests = [];
// tests.push("4_Asset_Funding");
// tests.push("4_Asset_FundingManager");


// tests.push("4_FundingVault");
// tests.push("4_Asset_TokenManager");

// tests.push("oneDeployTest");
// tests.push("4_Asset_Funding");
// tests.push("4_Asset_Funding_Payments");
// tests.push("1_GatewayInterface");

//tests = [];



tests = [];
tests.push("4_Asset_Funding_States");



if(! process.env.SOLIDITY_COVERAGE ) {

}



utils.toLog('\n  ----------------------------------------------------------------');
utils.toLog("  Running test collections ["+utils.colors.orange+tests.length+utils.colors.none+"]." );
utils.toLog(' ----------------------------------------------------------------');


tests.map( async (name) => {
    if(name.length > 0) {
        // console.log("started running "+name);
        let filename = './tests/' + name + '.js';
        let runTest = require(filename);
        await runTest(setup);
        // console.log("finished running "+name);
    }
});


/*

let currentTest = 0;
RecursiveTestLoop();

async function RecursiveTestLoop() {
    if(currentTest < tests.length) {
        console.log("tests[currentTest]", tests[currentTest]);

        let name = tests[currentTest];
        console.log("started running " + name);
        let filename = './tests/' + name + '.js';
        let runTest = require(filename);
        await runTest(setup);
        console.log("finished running " + name);
        currentTest++;
        // setTimeout( function() { RecursiveTestLoop() }, 1000);
        await RecursiveTestLoop()
    }
}
*/

/*

for(i = 0; i < tests.length; i++) {
    console.log("started running "+i);
    let name =  tests[i];
    let filename = './tests/' + name + '.js';
    let runTest = require(filename);
    runTest(setup);
    console.log("finished running "+i);
}
*/