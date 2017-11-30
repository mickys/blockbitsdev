module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Type 4 - EMERGENCY_FUND_RELEASE', accounts => {
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

                let eventFilter = helpers.utils.hasEvent(
                    await ProposalsAsset.createEmergencyFundReleaseProposal(),
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


        /*

        it( "current proposal matches EMERGENCY_FUND_RELEASE settings", async () => {

            let RecordNum = await ProposalsAsset.RecordNum.call();
            assert.equal(RecordNum, 1, 'RecordNum does not match');

            let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            assert.equal(
                ProposalRecord[2].toString(),
                helpers.utils.getActionIdByName("Proposals", "EMERGENCY_FUND_RELEASE").toString(),
                'Proposal record type does not match'
            );

            assert.equal(
                 ProposalRecord[3].toString(),
                 helpers.utils.getRecordStateIdByName("Proposals", "ACCEPTING_VOTES").toString(),
                 'Proposal record type does not match'
            );

            let ResultRecord = await ProposalsAsset.ResultsByProposalId.call(1);

            // EMERGENCY_FUND_RELEASE is only voted by "locked" tokens
            assert(ResultRecord[5].toString(), "false", "Vote Recounting is not false.");

        });

        */

        context("Proposal Created - Voting Started", async () => {
            let ProposalId = 1;

            // await TestBuildHelper.displayAllVaultDetails();

            /*
            it("throws if trying to vote on a non existing proposal", async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await ProposalsAsset.RegisterVote( 0, true, {from: wallet4} );
                });
            });

            it("throws if trying to vote on a the proposal while having no stake in it", async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet2} );
                });
            });

            it("Registers a valid vote if voter has a stake in the proposal, does not close voting if stake is lower than 50%", async () => {

                let usedWallet = wallet4;
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: usedWallet} );
                // await helpers.utils.showGasUsage(helpers, tx, "RegisterVote");
                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let yesTotals = ProposalResultRecord[3];

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, usedWallet );
                assert.equal( yesTotals.toString(), Power.toString(), "Totals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "ACCEPTING_VOTES", "Proposal state should be ACCEPTING_VOTES");
            });


            it("Registers a valid vote if voter has a stake in the proposal, closes voting if stake is higher than 50%", async () => {

                let usedWallet = wallet1;
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: usedWallet} );
                // await helpers.utils.showGasUsage(helpers, tx, "RegisterVote that will finalise proposal");
                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let yesTotals = ProposalResultRecord[3];

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, usedWallet );
                assert.equal( yesTotals.toString(), Power.toString(), "Totals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "VOTING_RESULT_YES", "Proposal state should be VOTING_RESULT_YES");
            });


            it("first vote NO stake below 50%, second vote YES above 50%, closes as VOTING_RESULT_YES", async () => {

                // stake below 50%
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet4} );
                // await helpers.utils.showGasUsage(helpers, tx, "RegisterVote");

                // stake above 50%
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );
                // await helpers.utils.showGasUsage(helpers, tx, "RegisterVote");


                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let totalSoFar = ProposalResultRecord[2];
                let yesTotals = ProposalResultRecord[3];
                let noTotals = ProposalResultRecord[4];
                let calcTotals = new helpers.BigNumber(0);
                calcTotals = calcTotals.add(yesTotals);
                calcTotals = calcTotals.add(noTotals);

                assert.equal( totalSoFar.toString(), calcTotals.toString(), "calcTotals should match totalSoFar" );

                let PowerYes = await ProposalsAsset.getVotingPower.call( ProposalId, wallet1 );
                assert.equal( yesTotals.toString(), PowerYes.toString(), "yesTotals should match voting power!" );

                let PowerNo = await ProposalsAsset.getVotingPower.call( ProposalId, wallet4 );
                assert.equal( noTotals.toString(), PowerNo.toString(), "noTotals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "VOTING_RESULT_YES", "Proposal state should be VOTING_RESULT_YES");

            });

            it("Annuls and registers a new valid vote if voter already voted, has a stake in the proposal, and proposal is not closed", async () => {

                let usedWallet = wallet4;
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: usedWallet} );

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let yesTotals = ProposalResultRecord[3];

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, usedWallet );
                assert.equal( yesTotals.toString(), Power.toString(), "Totals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "ACCEPTING_VOTES", "Proposal state should be ACCEPTING_VOTES");

                // change from yes to no

                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: usedWallet} );

                ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let totalSoFar = ProposalResultRecord[2];
                yesTotals = ProposalResultRecord[3];
                let noTotals = ProposalResultRecord[4];
                let calcTotals = new helpers.BigNumber(0);
                calcTotals = calcTotals.add(yesTotals);
                calcTotals = calcTotals.add(noTotals);

                assert.equal( yesTotals.toString(), 0, "Yes Totals should be 0!" );
                assert.equal( noTotals.toString(), Power.toString(), "Totals should match voting power!" );

                assert.equal( totalSoFar.toString(), calcTotals.toString(), "calcTotals should match totalSoFar" );

            });
            */

            context("Voting Successful", async () => {

                beforeEach(async () => {
                    // stake above 50%
                    tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );
                    // await helpers.utils.showGasUsage(helpers, tx, "RegisterVote");
                });

                /*
                it("throws if trying to vote on a the proposal that has already been finalised", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet4} );
                    });
                });
                */

                it("FundingManagerAsset state", async () => {

                    // console.log( await helpers.utils.showAllStates(helpers, TestBuildHelper) );

                    // EMERGENCY_FUND_RELEASE
                    await TestBuildHelper.doApplicationStateChanges("EMERGENCY_FUND_RELEASE", true);

                    // FundingManagerAsset.

                    // stake below 50%
                    /*
                    tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: wallet4});
                    await helpers.utils.showGasUsage(helpers, tx, "RegisterVote");

                    // stake above 50%
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: wallet1});
                    await helpers.utils.showGasUsage(helpers, tx, "RegisterVote");


                    // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                    let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call(ProposalId);
                    let totalSoFar = ProposalResultRecord[2];
                    let yesTotals = ProposalResultRecord[3];
                    let noTotals = ProposalResultRecord[4];
                    let calcTotals = new helpers.BigNumber(0);
                    calcTotals = calcTotals.add(yesTotals);
                    calcTotals = calcTotals.add(noTotals);

                    assert.equal(totalSoFar.toString(), calcTotals.toString(), "calcTotals should match totalSoFar");

                    let PowerYes = await ProposalsAsset.getVotingPower.call(ProposalId, wallet1);
                    assert.equal(yesTotals.toString(), PowerYes.toString(), "yesTotals should match voting power!");

                    let PowerNo = await ProposalsAsset.getVotingPower.call(ProposalId, wallet4);
                    assert.equal(noTotals.toString(), PowerNo.toString(), "noTotals should match voting power!");

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber());

                    assert.equal(ProposalState, "VOTING_RESULT_YES", "Proposal state should be VOTING_RESULT_YES");
                    */

                });

            });

            /*
            it( "placing a vote ", async () => {

                let vault = await FundingManagerAsset.getMyVaultAddress.call(wallet1);
                console.log("wallet1:         ", wallet1);
                console.log("vault:           ", vault.toString());

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, wallet1 );
                let PowerInFull = helpers.web3util.fromWei(Power, "ether");
                console.log("Power:           ", PowerInFull.toString());

                await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);


                console.log("before first vote");
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet1} );
                console.log("after first vote");


                await helpers.utils.showGasUsage(helpers, tx, "RegisterVote 1 - wallet 1");

                let hasRequiredStateChanges = await ProposalsAsset.hasRequiredStateChanges.call();
                console.log("afterVoteHasRequiredStateChanges:", hasRequiredStateChanges.toString());


                await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                let ActiveProposalNum = await ProposalsAsset.ActiveProposalNum.call();
                let ActiveProposalId = await ProposalsAsset.ActiveProposalIds.call(0);
                console.log("ActiveProposalNum:", ActiveProposalNum.toString());
                console.log("ActiveProposalId: ", ActiveProposalId.toString());



            });
            */
        });

        /*
        context("states", async () => {


             it('handles ENTITY state change from WAITING to WAITING_MEETING_TIME when current time is after development start', async () => {

             tx = await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
             await TestBuildHelper.doApplicationStateChanges("Development Started", false);

             validation = await TestBuildHelper.ValidateEntityAndRecordState(
             assetName,
             helpers.utils.getEntityStateIdByName(assetName, "WAITING_MEETING_TIME").toString(),
             helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
             helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
             helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
             );
             assert.isTrue(validation, 'State validation failed..');

             });

             it('handles ENTITY state change from WAITING_MEETING_TIME to DEADLINE_MEETING_TIME_FAILED when current time is after milestone end, and meeting time was not set', async () => {

             tx = await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
             await TestBuildHelper.doApplicationStateChanges("Development Started", false);

             // time travel to end of milestone
             let duration = settings.milestones[0].duration;
             let time = settings.bylaws["development_start"] + 1 + duration;
             tx = await TestBuildHelper.timeTravelTo(time);

             await TestBuildHelper.doApplicationStateChanges("Milestone End", false);
             // await helpers.utils.showCurrentState(helpers, assetContract);


             validation = await TestBuildHelper.ValidateEntityAndRecordState(
             assetName,
             helpers.utils.getEntityStateIdByName(assetName, "DEADLINE_MEETING_TIME_FAILED").toString(),
             helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
             helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
             helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
             );
             assert.isTrue(validation, 'State validation failed..');

             });

             it('handles ENTITY state change from WAITING_MEETING_TIME to DEADLINE_MEETING_TIME_YES when current time is after milestone end, and meeting time was set', async () => {

             await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
             await TestBuildHelper.doApplicationStateChanges("Development Started", false);

             // time travel to end of milestone
             let duration = settings.milestones[0].duration;
             let time = settings.bylaws["development_start"] + duration +1;

             let currentTime = await MilestonesContract.getTimestamp.call();
             let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

             await MilestonesContract.setCurrentMilestoneMeetingTime(meetingTime);
             await TestBuildHelper.doApplicationStateChanges("Meeting time set", false);

             validation = await TestBuildHelper.ValidateEntityAndRecordState(
             assetName,
             helpers.utils.getEntityStateIdByName(assetName, "DEADLINE_MEETING_TIME_YES").toString(),
             helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
             helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
             helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
             );
             assert.isTrue(validation, 'State validation failed..');

             // validate meeting created

             });



            it('handles ENTITY state change from DEADLINE_MEETING_TIME_YES to VOTING_IN_PROGRESS when current time is after meeting time', async () => {

                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                // time travel to end of milestone
                let duration = settings.milestones[0].duration;
                let time = settings.bylaws["development_start"] + duration +1;

                let currentTime = await MilestonesContract.getTimestamp.call();
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

                await MilestonesContract.setCurrentMilestoneMeetingTime(meetingTime);
                await TestBuildHelper.doApplicationStateChanges("Meeting time set", false);

                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);

                await TestBuildHelper.doApplicationStateChanges("At Meeting time", false);

                validation = await TestBuildHelper.ValidateEntityAndRecordState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "VOTING_IN_PROGRESS").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');


            });


        });
         */
    });
};