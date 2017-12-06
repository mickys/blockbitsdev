module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('SnapShotTest', accounts => {

        let ApplicationEntity;

        beforeEach(async () => {

            let SnapShotKey = "Init";
            if( typeof snapshots[SnapShotKey] !== "undefined" && snapshotsEnabled) {
                console.log("restore snapshot ["+snapshots[SnapShotKey]+"]");

                // restore snapshot
                await helpers.web3.evm.revert( snapshots[SnapShotKey] );
                // save again because whomever wrote test rpc had the impression noone would ever restore twice.. dafuq
                snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();

            } else {

                if(snapshotsEnabled) {
                    console.log("before snapshot");
                }

                let Contract = await helpers.getContract("TestApplicationEntity");
                ApplicationEntity = await Contract.new();


                // create snapshot
                if(snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                    console.log("created snapshot ["+snapshots[SnapShotKey]+"]");
                }
            }




        });

        it("test 1", async () => {
            let deployer = await ApplicationEntity.deployerAddress.call();
            console.log( deployer );
            assert(deployer, accounts[0], "Deployer address mismatch!")
        });

        it("test 2", async () => {
            let deployer = await ApplicationEntity.deployerAddress.call();
            console.log( deployer );
            assert(deployer, accounts[0], "Deployer address mismatch!")
        });

        it("test 3", async () => {
            let deployer = await ApplicationEntity.deployerAddress.call();
            console.log( deployer );
            assert(deployer, accounts[0], "Deployer address mismatch!")
        });

        it("test 4", async () => {
            let deployer = await ApplicationEntity.deployerAddress.call();
            console.log( deployer );
            assert(deployer, accounts[0], "Deployer address mismatch!")
        });

        it("test 5", async () => {
            let deployer = await ApplicationEntity.deployerAddress.call();
            console.log( deployer );
            assert(deployer, accounts[0], "Deployer address mismatch!")
        });


    });
};