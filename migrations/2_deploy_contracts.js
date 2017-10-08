const LinkDatabase = artifacts.require("LinkDatabase");
const GatewayInterface = artifacts.require('GatewayInterface');
const ApplicationEntity = artifacts.require('ApplicationEntity');

const getContract = (name) => artifacts.require(name);


module.exports = (deployer, network) => {
    const isLive = ['mainnet', 'kovan', 'ropsten'].indexOf(network) > -1;

    const entities = [
        'ListingContract',
        'Funding',
        'Meetings',
        'Proposals',
        'GeneralVault'
    ].map(getContract);

    deployer.deploy(LinkDatabase)
        .then(() => deployer.deploy(GatewayInterface, LinkDatabase.address))
        .then(() => deployer.deploy(ApplicationEntity, GatewayInterface.address, LinkDatabase.address))
        .then(() => deployer.deploy(entities))
        .then(() => {
            // if (isLive) return;
            console.log();
            console.log('Application deployed', GatewayInterface.address);
            console.log();
            console.log('Entities');
            console.log('----------------------------------------------------------------');
            entities.map((entity) => {
                console.log(entity.contract_name, entity.address)
            })
        })
};


