module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Settings Locked', accounts => {
        let assetContract, tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, validation = {};

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

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            assetContract = await TestBuildHelper.getDeployedByName("Proposals");
            ProposalsAsset = assetContract;
            MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");

        });

        it( "Asset deploys and initialises properly", async () => {
            let getActionType = await ProposalsAsset.getActionType.call("MILESTONE_DEADLINE");
            let actionType = helpers.utils.getActionIdByName("Proposals", "MILESTONE_DEADLINE");
            assert.equal(actionType.toString(), getActionType.toString(), 'ActionType does not match');
        });


        context("proposal creation", async () => {

            context("type 1 - IN_DEVELOPMENT_CODE_UPGRADE - Voting Type - Milestone", async () => {

                it( "throws if called by any address other than ApplicationEntity", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.addCodeUpgradeProposal(await ProposalsAsset.address, "testurl");
                    });
                });

                it( "creates the proposal if called by the current ApplicationEntity", async () => {
                    let app = await contracts.ApplicationEntity.new();

                    let eventFilter = helpers.utils.hasEvent(
                        await ApplicationEntity.callTestAddCodeUpgradeProposal(await app.address, "url"),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "IN_DEVELOPMENT_CODE_UPGRADE").toString(),
                        'Proposal record type does not match'
                    );
                });

            });

            context("type 2 - EMERGENCY_FUND_RELEASE - Voting Type - Milestone", async () => {

                it( "throws if called by any address other than deployer", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createEmergencyFundReleaseProposal( {from: accounts[2] } );
                    });
                });

                it( "creates the proposal if called by the current deployer", async () => {
                    let eventFilter = helpers.utils.hasEvent(
                        await ProposalsAsset.createEmergencyFundReleaseProposal(),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "EMERGENCY_FUND_RELEASE").toString(),
                        'Proposal record type does not match'
                    );

                });

            });

            context("type 3 - MILESTONE_POSTPONING - Voting Type - Milestone", async () => {

                let duration = settings.bylaws.min_postponing + 1;

                it( "throws if called by any address other than deployer", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestonePostponingProposal( duration, {from: accounts[2] } );
                    });
                });

                it( "throws if duration is not higher than min postponing bylaw", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestonePostponingProposal( 1 );
                    });
                });

                it( "throws if duration is higher than max postponing bylaw", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestonePostponingProposal( settings.bylaws.max_postponing + 1 );
                    });
                });

                it( "creates the proposal if called by the current deployer with correct duration", async () => {
                    let eventFilter = helpers.utils.hasEvent(
                        await ProposalsAsset.createMilestonePostponingProposal( duration ),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "MILESTONE_POSTPONING").toString(),
                        'Proposal record type does not match'
                    );

                });
            });

            context("type 4 - MILESTONE_DEADLINE - Voting Type - Milestone", async () => {

                it( "throws if called by any address other than MilestoneAsset", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestoneAcceptanceProposal();
                    });
                });

                it( "creates the proposal if called by the current MilestoneAsset", async () => {

                    let eventFilter = helpers.utils.hasEvent(
                        await MilestonesAsset.callTestCreateMilestoneAcceptanceProposal(),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "MILESTONE_DEADLINE").toString(),
                        'Proposal record type does not match'
                    );

                });

            });

            context("type 5 - PROJECT_DELISTING - Voting Type - Tokens", async () => {

                // wallet2, wallet3 have direct funding
                // wallet1, wallet4 have milestone.
                // all should be able to vote.

                context("createDelistingProposal", async () => {
                    // proposals.createDelistingProposal( projectId )
                });

            });

            context("type 6 - AFTER_COMPLETE_CODE_UPGRADE - Voting Type - Tokens", async () => {

                // move application to complete, then release all tokens to all investors.
                // after that we can test this case

                /*
                it( "throws if called by any address other than ApplicationEntity", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.addCodeUpgradeProposal(await ProposalsAsset.address, "testurl");
                    });
                });

                it( "creates the proposal if called by the current ApplicationEntity", async () => {
                    let app = await contracts.ApplicationEntity.new();

                    let eventFilter = helpers.utils.hasEvent(
                        await ApplicationEntity.callTestAddCodeUpgradeProposal(await app.address, "url"),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');
                });
                */

            });

            context('misc for extra coverage', async () => {

                it('getRequiredStateChanges', async () => {
                    await ProposalsAsset.getRequiredStateChanges.call();
                });

                it('hasRequiredStateChanges', async () => {
                    await ProposalsAsset.hasRequiredStateChanges.call();
                });

                it('process', async () => {
                    await ProposalsAsset.process();
                });

                it('getMyVote', async () => {
                    await ProposalsAsset.getMyVote( 1, wallet1);
                });

                it('getProposalState', async () => {
                    await ProposalsAsset.getProposalState.call(1);
                });

                it('getBylawsMilestoneMinPostponing', async () => {
                    await ProposalsAsset.getBylawsMilestoneMinPostponing.call();
                });

                it('getBylawsMilestoneMaxPostponing', async () => {
                    await ProposalsAsset.getBylawsMilestoneMaxPostponing.call();
                });

                it('getVotingPower for non existent investor', async () => {
                    let Power = await ProposalsAsset.getVotingPower.call(1, accounts[0]);
                    assert.equal(Power.toNumber(), 0, "Power is not 0");
                });

            });


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