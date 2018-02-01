const BigNumber = require('bignumber.js');    // using bn.js from web3-utils
const utils                         = require('../test/helpers/utils');
const web3util                      = require('web3-utils');

const Token                         = artifacts.require('Token');
const GatewayInterface              = artifacts.require('GatewayInterface');
const ApplicationEntity             = artifacts.require('ApplicationEntity');
const ExtraFundingInputMarketing    = artifacts.require('ExtraFundingInputMarketing');

const ProjectSettings               = require('../project-settings.js');
const getContract = (obj)           => artifacts.require(obj.name);

let settings = ProjectSettings.application_settings;
settings.sourceCodeUrl = "http://www.blockbits.io/";

let token_settings = settings.token;

const assets = [
    {'name' : 'ListingContract'},
    {'name' : 'NewsContract'},
    {'name' : 'TokenManager'},
    {'name' : 'Proposals'},
    {'name' : 'FundingManager'},
    {'name' : 'Funding'},
    {'name' : 'Milestones'},
    {'name' : 'Meetings'},
    {'name' : 'BountyManager'},
];

let addr = '0x4b70518d879a4e2da4ad9cf0189b32d8dc6b7a9b';
// addr = '0x6719dfeadc2a8cb01279a8b74bf5abc6e1e2ad77';

const entities = assets.map(getContract);

let deployedAssets = [];

const mapDeployedAssets = (asset) => {
    let obj = {};
    contract = getContract(asset);
    obj.name = asset.name;
    obj.method = "addAsset"+asset.name;
    obj.address = contract.address;
    obj.contract_name = contract.contract_name;
    obj.contract = contract;
    return obj;
};

let solAccUtils = artifacts.require('DeployUtils');

async function getBalance(obj, address) {
    return await obj.getBalance.call(address);
}

let live = [
    {"name":"GatewayInterface", "address":"0xe755a6972af63a59ab281b9286e9bb3c418712ab"},
    {"name":"ApplicationEntity", "address":"0x94165db87c8b5c393860442f7f6313444d697ddd"},
    {"name":"ListingContract", "address":"0xdae8fb10f8a8971d3b1c7967df71dd7504575403"},
    {"name":"NewsContract", "address":"0x22b47afe667f72302b8bec9b2e0c73cbe671ab94"},
    {"name":"TokenManager", "address":"0xecf0bcb0e4a0f59b32c27d4b37aa178adb49eab7"},
    {"name":"Proposals", "address":"0xa8bef5aa47ad6ee4c3ccbb7be46b20c0e900a79a"},
    {"name":"FundingManager", "address":"0xe3a3bb72e388cc6ecd0fadc8633a460e47dad14e"},
    {"name":"Funding", "address":"0xb0913d32488685a079f856a133746de5b9f75f50"},
    {"name":"Milestones", "address":"0xc1086d4cdf036d8289e03aa15097785dc9784a7a"},
    {"name":"Meetings", "address":"0x19986cd367e9e1223e980a0536ae018256efdd76"},
    {"name":"BountyManager", "address":"0x1e8744c3e2abe20a83de2904c61ef649d492d5e6"},
    {"name":"ExtraFundingInputMarketing", "address":"0x227737cf985649c49f90b6b5659b5ff3395e24b0"},
];

function getLiveAddressForName(name) {
    for(let i = 0; i < live.length; i++) {
        let entity = live[i];
        if(entity.name === name) {
            return entity.address;
        }
    }
}

function restoreAllAssets() {

}

async function resumeStage(deployer)  {



    // deployedAssets = assets.map(mapDeployedAssets);
    /*
    let resumeAssets = [];

    for(let i = 0; i < assets.length; i++) {
        let entity = assets[i];

        let name = entity.name;
        let arts = await artifacts.require(name);

        let contract = arts.at(getLiveAddressForName(name));

        console.log("["+name+"] at ["+contract.address+"] => ["+ getLiveAddressForName(name) +"]");
    }

    return;

    // deployedAssets = assets.map(mapDeployedAssets);

    for(let i = 0; i < assets.length; i++) {
        let entity = assets[i];

        let name = entity.name;
        let arts = await artifacts.require(name);
        // let contract = await arts.at(arts.address);
        let contract = arts.at(getLiveAddressForName(name));

        if(i > 2) {

            let eventFilter = await utils.hasEvent(
                await contract.applyAndLockSettings(),
                'EventRunBeforeApplyingSettings(bytes32)'
            );

            if (eventFilter.length === 1) {
                utils.toLog("    Successfully locked: " + utils.colors.green + name + utils.colors.none);
            } else {
                throw name + ': EventRunBeforeApplyingSettings event not received.';
            }
        }

    }

    return ;

    */

    utils.toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - VALIDATION\n'+
        '  ----------------------------------------------------------------\n'
    );


    let app = await ApplicationEntity.at( getLiveAddressForName("ApplicationEntity") );


    let gw = await GatewayInterface.at( getLiveAddressForName("GatewayInterface") );
    let gwAppAddress = await gw.currentApplicationEntityAddress.call();
    if(gwAppAddress === app.address) {
        utils.toLog("    " + GatewayInterface.contract_name + ": currentApplicationEntityAddress is correct");
    } else {
        throw "Invalid ApplicationEntity address stored in GatewayInterface";
    }

    let appInit = await app._initialized.call();
    if(appInit.toString() === "true") {
        utils.toLog("    " + ApplicationEntity.contract_name + ": is initialized correctly");
    } else {
        throw "ApplicationEntity is not initialized";
    }

    let AssetCollectionNum = await app.AssetCollectionNum.call();
    if(AssetCollectionNum.toString() === entities.length.toString() ) {
        utils.toLog("    " + ApplicationEntity.contract_name + ": contains the correct number of assets ["+AssetCollectionNum+"]");
    } else {
        throw "ApplicationEntity AssetCollectionNum issue has ["+AssetCollectionNum.toString()+"] should have ["+deployedAssets.length+"]";
    }

    for(let i = 0; i < assets.length; i++) {
        let entity = assets[i];

        let name = entity.name;
        let arts = await artifacts.require(name);
        let contract = await arts.at( getLiveAddressForName(name) );

        let _initialized = await contract._initialized.call();
        let _settingsApplied = await contract._settingsApplied.call();

        if(_initialized.toString() === "true" && _settingsApplied.toString() === "true") {
            utils.toLog("    "+utils.colors.green+ name +utils.colors.white+": locked and settings applied.") ;
        } else {
            throw utils.colors.green+ name +utils.colors.none+" is not locked or has settings not applied" ;
        }

    }

    utils.toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - DONE\n'+
        '  ----------------------------------------------------------------\n'
    );

    utils.toLog(
        ' Entities:\n'+
        '  ----------------------------------------------------------------\n');

    utils.toLog("    GatewayInterface: "+ gw.address);
    utils.toLog("    ApplicationEntity: "+ app.address);


    let FundingContract = await artifacts.require("Funding");
    let FundingAsset = await FundingContract.at( getLiveAddressForName("Funding") );

    // funding inputs
    let FundingInputDirectAddress = await FundingAsset.DirectInput.call();
    let FundingInputMilestoneAddress = await FundingAsset.MilestoneInput.call();

    assets.map((entity) => {
        utils.toLog("      "+entity.name+": "+ getLiveAddressForName(entity.name));
    });

    utils.toLog("    ----------------------------------------------------------------");
    utils.toLog("    FundingInputDirect:    "+ FundingInputDirectAddress);
    utils.toLog("    FundingInputMilestone: "+ FundingInputMilestoneAddress);
    utils.toLog("    FundingInputMarketing: "+ getLiveAddressForName("ExtraFundingInputMarketing"));


    let TokenManagerContract = await artifacts.require("TokenManager");
    let TokenManagerAsset = await TokenManagerContract.at( getLiveAddressForName("TokenManager") );
    let TokenEntityAddress = await TokenManagerAsset.TokenEntity.call();
    utils.toLog("    ----------------------------------------------------------------");
    utils.toLog("    TokenEntityAddress:    "+ TokenEntityAddress);


    // let TokenEntityContract = await artifacts.require("Token");
    // let TokenEntity = await TokenEntityContract.at(TokenEntityAddress);

}

async function doStateChanges() {

    let contract = await artifacts.require("ApplicationEntity");
    let app = await contract.at( getLiveAddressForName("ApplicationEntity") );

    let hasChanges = await app.hasRequiredStateChanges.call();
    let tx = await app.doStateChanges();
    // console.log()
    utils.toLog("    hasChanges: "+ hasChanges.toString() );

    hasChanges = await app.hasRequiredStateChanges.call();
    if (hasChanges === true) {
        await doStateChanges();
    }

}


async function doStage(deployer)  {

    /*
        await deployer.deploy(solAccUtils);
        let balances = await solAccUtils.at( solAccUtils.address );
        let startBalance = new BigNumber( await getBalance(balances, addr) );
    */

    utils.toLog(
        ' ----------------------------------------------------------------\n'+
        '  Stage 1 - Initial Gateway and Application Deployment\n'+
        '  ----------------------------------------------------------------\n'
    );

    utils.toLog("  Deploy GatewayInterface");
    await deployer.deploy(GatewayInterface);

    utils.toLog("  Deploy ApplicationEntity");
    await deployer.deploy(ApplicationEntity);
    let app = await ApplicationEntity.at( ApplicationEntity.address );

    utils.toLog("  Add ApplicationEntity Bylaws");

    await addBylawsIntoApp(app, settings);
    utils.toLog("  Added Bylaws");

    utils.toLog("  Deploy Assets");
    for(let i = 0; i < entities.length; i++) {
        let entity = entities[i];
        utils.toLog("    Asset: " + entity.contract_name);
        let name = entity.contract_name;

        await deployer.deploy(entity);
        let arts = artifacts.require(name);
        let contract = arts.at(arts.address);
        await contract.setInitialApplicationAddress(app.address);
    }


    await deployer.deploy(artifacts.require("Token"));
    utils.toLog("    Contract: Token" );
    await deployer.deploy(artifacts.require("TokenSCADAVariable"));
    utils.toLog("    Contract: TokenSCADAVariable" );
    await deployer.deploy(artifacts.require("ExtraFundingInputMarketing"));
    utils.toLog("    Contract: ExtraFundingInputMarketing" );


    deployedAssets = assets.map(mapDeployedAssets);

    utils.toLog("  Link assets to ApplicationEntity");

    for(let d = 0; d < deployedAssets.length; d++) {
        let entity = deployedAssets[d];
        let receipt = await app[entity.method]( entity.address );
        let eventFilter = await utils.hasEvent(receipt, 'EventAppEntityInitAsset(bytes32,address)');
        utils.toLog("    Successfully linked: " +utils.colors.green+ web3util.toAscii(eventFilter[0].topics[1]) );
    }

    utils.toLog("  Link ApplicationEntity to GatewayInterface");

    let receipt = await app.linkToGateway(GatewayInterface.address, "https://blockbits.io");
    let eventFilter = utils.hasEvent(receipt, 'EventAppEntityReady(address)');
    utils.toLog("    "+utils.colors.green+"EventAppEntityReady => " + eventFilter.length+utils.colors.none);

    utils.toLog("  Apply initial Settings into Entities:");

    let TokenManagerAsset = utils.getAssetContractByName(deployedAssets, "TokenManager");
    let MilestonesAsset = utils.getAssetContractByName(deployedAssets, "Milestones");
    let FundingAsset = utils.getAssetContractByName(deployedAssets, "Funding");

    // Setup token manager
    let TokenManagerAssetContract = await artifacts.require(TokenManagerAsset.name);
    TokenManagerAssetContract = await TokenManagerAssetContract.at(TokenManagerAsset.address);

    let ScadaAssetContract = await artifacts.require("TokenSCADAVariable");
    let ScadaAsset = await ScadaAssetContract.at(ScadaAssetContract.address);
    await ScadaAsset.addSettings(FundingAsset.address);

    utils.toLog("  Added TokenSCADAVariable Settings");

    let tokenContract = await artifacts.require("Token");
    let tokenAsset = await tokenContract.at(tokenContract.address);

    await tokenAsset.addSettings(
        token_settings.supply.toString(),
        token_settings.name,
        token_settings.decimals,
        token_settings.symbol,
        token_settings.version,
        TokenManagerAssetContract.address
    );

    utils.toLog("  Added Token Settings");


    let ExtraContract = await artifacts.require("ExtraFundingInputMarketing");
    let ExtraAsset = await ExtraContract.at(ExtraContract.address);

    await ExtraAsset.addSettings(
        TokenManagerAssetContract.address,        // TokenManager Entity address
        settings.platformWalletAddress,           // Output Address
        settings.extra_marketing.hard_cap,        // 300 ether hard cap
        settings.extra_marketing.tokens_per_eth,  // 20 000 BBX per ETH
        settings.extra_marketing.start_date,      // 31.01.2018
        settings.extra_marketing.end_date         // 10.03.2018
    );

    utils.toLog("  Added ExtraFundingInput Settings");


    await TokenManagerAssetContract.addSettings(
        ScadaAsset.address, tokenContract.address, ExtraAsset.address
    );

    utils.toLog("  Added TokenManager Settings");

    // Setup Funding
    let FundingAssetContract = await artifacts.require(FundingAsset.name);
    FundingAssetContract = await FundingAssetContract.at(FundingAsset.address);

    for (let i = 0; i < settings.funding_periods.length; i++) {

        let stage = settings.funding_periods[i];
        await FundingAssetContract.addFundingStage(
            stage.name,
            stage.start_time,
            stage.end_time,
            stage.amount_cap_soft,
            stage.amount_cap_hard,
            stage.methods,
            stage.minimum_entry,
            stage.fixed_tokens,
            stage.price_addition_percentage,
            stage.token_share_percentage
        );
    }

    // add global funding settings like hard cap and such
    await FundingAssetContract.addSettings(
        settings.platformWalletAddress,
        settings.bylaws["funding_global_soft_cap"],
        settings.bylaws["funding_global_hard_cap"],
        settings.bylaws["token_sale_percentage"]
    );

    utils.toLog("  Added Funding Settings");

    // Setup Milestones
    let MilestonesAssetContract = await artifacts.require(MilestonesAsset.name);
    MilestonesAssetContract = await MilestonesAssetContract.at(MilestonesAsset.address);

    for (let i = 0; i < settings.milestones.length; i++) {
        let milestone = settings.milestones[i];
        await MilestonesAssetContract.addRecord(
            milestone.name,
            milestone.description,
            milestone.duration,
            milestone.funding_percentage,
        );
    }

    utils.toLog("  Added Milestones Settings");

    utils.toLog(
        '  Lock and initialized Settings into Entities:\n'+
        '  ----------------------------------------------------------------\n');

    utils.toLog("  Set assets ownership and initialize");



    for(let i = 0; i < deployedAssets.length; i++) {
        let entity = deployedAssets[i];

        let name = entity.name;
        let arts = await artifacts.require(name);
        let contract = await arts.at(arts.address);

        let eventFilter = await utils.hasEvent(
            await contract.applyAndLockSettings(),
            'EventRunBeforeApplyingSettings(bytes32)'
        );

        if (eventFilter.length === 1) {
            utils.toLog("    Successfully locked: " + utils.colors.green + name + utils.colors.none);
        } else {
            throw name + ': EventRunBeforeApplyingSettings event not received.';
        }


    }

    utils.toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - VALIDATION\n'+
        '  ----------------------------------------------------------------\n'
    );


    let gw = await GatewayInterface.at( GatewayInterface.address );
    let gwAppAddress = await gw.currentApplicationEntityAddress.call();
    if(gwAppAddress === app.address) {
        utils.toLog("    " + GatewayInterface.contract_name + ": currentApplicationEntityAddress is correct");
    } else {
        throw "Invalid ApplicationEntity address stored in GatewayInterface";
    }

    let appInit = await app._initialized.call();
    if(appInit.toString() === "true") {
        utils.toLog("    " + ApplicationEntity.contract_name + ": is initialized correctly");
    } else {
        throw "ApplicationEntity is not initialized";
    }

    let AssetCollectionNum = await app.AssetCollectionNum.call();
    if(AssetCollectionNum.toString() === deployedAssets.length.toString() ) {
        utils.toLog("    " + ApplicationEntity.contract_name + ": contains the correct number of assets ["+AssetCollectionNum+"]");
    } else {
        throw "ApplicationEntity AssetCollectionNum issue has ["+AssetCollectionNum.toString()+"] should have ["+deployedAssets.length+"]";
    }

    for(let i = 0; i < deployedAssets.length; i++) {
        let entity = deployedAssets[i];

        let name = entity.name;
        let arts = await artifacts.require(name);
        let contract = await arts.at(arts.address);

        let _initialized = await contract._initialized.call();
        let _settingsApplied = await contract._settingsApplied.call();

        if(_initialized.toString() === "true" && _settingsApplied.toString() === "true") {
            utils.toLog("    "+utils.colors.green+ name +utils.colors.white+": locked and settings applied.") ;
        } else {
            throw utils.colors.green+ name +utils.colors.none+" is not locked or has settings not applied" ;
        }

    }

    utils.toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - DONE\n'+
        '  ----------------------------------------------------------------\n'
    );

    utils.toLog(
        ' Entities:\n'+
        '  ----------------------------------------------------------------');

    utils.toLog("    "+GatewayInterface.contract_name+": "+ GatewayInterface.address);
    utils.toLog("    "+ApplicationEntity.contract_name+": "+ ApplicationEntity.address);

    entities.map((entity) => {
        utils.toLog("      "+entity.contract_name+": "+ entity.address);
    });

    // funding inputs
    let FundingInputDirectAddress = await FundingAssetContract.DirectInput.call();
    let FundingInputMilestoneAddress = await FundingAssetContract.MilestoneInput.call();

    utils.toLog("  ----------------------------------------------------------------");
    utils.toLog("    InputDirect:    "+ FundingInputDirectAddress);
    utils.toLog("    InputMilestone: "+ FundingInputMilestoneAddress);
    utils.toLog("    InputMarketing: "+ ExtraAsset.address);


    utils.toLog("  ----------------------------------------------------------------");
    utils.toLog("    TokenSCADA:     "+ ScadaAsset.address);
    utils.toLog("    TokenEntity:    "+ tokenAsset.address);
    utils.toLog("  ----------------------------------------------------------------\n");

    /*
    let afterBalance = await new BigNumber( await getBalance(balances, addr));
    console.log( "start balance: ", web3util.fromWei(startBalance, 'ether') );
    console.log( "end balance:   ", web3util.fromWei(afterBalance, 'ether') );
    let diff = startBalance.sub(afterBalance);
    console.log( "diff balance:  ", web3util.fromWei(diff, 'ether') );
    */
}

addBylawsIntoApp = async function (app, settings) {

    for (let key in settings.bylaws) {

        if(key.length > 32) {
            throw "addBylawsIntoApp: ["+key+"] Bylaws key length higher than allowed 32 bytes!";
        }
        let value = settings.bylaws[key];
        // store string bylaw

        if(typeof value === "string") {
            await app.setBylawBytes32(key, value);
        } else {
            // uints and booleans
            // convert booleans to 1 / 0
            if(typeof value === "boolean") {
                if(value === true) {
                    value = 1;
                } else {
                    value = 0;
                }
            }
            await app.setBylawUint256(key, value.toString());
        }
    }
};


async function doTest(deployer) {
    await deployer.deploy("NewsContract");
}

module.exports = (deployer, network) => {

    // return;

    if(settings.doDeployments) {
        // deployer.then(async () => await doTest(deployer));
        // deployer.then(async () => await doStage(deployer));
        // deployer.then(async () => await resumeStage(deployer));
        // deployer.then(async () => await doStateChanges());
        // deployer.then(async () => await doStages(deployer));

        // deployer.then(async () => await doStage(deployer));
    }

};


