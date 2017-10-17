module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;



    contract('Funding Asset', accounts => {
        let app, assetContract = {};
        let assetName = "Funding";

        // solidity calc helpers
        let ether = 1000000000000000000;
        let days = 3600 * 24;
        let now = parseInt(( Date.now() / 1000 ).toFixed());

        // settings
        let AmountCapSoft = 1000 * ether;
        let AmountCapHard = 3000 * ether;
        let Funding_Setting_funding_time_start = now + 1 * days;
        let Funding_Setting_pre_ico_duration = 7 * days;
        let Funding_Setting_pre_ico_cooldown_duration = 14 * days;
        let Funding_Setting_ico_duration = 30 * days;
        let Funding_Setting_cashback_duration = 90 * days;


        beforeEach(async () => {
            now = Date.now() / 1000;
            app = await contracts.ApplicationEntity.new();
            assetContract = await helpers.getContract("Test" + assetName).new();
        });

        context("addSettings()", async () => {
            beforeEach(async () => {

            });

            it('sets correct properties', async () => {

                await assetContract.addSettings(
                    AmountCapSoft,
                    AmountCapHard,
                    Funding_Setting_funding_time_start,
                    Funding_Setting_pre_ico_duration,
                    Funding_Setting_pre_ico_cooldown_duration,
                    Funding_Setting_ico_duration,
                    Funding_Setting_cashback_duration
                );

                assert.equal(await assetContract.AmountCapSoft.call(), AmountCapSoft, 'AmountCapSoft different');
                assert.equal(await assetContract.AmountCapHard.call(), AmountCapHard, 'AmountCapHard different');
                assert.equal(
                    await assetContract.Funding_Setting_funding_time_start.call(),
                    Funding_Setting_funding_time_start,
                    'Funding_Setting_funding_time_start different'
                );
                assert.equal(
                    await assetContract.Funding_Setting_pre_ico_duration.call(),
                    Funding_Setting_pre_ico_duration,
                    'Funding_Setting_pre_ico_duration different'
                );
                assert.equal(
                    await assetContract.Funding_Setting_pre_ico_cooldown_duration.call(),
                    Funding_Setting_pre_ico_cooldown_duration,
                    'Funding_Setting_pre_ico_cooldown_duration different'
                );
                assert.equal(
                    await assetContract.Funding_Setting_ico_duration.call(),
                    Funding_Setting_ico_duration,
                    'Funding_Setting_ico_duration different'
                );
                assert.equal(
                    await assetContract.Funding_Setting_cashback_duration.call(),
                    Funding_Setting_cashback_duration,
                    'Funding_Setting_cashback_duration different'
                );

                await showDebug(helpers, assetContract);

            });

        });



        /*
        it('initializes properly', async () => {
            await assetContract.setInitialOwnerAndName(assetName);


            return helpers.assertInvalidOpcode(async () => {
                await assetContract.setInitialOwnerAndName(assetName);
            });
        });

        it('throws if already owned', async () => {
            await assetContract.setInitialOwnerAndName(assetName);
            return helpers.assertInvalidOpcode(async () => {
                await assetContract.setInitialOwnerAndName(assetName);
            });
        });
        */


        /*
        context("setInitialOwnerAndName()", async () => {
            beforeEach(async () => {

            });

            it('works if linking an asset for the first time', async () => {
                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.setInitialOwnerAndName(assetName),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
                assert.equal(await assetContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]')
            });


        });

        */
    });
};

async function showDebug(helpers, assetContract) {

    let logPre = "      ";

    helpers.utils.toLog("\n"+logPre+"Debug Settings: ");

    let AmountRaised = await assetContract.AmountRaised.call();
    let AmountCapSoft = await assetContract.AmountCapSoft.call();
    let AmountCapHard = await assetContract.AmountCapHard.call();
    let Funding_Setting_funding_time_start = await assetContract.Funding_Setting_funding_time_start.call();
    let Funding_Setting_pre_ico_duration = await assetContract.Funding_Setting_pre_ico_duration.call();
    let Funding_Setting_pre_ico_cooldown_duration = await assetContract.Funding_Setting_pre_ico_cooldown_duration.call();
    let Funding_Setting_ico_duration = await assetContract.Funding_Setting_ico_duration.call();
    let Funding_Setting_cashback_duration = await assetContract.Funding_Setting_cashback_duration.call();

    helpers.utils.toLog(logPre+"AmountRaised ether:   "  + helpers.web3util.fromWei( AmountRaised, "ether" ));
    helpers.utils.toLog(logPre+"AmountCapSoft ether:  " + helpers.web3util.fromWei( AmountCapSoft, "ether" ));
    helpers.utils.toLog(logPre+"AmountCapHard ether:  " + helpers.web3util.fromWei( AmountCapHard, "ether" ));

    helpers.utils.toLog(logPre+"PRE ICO Duration:   " + Funding_Setting_pre_ico_duration.toString());
    helpers.utils.toLog(logPre+"PRE ICO cooldown:  " + Funding_Setting_pre_ico_cooldown_duration.toString());
    helpers.utils.toLog(logPre+"ICO Duration:      " + Funding_Setting_ico_duration.toString());
    helpers.utils.toLog(logPre+"CashBack Duration: " + Funding_Setting_cashback_duration.toString());

    helpers.utils.toLog(
        logPre+"-----------------------------------------------------------"
    );

    helpers.utils.toLog(
        logPre+"PRE ICO Start DATE:  " + toDate(Funding_Setting_funding_time_start)
    );
    helpers.utils.toLog(
        logPre+"PRE ICO END DATE:    " +
        toDate(
            parseInt(Funding_Setting_funding_time_start) +
            parseInt(Funding_Setting_pre_ico_duration)
        )
    );

    helpers.utils.toLog(
        logPre+"ICO START DATE:      " +
        toDate(
            parseInt(Funding_Setting_funding_time_start) +
            parseInt(Funding_Setting_pre_ico_duration) +
            parseInt(Funding_Setting_pre_ico_cooldown_duration)
        )
    );

    helpers.utils.toLog(
        logPre+"ICO END DATE:        " +
        toDate(
            parseInt(Funding_Setting_funding_time_start) +
            parseInt(Funding_Setting_pre_ico_duration) +
            parseInt(Funding_Setting_pre_ico_cooldown_duration)+
            parseInt(Funding_Setting_ico_duration)
        )
    );

    helpers.utils.toLog(
        logPre+"CashBack Start DATE: " +
        toDate(
            parseInt(Funding_Setting_funding_time_start) +
            parseInt(Funding_Setting_pre_ico_duration) +
            parseInt(Funding_Setting_pre_ico_cooldown_duration)+
            parseInt(Funding_Setting_ico_duration)
        )
    );

    helpers.utils.toLog(
        logPre+"CashBack END DATE:   " +
        helpers.dateFormat(
            parseInt(Funding_Setting_funding_time_start) +
            parseInt(Funding_Setting_pre_ico_duration) +
            parseInt(Funding_Setting_pre_ico_cooldown_duration)+
            parseInt(Funding_Setting_ico_duration)+
            parseInt(Funding_Setting_cashback_duration)
            , getDateFormat()
        )
    );

    helpers.utils.toLog("");

}

function getDateFormat() {
    return "yyyy-mm-dd, HH:MM:ss TT"
}

function toDate(seconds) {
    let d = new Date( parseInt(seconds) * 1000);

    return d.getFullYear() + "-" +
        ("0"+(d.getMonth()+1)).slice(-2) + "-" +
        ("0" + d.getDate()).slice(-2) + " " +
        ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);


}