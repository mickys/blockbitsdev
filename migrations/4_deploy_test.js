const BigNumber = require('bignumber.js');    // using bn.js from web3-utils
const utils                         = require('../test/helpers/utils');
const web3util                      = require('web3-utils');

const MyToken                       = artifacts.require('MyToken');
const GatewayInterface              = artifacts.require('GatewayInterface');
const ApplicationEntity             = artifacts.require('ApplicationEntity');
const ExtraFundingInputMarketing    = artifacts.require('ExtraFundingInputMarketing');

const ProjectSettings               = require('../project-settings.js');
const getContract = (obj)           => artifacts.require(obj.name);




async function doTest(deployer)  {

    await deployer.deploy(artifacts.require("MyToken"));
    utils.toLog("    Contract: MyToken" );

    let TokenAssetContract = await artifacts.require("MyToken");
    // TokenAssetContract = await TokenAssetContract.at(TokenAssetContract.address);

    utils.toLog("    "+TokenAssetContract.address );


}


async function giveTokens(deployer)  {

    let to = '0x52b333c238bf73888fdde266e9d2a39b75752807';
    let erc = '0x3e8747a9314172400f32b58ea906d66dda822f35';

    let me = '0x4b70518d879a4e2da4ad9cf0189b32d8dc6b7a9b';

    let TokenAssetContract = await artifacts.require("MyToken");
    TokenAssetContract = await TokenAssetContract.at(erc);

    // TokenAssetContract.mint(to, 20000* 10**18);
    // TokenAssetContract.mint('0xeB53052589463bB0f36EECDBa156C3b2587E5284', 20000* 10**18);
    // TokenAssetContract.mint(to, 50000* 10**18);
    // TokenAssetContract.mint('0xeB53052589463bB0f36EECDBa156C3b2587E5284', 50000* 10**18);

    await TokenAssetContract.mint(me, 1000000* 10**18);

    TokenAssetContract.transfer('0x52b333c238bf73888fdde266e9d2a39b75752807', 5000 * 10**18);
    TokenAssetContract.transfer('0xeB53052589463bB0f36EECDBa156C3b2587E5284', 5000 * 10**18);

    // TokenAssetContract.transfer('0x52b333c238bf73888fdde266e9d2a39b75752807', 5000 * 10**18);
    // TokenAssetContract.transfer('0xeB53052589463bB0f36EECDBa156C3b2587E5284', 6000 * 10**18);

    // utils.toLog("    "+TokenAssetContract.address );


}



module.exports = (deployer, network) => {

    // deployer.then(async () => await doTest(deployer));
    deployer.then(async () => await giveTokens(deployer));

};


