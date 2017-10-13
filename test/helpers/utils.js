const web3util  = require('web3-utils');

module.exports = {

    hasEvent(tx, eventNamePlusReturn) {
        let eventSig = web3util.sha3(eventNamePlusReturn);
        return tx.receipt.logs.filter(x => x.topics[0] === eventSig);
    },
    getEventArgs(tx) {
        // tx.receipt.logs[0].topics[2];
    },
    getProposalRequestId(receipt) {
        return web3util.toDecimal( receipt[0].topics[2] );
    }

};
