
module.exports = async (setup) => {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;



    // await showAccountBalances(helpers, helpers.web3helpers.getAccounts(web3));
    await web3.eth.getAccounts( async (err, accs) => {
        await showAccountBalances(helpers, accs)
    });

};
let logPre = "      ";
async function showAccountBalances(helpers, accounts) {

    helpers.utils.toLog(logPre + "TestRPC Balances: ");
    for (let i = 0; i < 10; i++) {
        let balance = await helpers.utils.getBalance(helpers.artifacts, accounts[i]);
        helpers.utils.toLog(
            logPre +
            "["+i+"] "+accounts[i]+ ": "+ helpers.web3util.fromWei(balance, "ether")
        );
    }

}


