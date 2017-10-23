const utils                 = require('../test/helpers/utils');
const web3util              = require('web3-utils');
const GatewayInterface      = artifacts.require('GatewayInterface');
const ApplicationEntity     = artifacts.require('ApplicationEntity');
const getContract = (obj)   => artifacts.require(obj.name);

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

async function doStage(deployer)  {
    console.log();
    utils.toLog(
        ' ----------------------------------------------------------------\n'+
        '  Stage 1 - Initial Gateway and Application Deployment\n'+
        '  ----------------------------------------------------------------\n'
    );

    utils.toLog("  Deploy GatewayInterface");
    await deployer.deploy(GatewayInterface);

    utils.toLog("  Deploy Assets");
    await Promise.all(entities.map(async (entity) => {
        utils.toLog("    Asset: " + entity.contract_name);
        await deployer.deploy(entity);
    }));
    deployedAssets = assets.map(mapDeployedAssets);

    utils.toLog("  Deploy ApplicationEntity");
    await deployer.deploy(ApplicationEntity);
    let app = await ApplicationEntity.at( ApplicationEntity.address );

    /*

    no longer done one by one .. assets get linked to app when gw links app to itself

    toLog("  Set assets ownership and initialize");
    await Promise.all(deployedAssets.map(async (entity) => {

        let name = entity.name;
        let arts = await artifacts.require(name);
        let contract = await arts.at(arts.address);

        let eventFilter = await hasEvent(
            await contract.setInitialOwnerAndName( name, app.address ),
            'EventAppAssetOwnerSet'
        );
        toLog("    Successfully initialized: " +CGRN+ web3util.toAscii(eventFilter[0].args._name)+NOC) ;
    }));
    */
    utils.toLog("  Link assets to ApplicationEntity");

    await Promise.all(deployedAssets.map(async (entity) => {
        // toLog("    Asset: " + entity.name);
        let receipt = await app[entity.method]( entity.address );
        let eventFilter = await utils.hasEvent(receipt, 'EventAppEntityInitAsset(bytes32,address)');
        utils.toLog("    Successfully linked: " +utils.colors.green+ web3util.toAscii(eventFilter[0].topics[1]) );
    }));

    utils.toLog("  Link ApplicationEntity to GatewayInterface");

    let receipt = await app.linkToGateway(GatewayInterface.address, "http://dummy.url");
    let eventFilter = utils.hasEvent(receipt, 'EventAppEntityReady(address)');
    utils.toLog("    "+utils.colors.green+"EventAppEntityReady => " + eventFilter.length+utils.colors.none);

    utils.toLog(
        '\n  ----------------------------------------------------------------\n'+
        '  Stage 1 - DONE\n'+
        '  ----------------------------------------------------------------\n'
    );

    utils.toLog(
        ' Entities:\n'+
        '  ----------------------------------------------------------------\n');

    utils.toLog("    "+GatewayInterface.contract_name+": "+ GatewayInterface.address);
    utils.toLog("    "+ApplicationEntity.contract_name+": "+ ApplicationEntity.address);

    entities.map((entity) => {
        utils.toLog("      "+entity.contract_name+": "+ entity.address);
    });

}

module.exports = (deployer, network) => {
    deployer.then(async () => await doStage(deployer));
};


