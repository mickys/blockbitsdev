pragma solidity ^0.4.14;

import "./../Entity/Milestones.sol";
contract DeployTestMilestones {

    // test constants
    uint8 constant public ProjectCurrentState = 5;                                  // IN_DEVELOPMENT
    uint256 public BylawsProjectDevelopmentStart = now;
    uint256 constant public BylawsMinTimeInTheFutureForMeetingCreation = 7 days;
    uint256 constant public BylawsProposalVotingDuration = 3.5 days;
    uint256 constant public BylawsCashBackVoteRejectedDuration = 3.5 days;
    uint256 constant public BylawsCashBackOwnerMiaDuration = 90 days;

    // milestone settings
    uint256 constant public MilestoneDuration = 60 days;

    enum States {
        __IGNORED__,
        NEW,
        IN_DEVELOPMENT,
        DEADLINE_MEETING_TIME_SET,
        CASH_BACK_OWNER_MIA,
        CASH_BACK_OWNER_MIA_DONE,
        VOTING_IN_PROGRESS,
        VOTING_ENDED,
        CASH_BACK_VOTE_REJECTED,
        FINAL
    }

    Milestones public milestoneObject;
    
    function Deploy() public {
        milestoneObject = new Milestones();
    }
    
    function init() public {
        // dev time takes 1 minutes
        milestoneObject.addRecord("Milestone One", "", uint256(1 minutes), 10);

        // dev time takes 2 minutes
        milestoneObject.addRecord("Milestone Two", "", uint256(2 minutes), 10);

        // dev time takes 3 minutes
        milestoneObject.addRecord("Milestone Three", "", uint256(3 minutes), 10);

        // create milestones for each different state and test out the state reader

    }

    function initTestMilestones() public {
    /*
        bytes32 _name,
        uint256 _duration,
        uint8 _state,
        uint256 _time_start,
        uint256 _time_end,
        uint256 _time_ended,
        uint256 _meeting_time
    */

        /*
            Milestone Test 1

            StartTime is now plus 1 days
            Starts tomorrow -> We need to wait.

            State: States.NEW
            Restriction: time_start
            Accepted: NONE
        */
        milestoneObject.addTestRecord(
            "1 - 1 - NEW .. waiting",
            MilestoneDuration,
            uint8(States.NEW),
            now + 1 days,
            0,
            0,
            0
        );




        /*
            Milestone Test 2

            now is StartTime plus 1 days
            Development time in the past -> Can be started

            State: States.NEW
            Restriction: time_start
            Accepted: States.IN_DEVELOPMENT
        */
        milestoneObject.addTestRecord(
            "1 - 2 - NEW to IN_DEVELOPMENT",
            MilestoneDuration,
            uint8(States.NEW),
            now - 1 days,
            0,
            0,
            0
        );

        /*
            Milestone Test 3

            now is StartTime plus 10 days
            From: 0 to 60 minus bylaws meeting announcement days

            State: States.IN_DEVELOPMENT
            Restriction: time_start + duration
            Accepted: States.DEADLINE_MEETING_TIME_SET
        */
        milestoneObject.addTestRecord(
            "2 - 1 - IN_DEVELOPMENT to DEADLINE_MEETING_TIME_SET",
            MilestoneDuration,
            uint8(States.IN_DEVELOPMENT),
            now - (MilestoneDuration / 2),
            0,
            0,
            0
        );

        /*
            Milestone Test 4

            now is StartTime plus 59 days
            After: duration minus bylaws meeting time announcement days
            Range: time_start + duration - bylaws meeting time announcement days

            State: States.IN_DEVELOPMENT
            Restriction: time_start + duration
            Accepted: States.CASH_BACK_OWNER_MIA

            Should only allow OWNER MIA since bylaws say you need to set the meeting time, 7 days in advance!
        */
        milestoneObject.addTestRecord(
            "2 - 2 - IN_DEVELOPMENT to CASH_BACK_OWNER_MIA",
            MilestoneDuration,
            uint8(States.IN_DEVELOPMENT),
            now - MilestoneDuration + 1 days,
            0,
            0,
            0
        );

        /*
            Milestone Test 5

            now is StartTime plus 70 days
            Range: time_start + duration to OWNER_MIA duration

            State: States.CASH_BACK_OWNER_MIA
            Restriction: time_start + duration
            Accepted: NONE

            We are in owner mia cash back period.. we need to wait for the time to end
        */
        milestoneObject.addTestRecord(
            "2 - 2 - 1 CASH_BACK_OWNER_MIA .. waiting",
            MilestoneDuration,
            uint8(States.IN_DEVELOPMENT),
            now - MilestoneDuration - (BylawsCashBackOwnerMiaDuration / 2),
            0,
            0,
            0
        );


        /*
            Milestone Test 6

            now is StartTime plus 60 days of dev plus 90 days for cash back period
            State: States.CASH_BACK_OWNER_MIA

            After: time_start + duration + OWNER_MIA duration
            Restriction: time_start + duration
            Accepted: States.CASH_BACK_OWNER_MIA_DONE

        */
        milestoneObject.addTestRecord(
            "2 - 2 - 2 - CASH_BACK_OWNER_MIA to CASH_BACK_OWNER_MIA_DONE",
            MilestoneDuration,
            uint8(States.CASH_BACK_OWNER_MIA),
            now - MilestoneDuration - BylawsCashBackOwnerMiaDuration - 1 days,
            0,
            0,
            0
        );

        /*
            Milestone Test 7

            now is StartTime plus 60 days of dev plus 90 days for cash back period

            State: States.CASH_BACK_OWNER_MIA_DONE
            Restriction: time_start + duration
            Accepted: NONE

        */
        milestoneObject.addTestRecord(
            "2 - 2 - 2 - 1 - CASH_BACK_OWNER_MIA_DONE .. Project will now donate remaining ETH",
            MilestoneDuration,
            uint8(States.CASH_BACK_OWNER_MIA_DONE),
            now - MilestoneDuration - BylawsCashBackOwnerMiaDuration - 1 days,
            0,
            0,
            0
        );


        /*
            Milestone Test 8

            now is after time_end

            State: States.DEADLINE_MEETING_TIME_SET
            Restriction: time_end
            Accepted: States.VOTING_IN_PROGRESS
        */
        milestoneObject.addTestRecord(
            "3 - DEADLINE_MEETING_TIME_SET to VOTING_IN_PROGRESS",
            MilestoneDuration,
            uint8(States.DEADLINE_MEETING_TIME_SET),
            now - MilestoneDuration,
            now,
            now,
            0
        );



        /*
            Milestone Test 9

            now is before time_end plus voting duration

            State: States.VOTING_IN_PROGRESS
            Restriction: time_end + bylaws voting duration
            Accepted: NONE
        */
        milestoneObject.addTestRecord(
            "4 - 1 - VOTING_IN_PROGRESS .. waiting",
            MilestoneDuration,
            uint8(States.VOTING_IN_PROGRESS),
            now - MilestoneDuration - 1 days,
            now,
            0,
            0
        );

        /*
            Milestone Test 10

            now is after time_end plus voting duration

            State: States.VOTING_IN_PROGRESS
            Restriction: time_end + bylaws voting duration
            Accepted: States.VOTING_ENDED


            !!! NOT GOING TO IMPLEMENT !!!
            Vote Restriction: voting_result_already_available

            some vote results can be met sooner than allowed time
            example:
                max voters 100
                required yes = 51%
                YES votes eq or greater than 51

            Nice: Active communities could benefit from this.
            Issue:
                If we close voting before time, we then need to allow voters that did not participate to cash out..
                    now this is a problem because it will be abused.. voters will just wait and see what people do
                    instead of having an incentive to vote.
            Bad cases:
                Whale holding more than 51% voting "YES".. leaves everyone else forced to stay around, unless they
                    vote NO faster.

            Result: restricting to time only, as this creates a cleaner and easier to understand timeline.



        */
        milestoneObject.addTestRecord(
            "4 - 2 - VOTING_IN_PROGRESS - TimeRestriction Met to VOTING_ENDED",
            MilestoneDuration,
            uint8(States.VOTING_IN_PROGRESS),
            now - MilestoneDuration - BylawsProposalVotingDuration,
            now,
            0,
            0
        );

        // uint256 constant public BylawsMinTimeInTheFutureForMeetingCreation = 7 days;
        // uint256 constant public BylawsProposalVotingDuration = 3.5 days;
        // uint256 constant public BylawsCashBackVoteRejectedDuration = 3.5 days;
        /*
            Milestone Test 11

            now is after time_end plus voting duration

            State: States.VOTING_ENDED
            Restriction (AND):
                - 1: time_end + bylaws voting duration
                - 2: voting result TRUE
            Accepted: States.FINAL
        */
        milestoneObject.addTestRecord(
            "5 - 1 - VOTING_ENDED to FINAL",
            MilestoneDuration,
            uint8(States.VOTING_ENDED),
            now - MilestoneDuration - BylawsProposalVotingDuration,
            0,
            0,
            0
        );

        /*
            Milestone Test 12

            now is after time_end plus voting duration

            State: States.VOTING_ENDED
            Restriction (AND):
                - 1: time_end + bylaws voting duration
                - 2: voting result TRUE
            Accepted: States.FINAL
        */
        milestoneObject.addTestRecord(
        "5 - 1 - VOTING_ENDED to FINAL",
        MilestoneDuration,
        uint8(States.VOTING_ENDED),
        now - MilestoneDuration - BylawsProposalVotingDuration,
        0,
        0,
        0
        );

    }

    function initializeData() public returns(bool) {
        /*
        (
            uint8 _state,
            uint256 _start_time,
            uint256 bylaw_meeting_time,
            uint256 bylaw_voting_duration,
            uint256 bylaw_cashback_owner_mia_duration,
            uint256 bylaw_cashback_vote_rejected_duration
        )
        */

        milestoneObject.setProjectSettings(
            ProjectCurrentState,
            BylawsProjectDevelopmentStart,
            BylawsMinTimeInTheFutureForMeetingCreation,
            BylawsProposalVotingDuration,
            BylawsCashBackOwnerMiaDuration,
            BylawsCashBackVoteRejectedDuration
        );

        return milestoneObject.initializeData();
    }

    function nextStep() public returns(uint8) {
        return milestoneObject.nextStepCycle();
    }
    
}

