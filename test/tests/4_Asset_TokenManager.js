module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    contract('TokenManager Asset', accounts => {
        let assetContract, FundingContract, tx, TestBuildHelper = {};
        let assetName = "TokenManager";

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts);
            assetContract = await TestBuildHelper.deployAndInitializeAsset( assetName, ["Funding"] );
            FundingContract = await TestBuildHelper.getDeployedByName("Funding");
        });

        context("addTokenSettingsAndInit()", async () => {

            it('properly sets up the tokens if initialized', async () => {

                tx = await assetContract.addTokenSettingsAndInit(
                    token_settings.supply,
                    token_settings.decimals,
                    token_settings.name,
                    token_settings.symbol,
                    token_settings.version
                );

                let TokenEntityContractAddress = await assetContract.TokenEntity.call()
                assert.isAddress(TokenEntityContractAddress, 'TokenEntity is not an address.');

                let TokenEntityContract = await helpers.getContract("TestToken").at(TokenEntityContractAddress);
                assert.equal(await TokenEntityContract.name.call(), token_settings.name, 'Deployed Token contract name mismatch!')
            });

            it('properly sets up the Token SCADA', async () => {
                await assetContract.addTokenSettingsAndInit(
                    token_settings.supply,
                    token_settings.decimals,
                    token_settings.name,
                    token_settings.symbol,
                    token_settings.version
                );
                let FundingAddress = await assetContract.getApplicationAssetAddressByName.call('Funding');
                assert.equal(FundingAddress, FundingContract.address, 'FundingAddress does not match.');

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.applyAndLockSettings(),
                    'EventRunBeforeApplyingSettings(bytes32)'
                );
                assert.equal(eventFilter.length, 1, 'EventRunBeforeApplyingSettings event not received.');
            });
        });

        context("getTokenSCADARequiresHardCap()", async () => {

            beforeEach(async () => {
                await TestBuildHelper.AddAssetSettingsAndLock(assetName);
            });

            it('returns boolean value stored in SCADA Contract', async () => {

                let TokenSCADAEntityAddress = await assetContract.TokenSCADAEntity.call();
                let TokenSCADAEntityContract = await helpers.getContract("TestTokenSCADA1Market").at(TokenSCADAEntityAddress);

                let ContractVal = await TokenSCADAEntityContract.SCADA_requires_hard_cap.call();
                let MethodVal = await assetContract.getTokenSCADARequiresHardCap.call();

                assert.equal(ContractVal, MethodVal, 'SCADA_requires_hard_cap mismatch!');
            });
        });
    });
};