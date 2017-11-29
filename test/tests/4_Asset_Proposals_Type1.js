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

            let ResultRecord = await ProposalsAsset.ResultsByProposalId.call(1);

            // IN_DEVELOPMENT_CODE_UPGRADE is only voted by "locked" tokens
            assert(ResultRecord[5].toString(), "false", "Vote Recounting is not false.");

        });

        context("Voting", async () => {

            it( "placing a vote ", async () => {

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