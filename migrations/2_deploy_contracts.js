const GatewayInterface = artifacts.require('GatewayInterface');
const ApplicationEntity = artifacts.require('ApplicationEntity');
const getContract = (name) => artifacts.require(name);

module.exports = (deployer, network) => {

    console.log();

    const entities = [
        'Funding',
        'Meetings',
        'Proposals',
        'GeneralVault',
        'ListingContract'
    ].map(getContract);

    deployer.deploy(GatewayInterface)
        .then(() => deployer.deploy(entities) )
        .then(() => deployer.deploy(ApplicationEntity) )
        .then(() => {
            return ApplicationEntity.at(ApplicationEntity.address).then(function(instance) {
                instance.initialize(GatewayInterface.address);
                console.log();
                console.log('  ----------------------------------------------------------------');
                console.log("  Initialization Report: ");
                console.log('  ----------------------------------------------------------------');
            });
        }).then(() => {

            console.log('  GatewayInterface address: ', GatewayInterface.address);
            console.log('  ApplicationEntity address:', ApplicationEntity.address);
            console.log();

        }).then(() => {
            return ApplicationEntity.at(ApplicationEntity.address).then(function (instance) {
                return instance.getParentAddress().then(function(returnVal){
                    console.log();
                    console.log('  ApplicationEntity parent expected:', GatewayInterface.address );
                    console.log('  ApplicationEntity parent actual:  ', returnVal );
                })
            });
        }).then(() => {
            return GatewayInterface.at(GatewayInterface.address).then(function(instance) {
                return instance.currentApplicationEntityAddress().then(function(returnVal){
                    console.log('  Gateway - Current ApplicationEntity expected:', ApplicationEntity.address );
                    console.log('  Gateway - Current ApplicationEntity actual:  ', returnVal);
                })
            });
        }).then(() => {
            console.log();
            console.log('  Entities');
            console.log('  ----------------------------------------------------------------');
            entities.map((entity) => {
                console.log(" ", entity.contract_name, entity.address)
            })
            console.log();
        });
};


