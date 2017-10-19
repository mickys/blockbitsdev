/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Funding Contract code deployed and linked to the Application Entity


    !!! Links directly to Milestones

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";

contract FundingOld is ApplicationAsset {

    enum FundingEntityStates {
        __IGNORED__,
        NEW,
        WAITING,
        IN_PROGRESS,
        COOLDOWN,
        SUCCESSFUL,
        FAILED
    }
 
    uint8 CurrentEntityState = uint8(FundingEntityStates.NEW);

    enum FundingStageStates {
        __IGNORED__,
        NEW, 				// not started
        IN_PROGRESS, 		// accepts payments
        FINAL				// ended
    }

    enum FundingMethodIds {
        __IGNORED__,
        DIRECT_ONLY, 				//
        MILESTONE_ONLY, 		    //
        DIRECT_AND_MILESTONE		//
    }


    struct FundingStage {
        bytes32 name;
        bytes32 description;                // will change to bytes32 hash pointer ( swarm / ipfs storage )
        uint8   state;
        uint256 time_start;
        uint256 time_end;
        uint256 amount_cap_hard;            // 0 = not enforced
        // funding method settings
        uint256 minimum_entry;
        uint8   methods;                    // FundingMethodIds
        // token settings
        uint256 start_parity;
        bool    use_parity_from_previous;   // enforces previous if available
        uint8   token_share_percentage;
        uint8   index;
    }

    mapping (uint8 => FundingStage) public Collection;

    // funding settings
    uint256 public AmountRaised = 0;
    uint256 public AmountCapSoft;
    uint256 public AmountCapHard;
 
    uint256 public Funding_Setting_funding_time_start;
    uint256 public Funding_Setting_pre_ico_duration;
    uint256 public Funding_Setting_pre_ico_cooldown_duration;
    uint256 public Funding_Setting_ico_duration;
    uint256 public Funding_Setting_cashback_duration;

    // tests
    uint256 public timeNow = 0;

    uint8 FundingStageNum = 0;
    //
    uint8 public currentFundingStage = 0;

    function FundingOld() ApplicationAsset public {
        /*
        addSettings(
            1000 ether,     // _AmountCapSoft
            3000 ether,     // _AmountCapHard
            now + 6 days,   // _Funding_Setting_funding_time_start
            7 days,         // _Funding_Setting_pre_ico_duration
            14 days,        // _Funding_Setting_pre_ico_cooldown_duration
            30 days,        // _Funding_Setting_ico_duration
            90 days         // _Funding_Setting_cashback_duration
        );
        */
        // setup();
    }

    function addSettings(
        uint256 _AmountCapSoft,
        uint256 _AmountCapHard,
        uint256 _Funding_Setting_funding_time_start,
        uint256 _Funding_Setting_pre_ico_duration,
        uint256 _Funding_Setting_pre_ico_cooldown_duration,
        uint256 _Funding_Setting_ico_duration,
        uint256 _Funding_Setting_cashback_duration
    )
    public
    requireNotInitialised {
        AmountCapSoft = _AmountCapSoft;
        AmountCapHard = _AmountCapHard;
        Funding_Setting_funding_time_start = _Funding_Setting_funding_time_start;
        Funding_Setting_pre_ico_duration = _Funding_Setting_pre_ico_duration;
        Funding_Setting_pre_ico_cooldown_duration = _Funding_Setting_pre_ico_cooldown_duration;
        Funding_Setting_ico_duration = _Funding_Setting_ico_duration;
        Funding_Setting_cashback_duration = _Funding_Setting_cashback_duration;
    }

    function setup() public requireNotInitialised {
        // add pre-ico stage
        FundingStage storage record = Collection[++FundingStageNum];
        record.name = "PRE ICO";
        record.description = "PRE ICO Funding Phase";
        record.state = uint8(FundingStageStates.NEW);
        record.time_start = Funding_Setting_funding_time_start;
        record.time_end = Funding_Setting_funding_time_start + Funding_Setting_pre_ico_duration;
        record.amount_cap_hard = 100 ether;
        // funding method settings
        record.methods = uint8(FundingMethodIds.DIRECT_AND_MILESTONE);
        record.minimum_entry = 10 ether;
        // token settings
        record.start_parity = 0;
        record.use_parity_from_previous = false;
        record.token_share_percentage = 10;
        record.index = FundingStageNum;

        // add ico stage
        uint256 ico_start = Funding_Setting_funding_time_start + Funding_Setting_pre_ico_duration + Funding_Setting_pre_ico_cooldown_duration;
        uint256 ico_end = ico_start + Funding_Setting_ico_duration;

        record = Collection[++FundingStageNum];
        record.name = "ICO";
        record.description = "ICO Funding Phase";
        record.state = uint8(FundingStageStates.NEW);
        record.time_start = ico_start;
        record.time_end = ico_end;
        record.amount_cap_hard = 0;
        // funding method settings
        record.methods = uint8(FundingMethodIds.DIRECT_AND_MILESTONE);
        record.minimum_entry = 1 ether;
        // token settings
        record.start_parity = 0;
        record.use_parity_from_previous = true;
        record.token_share_percentage = 40;
        record.index = FundingStageNum;
    }

    function saveRequiredStateChanges() public returns (bool) {

        uint8 _FundingStageId = getFirstUsableFundingStageId();
        uint8 RequiredFundingStageState = getRequiredFundingStageStateChanges(_FundingStageId);

        if( RequiredFundingStageState != uint8(FundingStageStates.__IGNORED__) ) {
            currentFundingStage = _FundingStageId;
            return updateFundingStage( _FundingStageId, RequiredFundingStageState );
        }
        return false;
    }

    /*
    function getCurrentFundingStage() public returns (int8) {


    }

    function getAllowedFundingMethodsForCurrentPhase() public {

    }
    */

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
    /*
   function nextStepCycle() private requireInitialised returns (uint8) {


       var (CurrentFundingStageState, RequiredFundingStageState, RequiredEntityState) = getRequiredStateChanges(_FundingStageId);

       // make sure we're in development state
       if( getProjectCurrentState() == getProjectDevelopmentState() ) {

           uint8 recId = getFirstUsableFundingStageId();
           if(recId > 0) {

               // setRequirementsMet();

               FundingStage storage rec = collection[recId];
               uint8 nextState = rec.state + 1;
               rec.time_start = getDevelopmentStartDate();
               rec.time_end = rec.time_start + rec.duration;

               // update state
               updateFundingStage( rec.index, nextState );

               return recId;
           } else {

               return 0;
           }
       }

       // no records left.. or project state not in development
       // app should change project state to -> DELIVERED
       return 0;

    }
    */
    /*
    * Get first usable record ID
    *
    * @access       public
    * @type         method
    * @modifiers    onlyOwner, requireInitialised
    *
    * @return       uint8
    */
    function getFirstUsableFundingStageId() private view requireInitialised returns ( uint8 ) {
        for(uint8 i = 1; i <= FundingStageNum; i++) {
            FundingStage storage rec = Collection[i];
            if(rec.state != uint8(FundingStageStates.FINAL)) {
                return rec.index;
            }
        }
        return 0;
    }

    /*
    * Update Existing FundingStage
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

    function updateFundingStage(
        uint8 _record_id,
        uint8 _new_state
    )
    public
        requireInitialised
        FundingStageUpdateAllowed(_record_id, _new_state)
    returns (bool) {

        FundingStage storage rec = Collection[_record_id];
        rec.state       = uint8(FundingStageStates(_new_state)) ;

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

    modifier FundingStageUpdateAllowed(uint8 _FundingStageId, uint8 _new_state) {
        require( isFundingStageUpdateAllowed( _FundingStageId, _new_state )  );
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
    function isFundingStageUpdateAllowed(uint8 _FundingStageId, uint8 _new_state ) public view returns (bool) {

        var (CurrentFundingStageState, RequiredFundingStageState, RequiredEntityState) = getRequiredStateChanges(_FundingStageId);

        CurrentFundingStageState = 0;
        RequiredEntityState = 0;

        if(_new_state == uint8(RequiredFundingStageState)) {
            return true;
        }
        return false;
    }

    function getFundingStage(uint8 _FundingStageId) view internal returns (FundingStage) {
        return Collection[_FundingStageId];
    }


    function canAcceptPayment(uint256 _amount) view internal returns (bool) {
        FundingStage memory record = getFundingStage(currentFundingStage);

        // check if _amount is higher than entry minimum
        // check if _amount is lower than global maixmum - amount raised

        uint256 remaining = AmountCapHard - AmountRaised;

        if(
            _amount >= record.minimum_entry
            && _amount <= remaining
        )
            return true;

        return false;
    }

    /*
     * Funding Phase changes
     *
     * Method: Get FundingStage Required State Changes
     *
     * @access       public
     * @type         method
     * @modifiers    onlyOwner
     *
     * @param        uint8 _FundingStageId
     *
     * @return       uint8 RequiredFundingStageState
     */
    function getRequiredFundingStageStateChanges(uint8 _FundingStageId) public view returns (uint8) {

        // get FundingStage current state
        FundingStage memory record = getFundingStage(_FundingStageId);
        uint8 CurrentFundingStageState = record.state;
        uint8 RequiredFundingStageState = uint8(FundingStageStates.__IGNORED__);

        if(CurrentFundingStageState == uint8(FundingStageStates.NEW)) {

            /*
                If funding stage is not started and timestamp is after start time:
                - we need to change state to IN_PROGRESS so we can start receiving funds
            */
            if( getTimestamp() > record.time_start ) {
                return uint8(FundingStageStates.IN_PROGRESS);
            }
            /*
                - else we need to wait for funding stage to start..
            */

        } else if (CurrentFundingStageState == uint8(FundingStageStates.IN_PROGRESS)) {

            /*
                This is where we're accepting payments unless we can change state to FINAL

                1. Check if timestamp is after record time_end
                2. Check if AmountRaised equals AmountCapHard
                3. Has (optional) Funding Phase HardCap
                    - Check if AmountRaised equals Funding Phase HardCap

                All lead to state change => FINAL
            */


            // Time check
            if(getTimestamp() > record.time_end) {
                // Funding Phase ended passed
                return uint8(FundingStageStates.FINAL);
            }

            // Global Hard Cap Check
            if(AmountRaised == AmountCapHard) {
                // hard cap reached
                return uint8(FundingStageStates.FINAL);
            }

            // Has (optional) Funding Phase HardCap
            if(record.amount_cap_hard > 0) {
                // amount raised is Funding Phase HardCap
                if(AmountRaised == record.amount_cap_hard) {
                    return uint8(FundingStageStates.FINAL);
                }
            }

        } else if (CurrentFundingStageState == uint8(FundingStageStates.FINAL)) {

        }

        return RequiredFundingStageState;

    }








    /*
     * Method: Get FundingStage and Asset Required State Changes
     *
     * @access       public
     * @type         method
     * @modifiers    onlyOwner
     *
     * @param        uint8 _record_id
     *
     * @return       ( uint8 CurrentFundingStageState, uint8 RequiredFundingStageState, uint8 RequiredEntityState)
     */
    function getRequiredStateChanges( uint8 _FundingStageId ) public view returns (uint8, uint8, uint8) {

        // get FundingStage current state
        FundingStage memory record = getFundingStage(_FundingStageId);

        uint8 CurrentFundingStageState = record.state;
        uint8 RequiredFundingStageState = uint8(FundingStageStates.__IGNORED__);
        uint8 RequiredEntityState = uint8(FundingEntityStates.__IGNORED__);


        RequiredFundingStageState = getRequiredFundingStageStateChanges(_FundingStageId);

        if(RequiredFundingStageState == uint8(FundingStageStates.__IGNORED__))
        {

        }
        /*

            enum FundingEntityStates {
                __IGNORED__,
                NEW,
                WAITING,
                IN_PROGRESS,
                COOLDOWN,
                SUCCESSFUL,
                FAILED
            }

            // so this is where we need to retrieve funding from Direct Wallet
            // then generate tokens
            // once that is complete we change to FINAL
        if (RequiredFundingStageState == uint8(FundingStageStates.__IGNORED__)) {
            // after cashback stage.. move to donate
        } else if (record.state == uint8(FundingEntityStates.FAILED)) {
            // If records exist, allow them to be started
            // else tell project to change state to development
        }


        */

        return (CurrentFundingStageState, RequiredFundingStageState, RequiredEntityState);
    }


    

    /*
    function getHash(int8 actionType, bytes32 args) public returns ( bytes32 ) {
        return sha3(actionType, args);
    }

    function add() public onlyOwner {
        // find out AppEntity delivery state and based on that decide if initiator has access to call this or not

    }
    */

    function getTimestamp() view internal returns (uint256) {
        return now;
    }

}