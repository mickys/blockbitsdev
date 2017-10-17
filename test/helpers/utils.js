const web3util  = require('web3-utils');

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

let colors = {
    none:         "\x1B[0m",
    black:        '\x1B[0;30m',
    dark_gray:    '\x1B[1;30m',
    red:          '\x1B[0;31m',
    light_red:    '\x1B[1;31m',
    green:        '\x1B[0;32m',
    light_green:  '\x1B[1;32m',
    orange:       '\x1B[0;33m',
    yellow:       '\x1B[1;33m',
    blue:         '\x1B[0;34m',
    light_blue:   '\x1B[1;34m',
    purple:       '\x1B[0;35m',
    light_purple: '\x1B[1;35m',
    cyan:         '\x1B[0;36m',
    light_cyan:   '\x1B[1;36m',
    light_gray:   '\x1B[0;37m',
    white:        '\x1B[1;37m'
};

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
    },
    colors,
    toLog( what ) {
        console.log(colors.white, what, colors.none);
    }
};
