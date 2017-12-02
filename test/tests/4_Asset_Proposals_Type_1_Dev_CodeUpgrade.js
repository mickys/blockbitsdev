module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Type 1 - IN_DEVELOPMENT_CODE_UPGRADE', accounts => {
        let tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, validation = {};

        let assetName = "Proposals";
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

                await FundingInputMilestone.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: wallet1
                });

                await FundingInputDirect.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: wallet2
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: wallet3
                });

                await FundingInputMilestone.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: wallet4
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

                // time travel to development start
                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");
                beforeProposalRequiredStateChanges = await ProposalsAsset.hasRequiredStateChanges.call();

                // init a new app contract and create upgrade proposal
                // @TODO replace this by a proper application, and make use of the gateway interface, to test the whole
                // @TODO thing with voting as well
                ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
                let app = await contracts.ApplicationEntity.new();
                let eventFilter = helpers.utils.hasEvent(
                    await ApplicationEntity.callTestAddCodeUpgradeProposal(await app.address, "url"),
                    'EventNewProposalCreated(bytes32,uint256)'
                );
                assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');


                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
            ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");
            FundingManagerAsset = await TestBuildHelper.getDeployedByName("FundingManager");
            TokenManagerAsset = await TestBuildHelper.getDeployedByName("TokenManager");

            let TokenEntityAddress = await TokenManagerAsset.TokenEntity.call();
            let TokenEntityContract = await helpers.getContract("TestToken");
            TokenEntity = await TokenEntityContract.at(TokenEntityAddress);
        });



        it( "current proposal matches IN_DEVELOPMENT_CODE_UPGRADE settings", async () => {

            let RecordNum = await ProposalsAsset.RecordNum.call();
            assert.equal(RecordNum, 1, 'RecordNum does not match');

            let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            assert.equal(
                ProposalRecord[2].toString(),
                helpers.utils.getActionIdByName("Proposals", "IN_DEVELOPMENT_CODE_UPGRADE").toString(),
                'Proposal record type does not match'
            );

            assert.equal(
                 ProposalRecord[3].toString(),
                 helpers.utils.getRecordStateIdByName("Proposals", "ACCEPTING_VOTES").toString(),
                 'Proposal record type does not match'
            );

            let ResultRecord = await ProposalsAsset.ResultsByProposalId.call(1);

            // IN_DEVELOPMENT_CODE_UPGRADE is only voted by "locked" tokens
            assert(ResultRecord[5].toString(), "false", "Vote Recounting is not false.");

        });

        /*
        context("Voting", async () => {

            it( "placing a vote ", async () => {

                let ProposalId = 1;

                let ActiveProposalNum = await ProposalsAsset.ActiveProposalNum.call();
                let ActiveProposalId = await ProposalsAsset.ActiveProposalIds.call( ProposalId - 1 );
                console.log("ActiveProposalNum:", ActiveProposalNum.toString());
                console.log("ActiveProposalId: ", ActiveProposalId.toString());


                await TestBuildHelper.displayAllVaultDetails();

                let vault = await FundingManagerAsset.getMyVaultAddress.call(wallet1);
                console.log("wallet1:         ", wallet1);
                console.log("vault:           ", vault.toString());

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, wallet1 );
                let PowerInFull = helpers.web3util.fromWei(Power, "ether");
                console.log("Power:           ", PowerInFull.toString());




            });

        });

        */


        /*
         tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );
         await helpers.utils.showGasUsage(helpers, tx, "RegisterVote 1 - wallet 1");

         let hasRequiredStateChanges = await ProposalsAsset.hasRequiredStateChanges.call();
         console.log("afterVoteHasRequiredStateChanges:", hasRequiredStateChanges.toString());



         tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet4} );
         await helpers.utils.showGasUsage(helpers, tx, "RegisterVote 2 - wallet 4");

         hasRequiredStateChanges = await ProposalsAsset.hasRequiredStateChanges.call();
         console.log("afterVoteHasRequiredStateChanges:", hasRequiredStateChanges.toString());


         let CurrentVoteNum =  await ProposalsAsset.VotesNumByProposalId.call( ProposalId );
         console.log("CurrentVoteNum:", CurrentVoteNum.toString());

         let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
         console.log("totalAvailable:    ", ProposalResultRecord[0].toString());
         console.log("requiredForResult: ", ProposalResultRecord[1].toString());
         console.log("totalSoFar:        ", ProposalResultRecord[2].toString());
         console.log("yes:               ", ProposalResultRecord[3].toString());
         console.log("no:                ", ProposalResultRecord[4].toString());
         console.log("requiresCounting:  ", ProposalResultRecord[5].toString());


         let LockedTokens = await FundingManagerAsset.LockedVotingTokens.call();
         let LockedTokensInFull = helpers.web3util.fromWei(LockedTokens, "ether");
         console.log("LockedTokens:      ", LockedTokensInFull.toString());
         */



    });
};