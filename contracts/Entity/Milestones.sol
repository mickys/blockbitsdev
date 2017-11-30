/*

 * @name        Milestones Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Milestones Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./FundingManager.sol";
import "./Meetings.sol";
import "./Proposals.sol";


contract Milestones is ApplicationAsset {

    FundingManager FundingManagerEntity;
    Proposals ProposalsEntity;
    Meetings MeetingsEntity;

    struct Record {
        bytes32 name;
        string description;                     // will change to hash pointer ( external storage )
        uint8 state;
        uint256 duration;
        uint256 time_start;                     // start at unixtimestamp
        uint256 last_state_change_time;         // time of last state change
        uint256 time_end;                       // estimated end time >> can be increased by proposal
        uint256 time_ended;                     // actual end time
        uint256 meeting_time;
        uint8 funding_percentage;
        uint8 index;
    }

    mapping (uint8 => Record) public Collection;
    uint8 public currentRecord = 1;

    event DebugRecordRequiredChanges( bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required );
    event DebugCallAgain(uint8 indexed _who);

    event EventEntityProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);
    event EventRecordProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);

    event DebugAction(bytes32 indexed _name, bool indexed _allowed);


    function setAssetStates() internal {

        // Contract States
        EntityStates["__IGNORED__"]                  = 0;
        EntityStates["NEW"]                          = 1;
        EntityStates["WAITING"]                      = 2;

        EntityStates["IN_DEVELOPMENT"]               = 5;

        EntityStates["WAITING_MEETING_TIME"]         = 10;
        EntityStates["DEADLINE_MEETING_TIME_YES"]    = 11;
        EntityStates["DEADLINE_MEETING_TIME_FAILED"] = 12;

        EntityStates["VOTING_IN_PROGRESS"]           = 20;
        // EntityStates["VOTING_ENDED"]                 = 21;
        EntityStates["VOTING_ENDED_YES"]             = 22;
        EntityStates["VOTING_ENDED_NO"]              = 23;

        EntityStates["FINAL"]                        = 50;

        EntityStates["CASHBACK_OWNER_MIA"]           = 99;
        EntityStates["DEVELOPMENT_COMPLETE"]         = 250;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
        RecordStates["NEW"]             = 1;
        RecordStates["IN_PROGRESS"]     = 2;
        RecordStates["FINAL"]           = 3;
    }

    function runBeforeInitialization() internal requireNotInitialised {
        FundingManagerEntity = FundingManager( getApplicationAssetAddressByName('FundingManager') );
        MeetingsEntity = Meetings( getApplicationAssetAddressByName('Meetings') );
        ProposalsEntity = Proposals( getApplicationAssetAddressByName('Proposals') );
        EventRunBeforeInit(assetName);
    }

    function runBeforeApplyingSettings() internal requireInitialised requireSettingsNotApplied  {
        // setup first milestone
        Record storage rec = Collection[currentRecord];
            rec.time_start = getBylawsProjectDevelopmentStart();
            rec.time_end = rec.time_start + rec.duration;
        EventRunBeforeApplyingSettings(assetName);
    }

    function getBylawsProjectDevelopmentStart() public view returns (uint256) {
        return getAppBylawUint256("development_start");
    }

    function getBylawsMinTimeInTheFutureForMeetingCreation() public view returns (uint256) {
        return getAppBylawUint256("meeting_time_set_req");
    }

    function getBylawsProposalVotingDuration() public view returns (uint256) {
        return getAppBylawUint256("proposal_voting_duration");
    }

    function getBylawsCashBackOwnerMiaDuration() public view returns (uint256) {
        return getAppBylawUint256("cashback_owner_mia_dur");
    }

    function getBylawsCashBackVoteRejectedDuration() public view returns (uint256) {
        return getAppBylawUint256("cashback_investor_no");
    }

    function getProposalVotingResult(uint8 _recordId) public pure returns (bool) {
        // ProposalsEntity
        _recordId = 0;
        return true;
    }



    /*
    * Add Record
    *
    * @param        bytes32 _name
    * @param        string _description
    * @param        uint256 _duration
    * @param        uint256 _funding_percentage
    *
    * @access       public
    * @type         method
    * @modifiers    onlyDeployer, requireNotInitialised
    */
    function addRecord(
        bytes32 _name,
        string _description,
        uint256 _duration,
        uint8   _funding_percentage
    )
        public
        onlyDeployer
        requireSettingsNotApplied
    {

        Record storage rec = Collection[++RecordNum];

        rec.name                = _name;
        rec.description         = _description;
        rec.duration            = _duration;
        rec.state               = getRecordState("NEW");

        // save some gas
        // rec.time_start          = 0;
        // rec.time_end            = 0;
        // rec.time_ended          = 0;
        // rec.meeting_time        = 0;
        rec.funding_percentage  = _funding_percentage;
        rec.index               = RecordNum;
    }

    function getMilestoneFundingPercentage(uint8 recordId) public view returns (uint8){
        Record storage rec = Collection[recordId];
        return rec.funding_percentage;
    }

    function doStateChanges() public {

        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();
        bool callAgain = false;

        DebugRecordRequiredChanges( assetName, CurrentRecordState, RecordStateRequired );
        DebugEntityRequiredChanges( assetName, CurrentEntityState, EntityStateRequired );

        if( RecordStateRequired != getRecordState("__IGNORED__") ) {
            // process record changes.
            RecordProcessor(CurrentRecordState, RecordStateRequired);
            DebugCallAgain(2);
            callAgain = true;
        }

        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            // process entity changes.
            // if(CurrentEntityState != EntityStateRequired) {
            EntityProcessor(EntityStateRequired);
            DebugCallAgain(1);
            callAgain = true;
            //}
        }

        /*
        if(recursive && callAgain) {
            if(hasRequiredStateChanges()) {
                doStateChanges(recursive);
            }
        }
        */

    }

    function MilestonesCanChange() internal view returns (bool) {
        if(CurrentEntityState == getEntityState("WAITING") || CurrentEntityState == getEntityState("IN_DEVELOPMENT")) {
            return true;
        }
        return false;
    }


    /*
     * Method: Get Record Required State Changes
     *
     * @access       public
     * @type         method
     *
     * @return       uint8 RecordStateRequired
     */
    function getRecordStateRequiredChanges() public view returns (uint8) {
        Record memory record = Collection[currentRecord];
        uint8 RecordStateRequired = getRecordState("__IGNORED__");

        if( ApplicationIsInDevelopment() && MilestonesCanChange() ) {

            if( record.state == getRecordState("NEW") ) {

                if( getTimestamp() >= record.time_start ) {
                    RecordStateRequired = getRecordState("IN_PROGRESS");
                }

            } else if( record.state == getRecordState("IN_PROGRESS") ) {

                if( getTimestamp() >= record.time_end) {
                    RecordStateRequired = getRecordState("FINAL");
                }
            }

            if( record.state == RecordStateRequired ) {
                RecordStateRequired = getRecordState("__IGNORED__");
            }
        }
        return RecordStateRequired;
    }


    function hasRequiredStateChanges() public view returns (bool) {
        bool hasChanges = false;
        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();
        CurrentRecordState = 0;

        if( RecordStateRequired != getRecordState("__IGNORED__") ) {
            hasChanges = true;
        }
        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            hasChanges = true;
        }

        return hasChanges;
    }

    // view methods decide if changes are to be made
    // in case of tasks, we do them in the Processors.

    function RecordProcessor(uint8 CurrentRecordState, uint8 RecordStateRequired) internal {
        EventRecordProcessor( assetName, CurrentRecordState, RecordStateRequired );
        updateRecord( RecordStateRequired );

        if (
            CurrentEntityState == getEntityState("VOTING_ENDED_YES")
            || CurrentEntityState == getEntityState("VOTING_ENDED_NO")
        ) {
            startNextMilestone();
        }
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {
        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Do State Specific Updates
        // Update our Entity State
        CurrentEntityState = EntityStateRequired;

        if ( CurrentEntityState == getEntityState("DEADLINE_MEETING_TIME_YES") ) {
            // create meeting
            // Meetings.create("internal", "MILESTONE_END", "");

        } else if( EntityStateRequired == getEntityState("VOTING_IN_PROGRESS") ) {
            // create proposal and start voting on it
            if(MilestoneAcceptanceProposalCreated == false) {
                createMilestoneAcceptanceProposal();
            }

        } else if( EntityStateRequired == getEntityState("VOTING_ENDED") ) {

            // EntityStateRequired = getEntityState("VOTING_ENDED_YES");
            // EntityStateRequired = getEntityState("VOTING_ENDED_NO");

        } else if( EntityStateRequired == getEntityState("DEVELOPMENT_ENDED") ) {

        }

    }

    uint256 currentProposalId = 0;
    bool MilestoneAcceptanceProposalCreated = false;
    function createMilestoneAcceptanceProposal() internal {

        currentProposalId = 10;
        // ProposalsEntity.create
        MilestoneAcceptanceProposalCreated = true;
    }


    function setCurrentMilestoneMeetingTime(uint256 _meeting_time) public onlyDeployer {
        if ( CurrentEntityState == getEntityState("WAITING_MEETING_TIME") ) {
            if(MeetingTimeSetFailure() == false ) {
                Record storage record = Collection[currentRecord];
                // minimum x days into the future
                uint256 min = getTimestamp() + getBylawsMinTimeInTheFutureForMeetingCreation();
                // minimum days before end date
                uint256 max = record.time_end + 24 * 3600;
                if(_meeting_time > min && _meeting_time < max ) {
                    record.meeting_time = _meeting_time;
                }
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    function startNextMilestone() internal {
        Record storage rec = Collection[currentRecord];
        if(rec.state == getRecordState("FINAL") ) {
            if(currentRecord < RecordNum) {
                // set current record end date etc
                rec.time_ended = getTimestamp();

                // jump to next milestone
                currentRecord++;

                Record storage nextRec = Collection[currentRecord];
                    nextRec.time_start = rec.time_ended;
                    nextRec.time_end = rec.time_ended + nextRec.duration;
            }
        }
    }

    /*
    * Update Existing Record
    *
    * @param        uint8 _record_id
    * @param        uint8 _new_state
    * @param        uint8 _duration
    *
    * @access       public
    * @type         method
    * @modifiers    onlyOwner, requireInitialised, RecordUpdateAllowed
    *
    * @return       void
    */

    function updateRecord( uint8 _new_state )
        internal
        requireInitialised
        RecordUpdateAllowed(_new_state)
        returns (bool)
    {
        Record storage rec = Collection[currentRecord];
        rec.state       = _new_state;
        return true;
    }


    /*
    * Modifier: Validate if record updates are allowed
    *
    * @type         modifier
    *
    * @param        uint8 _record_id
    * @param        uint8 _new_state
    * @param        uint256 _duration
    *
    * @return       bool
    */

    modifier RecordUpdateAllowed(uint8 _new_state) {
        require( isRecordUpdateAllowed( _new_state )  );
        _;
    }

    /*
     * Method: Validate if record can be updated to requested state
     *
     * @access       public
     * @type         method
     *
     * @param        uint8 _record_id
     * @param        uint8 _new_state
     *
     * @return       bool
     */
    function isRecordUpdateAllowed(uint8 _new_state ) public view returns (bool) {

        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();

        CurrentRecordState = 0;
        EntityStateRequired = 0;

        if(_new_state == uint8(RecordStateRequired)) {
            return true;
        }
        return false;
    }

    /*
     * Method: Get Record and Entity State Changes
     *
     * @access       public
     * @type         method
     *
     * @return       ( uint8 CurrentRecordState, uint8 RecordStateRequired, uint8 EntityStateRequired)
     */
    function getRequiredStateChanges() public view returns (uint8, uint8, uint8) {

        Record memory record = Collection[currentRecord];

        uint8 CurrentRecordState = record.state;
        uint8 RecordStateRequired = getRecordStateRequiredChanges();
        uint8 EntityStateRequired = getEntityState("__IGNORED__");

        if( ApplicationIsInDevelopment() ) {

            // Do Entity Checks

            if ( CurrentEntityState == getEntityState("WAITING") ) {

                if(RecordStateRequired == getRecordState("IN_PROGRESS") ) {
                    // both record and entity states need to move to IN_PROGRESS
                    EntityStateRequired = getEntityState("IN_DEVELOPMENT");
                }

            } else if ( CurrentEntityState == getEntityState("IN_DEVELOPMENT") ) {

                EntityStateRequired = getEntityState("WAITING_MEETING_TIME");

            } else if ( CurrentEntityState == getEntityState("WAITING_MEETING_TIME") ) {

                if(record.meeting_time > 0) {

                    EntityStateRequired = getEntityState("DEADLINE_MEETING_TIME_YES");

                } else {

                    if(MeetingTimeSetFailure()) {
                        // Force Owner Missing in Action - Cash Back Procedure
                        EntityStateRequired = getEntityState("DEADLINE_MEETING_TIME_FAILED");
                    }
                }

            } else if ( CurrentEntityState == getEntityState("DEADLINE_MEETING_TIME_FAILED") ) {


            } else if ( CurrentEntityState == getEntityState("DEADLINE_MEETING_TIME_YES") ) {

                // create proposal
                // start voting if time passed
                if(getTimestamp() >= record.meeting_time ) {
                    EntityStateRequired = getEntityState("VOTING_IN_PROGRESS");
                }

            } else if ( CurrentEntityState == getEntityState("VOTING_IN_PROGRESS") ) {

                uint8 ProposalRecordState = ProposalsEntity.getProposalState( currentProposalId );
                if (
                    ProposalRecordState == ProposalsEntity.getEntityState("VOTING_ACCEPTED") ||
                    ProposalRecordState == ProposalsEntity.getEntityState("VOTING_REJECTED")
                ) {
                    EntityStateRequired = getEntityState("VOTING_ENDED");
                }

            } else if ( CurrentEntityState == getEntityState("VOTING_ENDED") ) {

                // check if voting ended, if so based on result set
                // EntityStateRequired = getEntityState("VOTING_ENDED_YES");
                // EntityStateRequired = getEntityState("VOTING_ENDED_NO");

            } else if ( CurrentEntityState == getEntityState("VOTING_ENDED_YES") ) {

                // check funding manager has processed the FUNDING_SUCCESSFUL Task, if true => FUNDING_SUCCESSFUL_DONE
                /*
                if(FundingManagerEntity.taskByHash( FundingManagerEntity.getHash("FUNDING_SUCCESSFUL_START", "") ) == true) {
                    EntityStateRequired = getEntityState("SUCCESSFUL_FINAL");
                }
                */

            } else if ( CurrentEntityState == getEntityState("VOTING_ENDED_NO") ) {

                // check if milestone cashout period has passed and if so process fund releases
                /*
                if(FundingManagerEntity.taskByHash( FundingManagerEntity.getHash("FUNDING_SUCCESSFUL_START", "") ) == true) {
                    EntityStateRequired = getEntityState("SUCCESSFUL_FINAL");
                }
                */

            } else if ( CurrentEntityState == getEntityState("FINAL") ) {

            }

            // Record State Overrides
            // if(CurrentRecordState != RecordStateRequired) {
            /*
            if(RecordStateRequired != getRecordState("__IGNORED__"))
            {
                // direct state overrides by record state
                if (RecordStateRequired == getRecordState("FINAL")) {
                    // funding stage moves to FINAL

                    if (currentRecord == RecordNum) {
                        // if current funding is last
                        EntityStateRequired = getEntityState("DEVELOPMENT_ENDED");
                    }
                    else {
                        // start voting period
                        // EntityStateRequired = getEntityState("COOLDOWN");
                    }
                }
            }
            */


        } else {

            if( CurrentEntityState == getEntityState("NEW") ) {
                EntityStateRequired = getEntityState("WAITING");
            }
        }

        return (CurrentRecordState, RecordStateRequired, EntityStateRequired);
    }

    function ApplicationIsInDevelopment() public view returns(bool) {
        if( getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {
            return true;
        }
        return false;
    }

    function MeetingTimeSetFailure() public view returns (bool) {
        Record memory record = Collection[currentRecord];
        uint256 meetingCreationMaxTime = record.time_end - getBylawsMinTimeInTheFutureForMeetingCreation();
        if(getTimestamp() >= meetingCreationMaxTime ) {
            return true;
        }
        return false;
    }

}