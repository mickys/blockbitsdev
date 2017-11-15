/*

 * @name        Milestones Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Milestones Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./FundingManager.sol";
import "./Proposals.sol";

contract Milestones is ApplicationAsset {

    mapping (bytes32 => uint8) public EntityStates;
    mapping (bytes32 => uint8) public RecordStates;

    FundingManager FundingManagerEntity;
    Proposals ProposalsEntity;

    uint8 public CurrentEntityState;

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
        EntityStates["IN_DEVELOPMENT"]               = 3;
        EntityStates["DEADLINE_MEETING_TIME_YES"]    = 4;
        EntityStates["DEADLINE_MEETING_TIME_FAILED"] = 5;
        EntityStates["VOTING_IN_PROGRESS"]           = 6;
        EntityStates["VOTING_ENDED_YES"]             = 7;
        EntityStates["VOTING_ENDED_NO"]              = 8;
        EntityStates["FINAL"]                        = 9;

        EntityStates["CASHBACK_OWNER_MIA"]           = 99;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
        RecordStates["NEW"]             = 1;
        RecordStates["IN_PROGRESS"]     = 2;
        RecordStates["FINAL"]           = 3;
    }

    function runBeforeInitialization() internal requireNotInitialised {
        FundingManagerEntity = FundingManager( getApplicationAssetAddressByName('FundingManager') );
        ProposalsEntity = Proposals( getApplicationAssetAddressByName('Proposals') );
        EventRunBeforeInit(assetName);
    }

    function getRecordState(bytes32 name) public view returns (uint8) {
        return RecordStates[name];
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


    function doStateChanges(bool recursive) public {
        if( getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {

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

            if(recursive && callAgain) {
                if(hasRequiredStateChanges()) {
                    doStateChanges(recursive);
                }
            }
        }
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

        if( record.state == getRecordState("FINAL") ) {
            return getRecordState("__IGNORED__");
        }

        if( getTimestamp() >= record.time_start ) {
            RecordStateRequired = getRecordState("IN_PROGRESS");
        }

        if( getTimestamp() >= record.time_end) {
            RecordStateRequired = getRecordState("FINAL");
        }

        if( record.state == RecordStateRequired ) {
            RecordStateRequired = getRecordState("__IGNORED__");
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
        if( RecordStateRequired == getRecordState("FINAL") ) {
            if(currentRecord < RecordNum) {
                // jump to next milestone
                // set current record end date etc
                currentRecord++;
            }
        }
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {
        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Do State Specific Updates
        // Update our Entity State
        CurrentEntityState = EntityStateRequired;

        if ( EntityStateRequired == getEntityState("DEVELOPMENT_ENDED") ) {

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


        // Record State Overrides
        // if(CurrentRecordState != RecordStateRequired) {
        if(RecordStateRequired != getRecordState("__IGNORED__"))
        {
            // direct state overrides by record state
            if(RecordStateRequired == getRecordState("IN_PROGRESS") ) {
                // both record and entity states need to move to IN_PROGRESS
                EntityStateRequired = getEntityState("IN_PROGRESS");

            } else if (RecordStateRequired == getRecordState("FINAL")) {
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

        } else {

            // Records do not require any updates.
            // Do Entity Checks
            if( CurrentEntityState == getEntityState("NEW") ) {
                EntityStateRequired = getEntityState("WAITING");
            } else if ( CurrentEntityState == getEntityState("IN_DEVELOPMENT") ) {

                /*
                    If milestone is in development:
                    - check for meeting_time to be set
                    - check for is time after Bylaws ?
                */
                uint256 meetingCreationMaxTime = record.time_end - getBylawsMinTimeInTheFutureForMeetingCreation();
                if(getTimestamp() >= meetingCreationMaxTime ) {
                    // Force Owner Missing in Action - Cash Back Procedure
                    EntityStateRequired = getEntityState("DEADLINE_MEETING_TIME_FAILED"); // getEntityState("CASHBACK_OWNER_MIA");
                }


                // if meeting time set
                // EntityStateRequired = getEntityState("DEADLINE_MEETING_TIME_YES");

            } else if ( CurrentEntityState == getEntityState("DEADLINE_MEETING_TIME_FAILED") ) {


            } else if ( CurrentEntityState == getEntityState("DEADLINE_MEETING_TIME_YES") ) {

                // create meeting
                // start voting if meeting time passed

            } else if ( CurrentEntityState == getEntityState("VOTING_IN_PROGRESS") ) {
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
        }

        return (CurrentRecordState, RecordStateRequired, EntityStateRequired);
    }

}