/*

 * @name        Milestones Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Milestones Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";


contract Milestones is ApplicationAsset {

    mapping (bytes32 => uint8) public EntityStates;
    mapping (bytes32 => uint8) public RecordStates;

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
    uint8 public currentMilestone = 1;

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

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
        RecordStates["NEW"]             = 1;
        RecordStates["IN_PROGRESS"]     = 2;
        RecordStates["FINAL"]           = 3;
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
        return BylawsCashBackVoteRejectedDuration;
    }

    function getProposalVotingResult(uint8 _recordId) public pure returns (bool) {

        // address ProposalsAddress = getApplicationAssetAddressByName('Proposals');
        // ProposalsEntity = Proposals(ProposalsAddress) ;

        _recordId = 0;
        return true;
    }


    /*
    * Next step cycle
    *
    * @param        bytes32 _name
    * @param        bytes32 _description_hash
    * @param        uint256 _duration
    *
    * @access       public
    * @type         method
    * @modifiers    onlyOwner, requireInitialised
    *
    * @return       uint8
    */
    function nextStepCycle() external requireInitialised returns (uint8) {

        // make sure we're in development state
        if( getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {

            uint8 recId = getFirstUsableRecordId();
            if(recId > 0) {


                Record storage rec = Collection[recId];
                uint8 nextState = rec.state + 1;
                rec.time_start = getDevelopmentStartDate();
                rec.time_end = rec.time_start + rec.duration;

                // update state
                updateRecord( rec.index, nextState );

                return recId;
            } else {

                return 0;
            }
        }

        // no records left.. or project state not in development
        // app should change project state to -> DELIVERED
        return 0;

    }


    /*
    * Get first usable record ID
    *
    * @access       public
    * @type         method
    * @modifiers    onlyOwner, requireInitialised
    *
    * @return       uint8
    */
    function getFirstUsableRecordId() private view requireInitialised returns ( uint8 ) {
        for(uint8 i = 1; i <= RecordNum; i++) {
            Record storage rec = Collection[i];
            if(rec.state != uint8(States.FINAL)) {
                return rec.index;
            }
        }
        return 0;
    }

    /*
    * Get development start date
    *
    * @access       public
    * @type         method
    * @modifiers    onlyOwner, requireInitialised
    *
    * @return       uint256
    */
    function getDevelopmentStartDate() private view requireInitialised returns ( uint256 ) {

        uint8 recId = getFirstUsableRecordId();
        if(recId == 1) {
            // time_start is set by bylaws in init
            return Collection[recId].time_start;
        } else {
            return Collection[recId-1].time_ended;
        }
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
        requireNotInitialised
    {

        Record storage rec = Collection[++RecordNum];

        rec.name                = _name;
        rec.description         = _description;
        rec.duration            = _duration;
        rec.state               = uint8(States.NEW);
        
        // save some gas
        // rec.time_start          = 0;
        // rec.time_end            = 0;
        // rec.time_ended          = 0;
        // rec.meeting_time        = 0;
        rec.funding_percentage  = _funding_percentage;
        rec.index               = RecordNum;
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
    * @modifiers    onlyOwner, requireInitialised, updateAllowed
    *
    * @return       void
    */
    function updateRecord(
        uint8 _record_id,
        uint8 _new_state
    )
    public requireInitialised updateAllowed(_record_id, _new_state) {

        Record storage rec = Collection[_record_id];
        rec.state       = uint8(States(_new_state)) ;

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

    modifier updateAllowed(uint8 _RecordId, uint8 _new_state) {
        require( isUpdateAllowed( _RecordId, _new_state )  );
        _;
    }


    function isUpdateAllowed(uint8 _RecordId, uint8 _new_state ) public view returns (bool) {
        var (allowedState, ProjectState) = getAllowedUpdateState(_RecordId);
        ProjectState = 0;
        if(_new_state == uint8(allowedState)) {
            return true;
        }
        return false;
    } 


    /*
    * Method: Validate if record updates are allowed
    *
    * @access       public
    * @type         method
    * @modifiers    onlyOwner
    *
    * @param        uint8 _record_id
    * @param        uint8 _new_state
    * @param        uint256 _duration
    *
    * @return       bool
    */
    function getAllowedUpdateState( uint8 _RecordId ) public view returns (int8, int16) {

        int8 result = -1;
        int16 projectState = -1;

        // get Record current state
        Record memory rec = Collection[_RecordId];


        // figure out if current state allows a change to proposed state
        if(rec.state == uint8(States.NEW)) {

            /*
                If milestone is new and now is after start time:
                - we can start development on it
            */
            if( now > rec.time_start ) {
                result = int8(States.IN_DEVELOPMENT);
            }
 
        } else if (rec.state == uint8(States.IN_DEVELOPMENT)) {

            /*
                If milestone is in development:
                - check for meeting_time to be set
                - check for is time after Bylaws ?
            */
            uint256 meetingCreationMaxTime = rec.time_end - getBylawsMinTimeInTheFutureForMeetingCreation();

            if(now < meetingCreationMaxTime ) {
                // now is before meetingCreationMaxTime
                result = int8(States.DEADLINE_MEETING_TIME_SET);
            } else {
                // now is after.. we need to start Cash Back Procedure
                result = int8(States.CASH_BACK_OWNER_MIA);
            }

        } else if (rec.state == uint8(States.CASH_BACK_OWNER_MIA)) {

            /*
                If milestone is in CASH_BACK and now is after end time + Bylaws CashBack Period:
                we lock project and accept nothing.

                Project needs to check if it needs to
            */

            // getBylawsCashBackOwnerMiaDuration();

            result = int8(States.CASH_BACK_OWNER_MIA_DONE);
            projectState = 1000;

        }
        else if (rec.state == uint8(States.CASH_BACK_OWNER_MIA_DONE)) {

            /*
                If milestone is in CASH_BACK and now is after end time + Bylaws CashBack Period:
                we lock project and accept nothing.

                Project needs to check if it needs to
            */
            projectState = 1001;
        }
        else if (rec.state == uint8(States.DEADLINE_MEETING_TIME_SET)) {

            if(now > rec.time_end ) {
                // now is after milestone meeting
                result = int8(States.VOTING_IN_PROGRESS);
            }

        } else if (rec.state == uint8(States.VOTING_IN_PROGRESS)) {

            uint256 proposalVotingEndTime = rec.time_end + getBylawsProposalVotingDuration();
            if( now > proposalVotingEndTime ) {
                // now is after proposal voting time
                result = int8(States.VOTING_ENDED);
            }

        } else if (rec.state == uint8(States.VOTING_ENDED)) {

            // get voting result
            /*
            if( getProposalVotingResult(_RecordId) ) {
                // accepted
                result = int8(States.FINAL);
            } else {
                result = int8(States.CASH_BACK_VOTE_REJECTED);
            }
            */

            // if we have a vote result that majority said NO
            // we wait for 7 days before moving from this state to "funds release".


        } else if (rec.state == uint8(States.CASH_BACK_VOTE_REJECTED)) {

            //
            //

            /*
                If milestone is in CASH_BACK and now is after end time + Bylaws CashBack Period:
                - we can start development on it
            */
            /*
            if( now > rec.time_start ) {
                result = int8(States.IN_DEVELOPMENT);
            }


            if(_new_state == int8(States.FINAL) ) {
                result = int8(States.FINAL);
            }
            */
        } else if (rec.state == uint8(States.FINAL)) {
            // nothing to do here 
        }

        return (result, projectState);
    }

    function initializeData() public returns(bool) {
        if( _initialized == false && RecordNum > 0 ) {
            _initialized = true;
        }

        Collection[1].time_start = getBylawsProjectDevelopmentStart();

        return _initialized;
    }


}