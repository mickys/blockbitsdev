const web3util = require('web3-utils');
const GatewayInterface = artifacts.require('GatewayInterface');
const ApplicationEntity = artifacts.require('ApplicationEntity');
const getContract = (obj) => artifacts.require(obj.name);
/*
 ascii escape codes

 Black        0;30     Dark Gray     1;30
 Red          0;31     Light Red     1;31
 Green        0;32     Light Green   1;32
 Brown/Orange 0;33     Yellow        1;33
 Blue         0;34     Light Blue    1;34
 Purple       0;35     Light Purple  1;35
 Cyan         0;36     Light Cyan    1;36
 Light Gray   0;37     White         1;37

 */
const CWHT = '\033[1;37m';
const CGRN = '\033[0;32m';
const NOC = '\033[0m';

const logColor = CWHT;


const assets = [
    {'name' : 'Proposals'},
    {'name' : 'Funding'},
    {'name' : 'Milestones'},
    {'name' : 'Meetings'},
    {'name' : 'GeneralVault'},
    {'name' : 'ListingContract'}
];
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

function hasEvent(receipt, eventName){
    return receipt.logs.filter(x => x.event == eventName);
}

function toLog( what ) {
    console.log(logColor, what, NOC);
}

async function doStage(deployer)  {

    toLog(
        '  ----------------------------------------------------------------\n'+
        '  Stage 1 - Initial Gateway and Application Deployment\n'+
        '  ----------------------------------------------------------------\n'
    );

    toLog("  Deploy GatewayInterface");
    await deployer.deploy(GatewayInterface);

    toLog("  Deploy Assets");
    await Promise.all(entities.map(async (entity) => {
        toLog("    Asset: " + entity.contract_name);
        await deployer.deploy(entity);
    }));
    deployedAssets = assets.map(mapDeployedAssets);

    toLog("  Deploy ApplicationEntity");
    await deployer.deploy(ApplicationEntity);
    let app = await ApplicationEntity.at( ApplicationEntity.address );

    toLog("  Link assets to ApplicationEntity");

    await Promise.all(deployedAssets.map(async (entity) => {
        // toLog("    Asset: " + entity.name);
        let receipt = await app[entity.method]( entity.address );
        let eventFilter = await hasEvent(receipt, 'EventAppEntityInitAsset');

        toLog("    Successfully linked: " +CGRN+ web3util.toAscii(eventFilter[0].args._name) );
    }));

    toLog("  Link ApplicationEntity to GatewayInterface");

    let receipt = await app.linkToGateway(GatewayInterface.address, "http://dummy.url");
    let eventFilter = hasEvent(receipt, 'EventAppEntityReady');
    toLog("    "+CGRN+"EventAppEntityReady => " + eventFilter.length+NOC);

    toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - DONE\n'+
        '  ----------------------------------------------------------------\n'
    );

    toLog(
        '  Entities:\n'+
        '  ----------------------------------------------------------------\n');

    toLog("    "+GatewayInterface.contract_name+": "+ GatewayInterface.address);
    toLog("    "+ApplicationEntity.contract_name+": "+ ApplicationEntity.address);

    entities.map((entity) => {
        toLog("      "+entity.contract_name+": "+ entity.address);
    });

}

module.exports = (deployer, network) => {
    deployer.then(async () => await doStage(deployer));
};


