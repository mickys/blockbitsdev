module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('FundingManager Asset', accounts => {
        let app, assetContract, TestBuildHelper = {};
        let assetName = "FundingManager";

        // test wallets
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];
        let investorWallet6 = accounts[8];
        let investorWallet7 = accounts[9];
        let investorWallet8 = accounts[10];
        let investorWallet9 = accounts[11];
        let investorWallet10 = accounts[12];

        // settings
        let platformWalletAddress = accounts[8];

        let FundingInputDirect, FundingInputMilestone, tx, FundingManager, FundingContract, TokenManager;
        let validation;

        // let FundingBountyTokenPercentage = settings.bylaws["token_bounty_percentage"];
        // let BountySupply = token_settings.supply.div( 100 );
        // BountySupply = BountySupply.mul( FundingBountyTokenPercentage );
        // let soldTokenSupply = token_settings.supply;
        // soldTokenSupply = soldTokenSupply.sub( BountySupply );

        beforeEach(async () => {

            let SnapShotKey = "ApplicationInit";
            if (typeof snapshots[SnapShotKey] !== "undefined" && snapshotsEnabled) {
                // restore snapshot
                await helpers.web3.evm.revert(snapshots[SnapShotKey]);
                // save again because whomever wrote test rpc had the impression no one would ever restore twice.. dafuq
                snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();

            } else {

                TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
                await TestBuildHelper.deployAndInitializeApplication();
                await TestBuildHelper.AddAllAssetSettingsAndLock();

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            TokenManager = await TestBuildHelper.getDeployedByName("TokenManager");
            FundingContract = await TestBuildHelper.getDeployedByName("Funding");

            // funding inputs
            let FundingInputDirectAddress = await FundingContract.DirectInput.call();
            let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);
            FundingManager = await TestBuildHelper.getDeployedByName("FundingManager");

        });

        context('Successful funding - Token distribution', async () => {

            context('Milestone Payments only', async () => {

                it('SoftCap reached in pre-ico, 1 payment, 1 payment in pre-ico, 0 payments in ico', async () => {

                    let fixed_price = settings.funding_periods[0].fixed_tokens;
                    let amount = settings.bylaws["funding_global_soft_cap"];

                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: amount,
                        from: accounts[15]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let contributed = await helpers.utils.getBalance(helpers.artifacts, vaultAddress);

                    let FundingVault = await helpers.getContract("TestFundingVault");
                    let vault = await FundingVault.at(vaultAddress);

                    // validate the contribution setting first.
                    let contributedInContract = await vault.amount_milestone.call();
                    assert.equal(contributed.toString(), contributedInContract.toString(), 'ETH balance validation failed');

                    let soldTokens = new helpers.BigNumber(fixed_price).mul(contributed);

                    let scadaCalcTokens = await vault.getBoughtTokens.call();
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    assert.equal(soldTokens.toString(), scadaCalcTokens.toString(), 'Token SCADA calculation issues');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // validate the tokens were actually minted properly
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance minting issues');

                });



                it('SoftCap reached in ico, 1 payment, 1 account, 0 payments in pre-ico, 1 payment in ico', async () => {

                    let fixed_price = settings.funding_periods[1].fixed_tokens;
                    let amount = settings.bylaws["funding_global_soft_cap"];

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: amount,
                        from: accounts[15]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let contributed = await helpers.utils.getBalance(helpers.artifacts, vaultAddress);

                    let FundingVault = await helpers.getContract("TestFundingVault");
                    let vault = await FundingVault.at(vaultAddress);

                    // validate the contribution setting first.
                    let contributedInContract = await vault.amount_milestone.call();
                    assert.equal(contributed.toString(), contributedInContract.toString(), 'ETH balance validation failed');

                    let soldTokens = new helpers.BigNumber(fixed_price).mul(contributed);

                    let scadaCalcTokens = await vault.getBoughtTokens.call();
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    assert.equal(soldTokens.toString(), scadaCalcTokens.toString(), 'Token SCADA calculation issues');

                    // await TestBuildHelper.displayAllVaultDetails();

                    // validate the tokens were actually minted properly
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance minting issues');

                });



                it('SoftCap reached in pre-ico, 2 payments, 1 account, 1 payment in pre-ico, 1 payment in ico', async () => {

                    let pre_amount = settings.bylaws["funding_global_soft_cap"];
                    let ico_amount = 1 * helpers.solidity.ether;
                    let amount = pre_amount.add(ico_amount);

                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: pre_amount,
                        from: accounts[15]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: ico_amount,
                        from: accounts[15]
                    });


                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let contributed = await helpers.utils.getBalance(helpers.artifacts, vaultAddress);

                    let FundingVault = await helpers.getContract("TestFundingVault");
                    let vault = await FundingVault.at(vaultAddress);

                    // validate the contribution setting first.
                    let contributedInContract = await vault.amount_milestone.call();
                    assert.equal(contributed.toString(), contributedInContract.toString(), 'ETH balance validation failed');
                    assert.equal(amount.toString(), contributedInContract.toString(), 'ETH balance validation failed');

                    let pre_contributed = await vault.stageAmounts.call(1);
                    let ico_contributed = await vault.stageAmounts.call(2);

                    let pre_fixed_price = settings.funding_periods[0].fixed_tokens;
                    let ico_fixed_price = settings.funding_periods[1].fixed_tokens;

                    let pre_Tokens = new helpers.BigNumber(pre_fixed_price).mul(pre_contributed);
                    let ico_Tokens = new helpers.BigNumber(ico_fixed_price).mul(ico_contributed);

                    let soldTokens = pre_Tokens.add(ico_Tokens);

                    let scadaCalcTokens = await vault.getBoughtTokens.call();
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    assert.equal(soldTokens.toString(), scadaCalcTokens.toString(), 'Token SCADA calculation issues');

                    // await TestBuildHelper.displayAllVaultDetails();
                    // validate the tokens were actually minted properly
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance minting issues');

                });

                it('SoftCap reached in ico, 2 payments, 1 account, 1 payment in pre-ico, 1 payment in ico', async () => {

                    let pre_amount = new helpers.BigNumber(1 * helpers.solidity.ether);
                    let ico_amount = settings.bylaws["funding_global_soft_cap"];
                    let amount = pre_amount.add(ico_amount);

                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: pre_amount,
                        from: accounts[15]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: ico_amount,
                        from: accounts[15]
                    });


                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    let vaultAddress = await FundingManager.vaultById.call(1);
                    let contributed = await helpers.utils.getBalance(helpers.artifacts, vaultAddress);

                    let FundingVault = await helpers.getContract("TestFundingVault");
                    let vault = await FundingVault.at(vaultAddress);

                    // validate the contribution setting first.
                    let contributedInContract = await vault.amount_milestone.call();
                    assert.equal(contributed.toString(), contributedInContract.toString(), 'ETH balance validation failed');
                    assert.equal(amount.toString(), contributedInContract.toString(), 'ETH balance validation failed');

                    let pre_contributed = await vault.stageAmounts.call(1);
                    let ico_contributed = await vault.stageAmounts.call(2);

                    let pre_fixed_price = settings.funding_periods[0].fixed_tokens;
                    let ico_fixed_price = settings.funding_periods[1].fixed_tokens;

                    let pre_Tokens = new helpers.BigNumber(pre_fixed_price).mul(pre_contributed);
                    let ico_Tokens = new helpers.BigNumber(ico_fixed_price).mul(ico_contributed);

                    let soldTokens = pre_Tokens.add(ico_Tokens);

                    let scadaCalcTokens = await vault.getBoughtTokens.call();
                    let balance = await TestBuildHelper.getTokenBalance(vaultAddress);
                    assert.equal(soldTokens.toString(), scadaCalcTokens.toString(), 'Token SCADA calculation issues');

                    //await TestBuildHelper.displayAllVaultDetails();
                    // validate the tokens were actually minted properly
                    assert.equal(balance.toString(), soldTokens.toString(), 'Token balance minting issues');

                });



                it('SoftCap reached in pre-ico, 2 payments, 2 accounts, 1 payment in pre-ico (account 1), 1 payment in ico (account 2)', async () => {

                    let pre_amount = settings.bylaws["funding_global_soft_cap"];
                    let ico_amount = new helpers.BigNumber(1 * helpers.solidity.ether);
                    // let amount = pre_amount.add(ico_amount);

                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: pre_amount,
                        from: accounts[16]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: ico_amount,
                        from: accounts[17]
                    });


                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    let pre_fixed_price = settings.funding_periods[0].fixed_tokens;
                    let ico_fixed_price = settings.funding_periods[1].fixed_tokens;

                    let vaultAddress1 = await FundingManager.vaultById.call(1);
                    let vaultAddress2 = await FundingManager.vaultById.call(2);
                    let balance1 = await TestBuildHelper.getTokenBalance(vaultAddress1);
                    let balance2 = await TestBuildHelper.getTokenBalance(vaultAddress2);

                    let vault1Tokens = new helpers.BigNumber(pre_fixed_price).mul(pre_amount);
                    assert.equal(balance1.toString(), vault1Tokens.toString(), 'Token balance validation failed');

                    let vault2Tokens = new helpers.BigNumber(ico_fixed_price).mul(ico_amount);
                    assert.equal(balance2.toString(), vault2Tokens.toString(), 'Token balance validation failed');

                    // await TestBuildHelper.displayAllVaultDetails();
                });


                it('SoftCap reached in ico, 2 payments, 2 accounts, 1 payment in pre-ico (account 1), 1 payment in ico (account 2)', async () => {
                    let pre_amount = new helpers.BigNumber(1 * helpers.solidity.ether);
                    let ico_amount = settings.bylaws["funding_global_soft_cap"];
                    // let amount = pre_amount.add(ico_amount);

                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: pre_amount,
                        from: accounts[16]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: ico_amount,
                        from: accounts[17]
                    });


                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    let pre_fixed_price = settings.funding_periods[0].fixed_tokens;
                    let ico_fixed_price = settings.funding_periods[1].fixed_tokens;

                    let vaultAddress1 = await FundingManager.vaultById.call(1);
                    let vaultAddress2 = await FundingManager.vaultById.call(2);
                    let balance1 = await TestBuildHelper.getTokenBalance(vaultAddress1);
                    let balance2 = await TestBuildHelper.getTokenBalance(vaultAddress2);

                    let vault1Tokens = new helpers.BigNumber(pre_fixed_price).mul(pre_amount);
                    assert.equal(balance1.toString(), vault1Tokens.toString(), 'Token balance validation failed');

                    let vault2Tokens = new helpers.BigNumber(ico_fixed_price).mul(ico_amount);
                    assert.equal(balance2.toString(), vault2Tokens.toString(), 'Token balance validation failed');

                    // await TestBuildHelper.displayAllVaultDetails();
                });


            });



            context('Mixed Direct and Milestone Payments', async () => {

                it('SoftCap reached in pre-ico, 4 payments, 2 accounts, 2 payments in pre-ico (account 1/2), 2 payments in ico (account 1/2)', async () => {

                    let pre_amount = settings.bylaws["funding_global_soft_cap"];
                    let ico_amount = new helpers.BigNumber(1 * helpers.solidity.ether);
                    // let amount = pre_amount.add(ico_amount);

                    let pre_1_amount = new helpers.BigNumber( pre_amount / 2 );
                    let pre_2_amount = pre_1_amount;
                    let ico_1_amount = ico_amount.div(2);
                    let ico_2_amount = ico_amount.div(2);

                    // time travel to pre ico start time
                    tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    await FundingInputDirect.sendTransaction({
                        value: pre_1_amount,
                        from: accounts[15]
                    });

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: pre_2_amount,
                        from: accounts[16]
                    });

                    // time travel to start of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    await FundingInputDirect.sendTransaction({
                        value: ico_1_amount,
                        from: accounts[15]
                    });

                    // insert 1 payment, at soft cap.
                    await FundingInputMilestone.sendTransaction({
                        value: ico_2_amount,
                        from: accounts[16]
                    });

                    // time travel to end of ICO, and change states
                    tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                    await TestBuildHelper.doApplicationStateChanges("", false);

                    validation = await TestBuildHelper.ValidateAssetState(
                        assetName,
                        helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                        helpers.utils.getEntityStateIdByName(assetName, "NONE").toString()
                    );
                    assert.isTrue(validation, 'State validation failed..');

                    let pre_fixed_price = settings.funding_periods[0].fixed_tokens;
                    let ico_fixed_price = settings.funding_periods[1].fixed_tokens;

                    // let vaultAddress1 = await FundingManager.vaultById.call(1);
                    let vaultAddress2 = await FundingManager.vaultById.call(2);

                    // check wallet balance.. since user chose direct funding.
                    let balance1 = await TestBuildHelper.getTokenBalance(accounts[15]);
                    let balance2 = await TestBuildHelper.getTokenBalance(vaultAddress2);

                    let vault1Tokens = new helpers.BigNumber(pre_fixed_price).mul(pre_1_amount);
                    vault1Tokens = vault1Tokens.add( new helpers.BigNumber(ico_fixed_price).mul(ico_1_amount) );

                    assert.equal(balance1.toString(), vault1Tokens.toString(), 'Token balance validation failed');

                    let vault2Tokens = new helpers.BigNumber(pre_fixed_price).mul(pre_2_amount);
                    vault2Tokens = vault2Tokens.add( new helpers.BigNumber(ico_fixed_price).mul(ico_2_amount) );

                    assert.equal(balance2.toString(), vault2Tokens.toString(), 'Token balance validation failed');

                    // await TestBuildHelper.displayAllVaultDetails();
                });
            });

        });

        context('misc for extra coverage', async () => {
            let tx;

            it('should run doStateChanges even if no changes are required', async () => {
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("", false);
            });

        });

    });
};

