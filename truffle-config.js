require('babel-register');
require('babel-polyfill');

let developmentProvider, ropstenProvider, rinkebyProvider = {};

if (!process.env.SOLIDITY_COVERAGE) {
    developmentProvider = require('ethereumjs-testrpc').provider({gasLimit: 1e8, network_id: 15})
}

let HDWalletProvider = require('truffle-hdwallet-provider');
const mnemonic = 'lunch release trick fluid omit about fatigue suffer dentist minute cube want';
const addr = '0x4b70518d879a4e2da4ad9cf0189b32d8dc6b7a9b';

//if (process.env.LIVE_NETWORKS) {
ropstenProvider = new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/')
rinkebyProvider = new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io/c5GRJ5dejitOp13GXgu3')
//}

module.exports = {
    synchronization_timeout: 3600000,
    networks: {
        development: {
            network_id: 15,
            provider: developmentProvider,
            gas: 4.6e6, // 9e6,
            // gasPrice: 1000000000 // 1 gwei
            gasPrice: 100000000 // 0.1 gwei
        },
        rpc: {
            network_id: 15,
            host: 'localhost',
            port: 8545,
            // gas: 4.7e6,
            // gas: 6.7e6, < max @ nov 29 2017
            gas: 6.1e6,
            // gasPrice: 20000000000, // 0.1 gwei -> 100 mil wei
            gasPrice: 1010000000, // 0.1 gwei -> 100 mil wei
            // gasPrice: 100000000 // 0.1 gwei -> 100 mil wei
        },
        ropsten: {
            network_id: 3,
            provider: ropstenProvider,
            // gas: 4.712e6,
            gas: 6.1e6,
            gasPrice: 100000000 // 0.1 gwei -> 100 mil wei
        },
        rinkeby: {
            synchronization_timeout: 3600000,
            from: addr,
            provider: rinkebyProvider,
            // from: addr,
            network_id: 4,
            gas: 6.7e6,
            gasPrice: 100000000000, // 100 gwei -> 100000 mil wei
            // gasPrice: 100000000, // 0.1 gwei -> 100 mil wei
            // gasPrice: 4000000000, // 0.1 gwei -> 100 mil wei
            // gasPrice: 20000000000, // 0.1 gwei -> 100 mil wei
        },
        coverage: {
            host: "localhost",
            network_id: "*",
            port: 8555,
            gas: 0xffffffffff,
            gasPrice: 0x01
        },
    },
    build: {},
};
