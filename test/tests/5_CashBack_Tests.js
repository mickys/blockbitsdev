module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('CashBack Scenario Testing', accounts => {
        let tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingAsset, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, validation = {};

        let platformWalletAddress = accounts[19];

        let wallet1 = accounts[10];
        let wallet2 = accounts[11];
        let wallet3 = accounts[12];
        let wallet4 = accounts[13];
        let wallet5 = accounts[14];


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
                let FundingContract = await TestBuildHelper.getDeployedByName("Funding");

                // funding inputs
                let FundingInputDirectAddress = await FundingContract.DirectInput.call();
                let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();
                let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
                let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');
                FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
                FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

                // time travel to pre ico start time
                await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After PRE ICO START", false);

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
            ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");
            FundingAsset = await TestBuildHelper.getDeployedByName("Funding");
            FundingManagerAsset = await TestBuildHelper.getDeployedByName("FundingManager");
            TokenManagerAsset = await TestBuildHelper.getDeployedByName("TokenManager");

            let TokenEntityAddress = await TokenManagerAsset.TokenEntity.call();
            let TokenEntityContract = await helpers.getContract("TestToken");
            TokenEntity = await TokenEntityContract.at(TokenEntityAddress);
        });

        // await helpers.utils.displayCashBackStatus(helpers, TestBuildHelper, investor1wallet);

        context("Platform Funding Failed - Cashback Type 1", async () => {

            let investor1wallet = wallet1;
            let investor1amount = 1 * helpers.solidity.ether;
            let investor2wallet = wallet2;
            let investor2amount = 1 * helpers.solidity.ether;

            beforeEach(async () => {
                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

            });

            it("Funding Vaults allow all investors to CashBack", async () => {

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be able true");

                vault = await TestBuildHelper.getMyVaultAddress(investor2wallet);
                canCashBack = await vault.canCashBack.call();
                checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be able true");
            });

            it("throws if CashBack is requested by other address than vault owner (investor)", async () => {
                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be true");

                return helpers.assertInvalidOpcode(async () => {
                    await vault.ReleaseFundsToInvestor({from: accounts[0]})
                });
            });

            it("Requesting CashBack transfers all locked ether back to the investor, validates balances and gas usage", async () => {

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);

                // since the investor calls this, we need to take GasUsage into account.
                let tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
                let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
                let gasPrice = await helpers.utils.getGasPrice(helpers);
                let gasDifference = gasUsed.mul(gasPrice);

                // validate investor ether balances
                let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceInitialPlusContributed = EtherBalanceInitial.add(investor1amount);
                // sub used gas from initial
                EtherBalanceInitialPlusContributed = EtherBalanceInitialPlusContributed.sub(gasDifference);
                assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
            });
        });

        context("Platform Funding Successful - Cashback Type 2 - Owner Missing in Action Cashback", async () => {

            let investor1wallet = wallet1;
            let investor1amount = 10000 * helpers.solidity.ether;
            let investor2wallet = wallet2;
            let investor2amount = 10000 * helpers.solidity.ether;
            let investor3wallet = wallet3;
            let investor3amount = 10000 * helpers.solidity.ether;
            let investor4wallet = wallet4;
            let investor4amount = 10000 * helpers.solidity.ether;

            let end_time, start_time;

            beforeEach(async () => {
                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: investor3amount,
                    from: investor3wallet
                });

                await FundingInputMilestone.sendTransaction({
                    value: investor4amount,
                    from: investor4wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

                // time travel to development start
                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call(MilestoneId);
                start_time = settings.bylaws["development_start"] + 1;
                // let start_time = MilestoneRecord[6];
                end_time = MilestoneRecord[6];

            });


            it("Funding Vaults allow all investors to CashBack", async () => {

                tx = await TestBuildHelper.timeTravelTo(end_time);
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkOwnerFailedToSetTimeOnMeeting  = await vault.checkOwnerFailedToSetTimeOnMeeting.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkOwnerFailedToSetTimeOnMeeting, "checkOwnerFailedToSetTimeOnMeeting should be able true");

                // vault 2 used direct funding, so balances should be empty, but since we want to allow people to retrieve
                // black hole ether sent to vaults, we allow cashback
                vault = await TestBuildHelper.getMyVaultAddress(investor2wallet);
                canCashBack = await vault.canCashBack.call();
                checkOwnerFailedToSetTimeOnMeeting = await vault.checkOwnerFailedToSetTimeOnMeeting.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkOwnerFailedToSetTimeOnMeeting, "checkOwnerFailedToSetTimeOnMeeting should be able true");
            });


            it("MIA @ Milestone 1 - Requesting CashBack transfers all locked ether back to the investor, and locked tokens to platform owner, validates balances and gas usage", async () => {

                await TestBuildHelper.timeTravelTo(end_time);
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);

                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

                // since the investor calls this, we need to take GasUsage into account.
                let tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
                let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
                let gasPrice = await helpers.utils.getGasPrice(helpers);
                let gasDifference = gasUsed.mul(gasPrice);

                // validate investor ether balances
                let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceInitialPlusContributed = EtherBalanceInitial.add(investor1amount);
                // sub used gas from initial
                EtherBalanceInitialPlusContributed = EtherBalanceInitialPlusContributed.sub(gasDifference);
                assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

                // validate Funding Manager Locked Token value
                let FMLockedTokensAfter = await FundingManagerAsset.LockedVotingTokens.call();
                let FMLockedTokensValidate = await FMLockedTokensAfter.add(vaultTokenBalanceInitial);
                assert.equal(FMLockedTokensInitial.toString(), FMLockedTokensValidate.toString(), "Funding Manager Locked Token value does not match");

                // validate platform owner wallet new token balances
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");
            });


            it("MIA @ Milestone 3 - CashBack transfers all locked ether back to the investor, and locked tokens to platform owner, validates balances and gas usage", async () => {

                let ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                for(let i = 1; i <= 3; i++ ) {

                    let MilestoneId = await MilestonesAsset.currentRecord.call();
                    let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );


                    // time travel to start of milestone

                    let start_time;
                    if (i === 1) {
                        start_time = settings.bylaws["development_start"] + 1;
                    } else {
                        start_time = MilestoneRecord[4].add(1);
                    }
                    await TestBuildHelper.timeTravelTo(start_time);

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    await TestBuildHelper.doApplicationStateChanges("RegisterVote", false);
                    // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);
                }

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                await TestBuildHelper.timeTravelTo( MilestoneRecord[6] );
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);


                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

                // since the investor calls this, we need to take GasUsage into account.
                tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
                let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
                let gasPrice = await helpers.utils.getGasPrice(helpers);
                let gasDifference = gasUsed.mul(gasPrice);

                // validate investor ether balances
                let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceInitialPlusLeft = EtherBalanceInitial.add(EtherBalanceLeft);
                // sub used gas from initial
                EtherBalanceInitialPlusLeft = EtherBalanceInitialPlusLeft.sub(gasDifference);

                assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusLeft.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

                // validate Funding Manager Locked Token value
                let FMLockedTokensAfter = await FundingManagerAsset.LockedVotingTokens.call();
                let FMLockedTokensValidate = await FMLockedTokensAfter.add(vaultTokenBalanceInitial);
                assert.equal(FMLockedTokensInitial.toString(), FMLockedTokensValidate.toString(), "Funding Manager Locked Token value does not match");

                // validate platform owner wallet new token balances
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");
            });


            it("MIA @ Milestone LAST - CashBack transfers all locked ether back to the investor, and locked tokens to platform owner, validates balances and gas usage", async () => {

                let ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                for(let i = 1; i < MilestoneNum.toNumber(); i++ ) {

                    let MilestoneId = await MilestonesAsset.currentRecord.call();
                    let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );


                    // time travel to start of milestone

                    let start_time;
                    if (i === 1) {
                        start_time = settings.bylaws["development_start"] + 1;
                    } else {
                        start_time = MilestoneRecord[4].add(1);
                    }
                    await TestBuildHelper.timeTravelTo(start_time);

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    await TestBuildHelper.doApplicationStateChanges("RegisterVote", false);
                    // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);
                }

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 5, "MilestoneId should be 5");

                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                await TestBuildHelper.timeTravelTo( MilestoneRecord[6] );
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);


                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

                // since the investor calls this, we need to take GasUsage into account.
                tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
                let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
                let gasPrice = await helpers.utils.getGasPrice(helpers);
                let gasDifference = gasUsed.mul(gasPrice);

                // validate investor ether balances
                let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceInitialPlusLeft = EtherBalanceInitial.add(EtherBalanceLeft);
                // sub used gas from initial
                EtherBalanceInitialPlusLeft = EtherBalanceInitialPlusLeft.sub(gasDifference);
                assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusLeft.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

                // validate Funding Manager Locked Token value
                let FMLockedTokensAfter = await FundingManagerAsset.LockedVotingTokens.call();
                let FMLockedTokensValidate = await FMLockedTokensAfter.add(vaultTokenBalanceInitial);
                assert.equal(FMLockedTokensInitial.toString(), FMLockedTokensValidate.toString(), "Funding Manager Locked Token value does not match");

                // validate platform owner wallet new token balances
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");
            });

        });


        // cashback at funding failed
        // cashback at mia milestone 1
        // cashback at mia milestone 3
        // cashback at mia milestone last
        // cashback at vote no milestone 1
        // cashback at vote no milestone 2
        // cashback at vote no milestone last





        context("Platform Funding Successful - Cashback Type 3 - Milestone Release", async () => {

            let investor1wallet = wallet1;
            let investor1amount = 10000 * helpers.solidity.ether;
            let investor2wallet = wallet2;
            let investor2amount = 10000 * helpers.solidity.ether;
            let investor3wallet = wallet3;
            let investor3amount = 10000 * helpers.solidity.ether;
            let investor4wallet = wallet4;
            let investor4amount = 10000 * helpers.solidity.ether;

            let end_time, start_time;

            beforeEach(async () => {
                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: investor3amount,
                    from: investor3wallet
                });

                await FundingInputMilestone.sendTransaction({
                    value: investor4amount,
                    from: investor4wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

                // time travel to development start
                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call(MilestoneId);
                start_time = settings.bylaws["development_start"] + 1;
                // let start_time = MilestoneRecord[6];
                end_time = MilestoneRecord[6];

            });


            it("Proposal processed. Funding Vault allows the investor to CashBack if majority voted NO and investor also voted NO", async () => {

                tx = await TestBuildHelper.timeTravelTo(end_time);
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkOwnerFailedToSetTimeOnMeeting  = await vault.checkOwnerFailedToSetTimeOnMeeting.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkOwnerFailedToSetTimeOnMeeting, "checkOwnerFailedToSetTimeOnMeeting should be able true");

                // vault 2 used direct funding, so balances should be empty, but since we want to allow people to retrieve
                // black hole ether sent to vaults, we allow cashback
                vault = await TestBuildHelper.getMyVaultAddress(investor2wallet);
                canCashBack = await vault.canCashBack.call();
                checkOwnerFailedToSetTimeOnMeeting = await vault.checkOwnerFailedToSetTimeOnMeeting.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkOwnerFailedToSetTimeOnMeeting, "checkOwnerFailedToSetTimeOnMeeting should be able true");
            });


            it("Proposal processed. Investor uses CashBack, validate balances", async () => {

                let usedWallet = wallet1;


                // save initial balances
                let platformOwnerTokenBalance = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformOwnerEtherBalance = await helpers.utils.getBalance(helpers.artifacts, platformWalletAddress);
                let walletTokenBalance = await TestBuildHelper.getTokenBalance(usedWallet);
                let walletEtherBalance = await helpers.utils.getBalance(helpers.artifacts, usedWallet);

                // time travel to development start
                let start_time = settings.bylaws["development_start"] + 1;
                await TestBuildHelper.timeTravelTo( start_time );

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );

                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                await TestBuildHelper.doApplicationStateChanges("set meeting time", false);

                // time travel after meeting time
                let tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);

                // Milestone Release Proposal should exist here
                let ProposalId = 1;
                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                // vote no
                tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: wallet1});

                await TestBuildHelper.doApplicationStateChanges("RegisterVote", false);

                let vault = await TestBuildHelper.getMyVaultAddress(wallet1);

                tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});

                let canCashBack = await vault.canCashBack.call();
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();
                let checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                let checkOwnerFailedToSetTimeOnMeeting = await vault.checkOwnerFailedToSetTimeOnMeeting.call();
                /*
                console.log("canCashBack: ", canCashBack.toString());
                console.log("checkFundingStateFailed: ", checkFundingStateFailed.toString());
                console.log("checkMilestoneStateInvestorVotedNoVotingEndedNo: ", checkMilestoneStateInvestorVotedNoVotingEndedNo.toString());
                console.log("checkOwnerFailedToSetTimeOnMeeting: ", checkOwnerFailedToSetTimeOnMeeting.toString());
                console.log("");
                */
                let getMyVoteForCurrentMilestoneRelease = await ProposalsAsset.getMyVoteForCurrentMilestoneRelease.call( wallet1 );

                /*
                console.log("getMyVoteForCurrentMilestoneRelease: ", getMyVoteForCurrentMilestoneRelease.toString());

                let currentRecord = await MilestonesAsset.currentRecord.call();
                let actionType = await ProposalsAsset.getActionType.call( "MILESTONE_DEADLINE" );
                let hash = await ProposalsAsset.getHash( actionType, currentRecord, 0 );
                let proposalId = await ProposalsAsset.ProposalIdByHash.call(hash);
                let getMyVote = await ProposalsAsset.getMyVote.call(proposalId, wallet1);

                console.log("currentRecord: ", currentRecord.toString());
                console.log("actionType: ", actionType.toString());
                console.log("hash: ", hash.toString());
                console.log("proposalId: ", proposalId.toString());
                console.log("getMyVote: ", getMyVote.toString());


                let vault4 = await TestBuildHelper.getMyVaultAddress(wallet4);
                canCashBack = await vault4.canCashBack.call();
                checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault4.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                console.log("vault4");
                console.log("canCashBack: ", canCashBack.toString());
                console.log("checkMilestoneStateInvestorVotedNoVotingEndedNo: ", checkMilestoneStateInvestorVotedNoVotingEndedNo.toString());
                */

            });

        });



        /*
        it("Development started, processes all milestones, and after last one sets application into DEVELOPMENT_COMPLETE state, validates balances each step", async () => {

            let ProposalId = 0;
            let MilestoneNum = await MilestonesAsset.RecordNum.call();

            for(let i = 1; i <= MilestoneNum.toNumber(); i++ ) {

                // >>> initial values
                // save platformWalletAddress initial balances
                let tokenBalance = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let etherBalance = await helpers.utils.getBalance(helpers.artifacts, platformWalletAddress);
                // total funding ether
                let MilestoneAmountRaised = await FundingAsset.MilestoneAmountRaised.call();
                // first milestone percent
                let EmergencyAmount = MilestoneAmountRaised.div(100);
                EmergencyAmount = EmergencyAmount.mul(settings.bylaws["emergency_fund_percentage"]);
                let MilestoneAmountLeft = MilestoneAmountRaised.sub(EmergencyAmount);
                let MilestoneActualAmount = MilestoneAmountLeft.div(100);
                MilestoneActualAmount = MilestoneActualAmount.mul(settings.milestones[(i-1)].funding_percentage);


                // save wallet1 state so we can validate after
                let walletTokenBalance = await TestBuildHelper.getTokenBalance(wallet1);
                let currentRecordId = await MilestonesAsset.currentRecord.call();
                // <<<

                // time travel to start of milestone
                let start_time;
                if(i === 1) {
                    start_time = settings.bylaws["development_start"] + 1;
                } else {
                    let MilestoneRecord = await MilestonesAsset.Collection.call(currentRecordId);
                    start_time = MilestoneRecord[4].add(1);
                }

                await TestBuildHelper.timeTravelTo( start_time );

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);

                await TestBuildHelper.doApplicationStateChanges("set meeting time", false);

                // console.log( await helpers.utils.showAllStates(helpers, TestBuildHelper));

                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);

                await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);

                // Milestone Release Proposal should exist here
                // increment proposal id
                ProposalId++;
                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                // vote yes
                tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: wallet1});

                await TestBuildHelper.doApplicationStateChanges("RegisterVote", false);

                // >>> new values, validation
                let etherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, platformWalletAddress);

                if(i === MilestoneNum.toNumber()) {

                    // Validate Ending Ether Balances - Owner
                    let MilestoneAmountRaised = await FundingAsset.MilestoneAmountRaised.call();
                    let EmergencyAmount = MilestoneAmountRaised.div(100);
                    EmergencyAmount = EmergencyAmount.mul(settings.bylaws["emergency_fund_percentage"]);
                    let initialPlusMilestoneAndEmergency = etherBalance.add(EmergencyAmount);
                    initialPlusMilestoneAndEmergency = initialPlusMilestoneAndEmergency.add(MilestoneActualAmount);
                    assert.equal(etherBalanceAfter.toString(), initialPlusMilestoneAndEmergency.toString(), "etherBalanceAfter should match initialPlusMilestoneAndEmergency ");

                    // Validate Ending Token Balances - Owner
                    let tokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                    let perc = settings.bylaws["token_sale_percentage"];
                    let supply = settings.token.supply;
                    let saleTotal = supply.mul( perc );
                    saleTotal = saleTotal.div( 100 );
                    let ownerSupply = new helpers.BigNumber(supply);
                    ownerSupply = ownerSupply.sub( saleTotal );
                    assert.equal(ownerSupply.toString(), tokenBalanceAfter.toString(), "tokenBalances should match");

                    // Validate Ending Token Balances - Investor
                    let walletTokenBalanceAfter = await TestBuildHelper.getTokenBalance(wallet1);
                    let vault = await TestBuildHelper.getMyVaultAddress(wallet1);
                    let vaultReleaseTokenMilestoneBalance = await vault.tokenBalances.call( MilestoneNum.toNumber() );
                    let vaultReleaseTokenEmergencyBalance = await vault.tokenBalances.call( 0 );
                    let walletInitialPlusMilestoneAndEmergency = walletTokenBalance.add(vaultReleaseTokenMilestoneBalance);
                    walletInitialPlusMilestoneAndEmergency = walletInitialPlusMilestoneAndEmergency.add(vaultReleaseTokenEmergencyBalance);
                    assert.equal(walletTokenBalanceAfter.toString(), walletInitialPlusMilestoneAndEmergency.toString(), "walletTokenBalanceAfter should match walletInitialPlusMilestoneAndEmergency ");

                } else {

                    let initialPlusMilestone = etherBalance.add(MilestoneActualAmount);
                    assert.equal(etherBalanceAfter.toString(), initialPlusMilestone.toString(), "etherBalanceAfter should match initialPlusMilestone ");

                    let currentRecordIdCheck = currentRecordId.add(1);
                    let currentRecordIdAfter = await MilestonesAsset.currentRecord.call();
                    assert.equal(currentRecordIdCheck.toString(), currentRecordIdAfter.toString(), "currentRecordIdAfter should match currentRecordId + 1 ");

                    let walletTokenBalanceAfter = await TestBuildHelper.getTokenBalance(wallet1);
                    let vault = await TestBuildHelper.getMyVaultAddress(wallet1);
                    let vaultReleaseTokenBalance = await vault.tokenBalances.call( currentRecordIdAfter );
                    let walletInitialPlusMilestone = walletTokenBalance.add(vaultReleaseTokenBalance);
                    assert.equal(walletTokenBalanceAfter.toString(), walletInitialPlusMilestone.toString(), "walletTokenBalanceAfter should match walletInitialPlusMilestone ");

                }
                // <<<
            }

            // end, coverage
            tx = await ApplicationEntity.doStateChanges();

        });
        */

    });

};