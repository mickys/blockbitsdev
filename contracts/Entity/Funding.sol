/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Funding Contract code deployed and linked to the Application Entity


    !!! Links directly to Milestones

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./../Entity/FundingVault.sol";

import "./../Inputs/FundingInputDirect.sol";
import "./../Inputs/FundingInputMilestone.sol";


contract Funding is ApplicationAsset {

    address public multiSigOutputAddress;
    FundingInputDirect public DirectInput;
    FundingInputMilestone public MilestoneInput;

    mapping (bytes32 => uint8) public EntityStates;
    mapping (bytes32 => uint8) public RecordStates;

    uint8 public CurrentEntityState;

    // mapping (bytes32 => uint8) public FundingMethods;
    enum FundingMethodIds {
        __IGNORED__,
        DIRECT_ONLY, 				//
        MILESTONE_ONLY, 		    //
        DIRECT_AND_MILESTONE		//
    }

    event FundingStageCreated( uint8 indexed index, bytes32 indexed name );

    struct FundingStage {
        bytes32 name;
        bytes32 description;                // will change to bytes32 hash pointer ( swarm / ipfs storage )
        uint8   state;
        uint256 time_start;
        uint256 time_end;
        uint256 amount_cap_soft;            // 0 = not enforced
        uint256 amount_cap_hard;            // 0 = not enforced
        uint256 amount_raised;              // 0 = not enforced
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
    uint8 public FundingStageNum = 0;
    uint8 public currentFundingStage = 1;

    // funding settings
    uint256 public AmountRaised = 0;
    uint256 public AmountCapSoft = 0;
    uint256 public AmountCapHard = 0;
    uint8 public TokenSellPercentage = 0;

    uint256 public Funding_Setting_funding_time_start = 0;
    uint256 public Funding_Setting_funding_time_end = 0;

    uint256 public Funding_Setting_cashback_time_start = 0;
    uint256 public Funding_Setting_cashback_time_end = 0;

    // to be taken from application bylaws
    uint256 public Funding_Setting_cashback_before_start_wait_duration = 1 days;
    uint256 public Funding_Setting_cashback_duration = 90 days;


    event LifeCycle();
    event DebugRecordRequiredChanges( uint8 indexed _current, uint8 indexed _required );
    event DebugEntityRequiredChanges( uint8 indexed _current, uint8 indexed _required );
    event DebugCallAgain(uint8 indexed _who);
    event EventEntityProcessor(uint8 indexed _state);

    event DebugAction(bytes32 indexed _name, bool indexed _allowed);

    function Funding() ApplicationAsset public {
        setApplicationStates();
        CurrentEntityState = getEntityState("NEW");
    }

    function setApplicationStates() internal {

        // Contract States
        EntityStates["__IGNORED__"]     = 0;
        EntityStates["NEW"]             = 1;
        EntityStates["WAITING"]         = 2;
        EntityStates["IN_PROGRESS"]     = 3;
        EntityStates["COOLDOWN"]        = 4;
        EntityStates["FUNDING_ENDED"]   = 5;
        EntityStates["FAILED"]          = 6;
        EntityStates["SUCCESSFUL"]      = 7;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
        RecordStates["NEW"]             = 1;
        RecordStates["IN_PROGRESS"]     = 2;
        RecordStates["FINAL"]           = 3;
    }

    function getRecordState(bytes32 name) public view returns (uint8) {
        return RecordStates[name];
    }

    function getEntityState(bytes32 name) public view returns (uint8) {
        return EntityStates[name];
    }

    function addSettings(address _outputAddress) public requireNotInitialised {
        multiSigOutputAddress = _outputAddress;
    }

    function addFundingStage(
        bytes32 _name,
        bytes32 _description,
        uint256 _time_start,
        uint256 _time_end,
        uint256 _amount_cap_soft,
        uint256 _amount_cap_hard,   // required > 0
        uint8   _methods,
        uint256 _minimum_entry,
        uint256 _start_parity,
        bool    _use_parity_from_previous,
        uint8   _token_share_percentage
    )
        public
        requireNotInitialised
    {

        // make sure end time is later than start time
        if(_time_end <= _time_start) {
            revert();
        }

        // make sure hard cap exists!
        if(_amount_cap_hard == 0) {
            revert();
        }

        // make sure soft cap is not higher than hard cap
        if(_amount_cap_soft >= _amount_cap_hard) {
            revert();
        }

        // make sure we're not selling more than 100% of token share... as that's not possible
        if(_token_share_percentage > 100) {
            revert();
        }

        if(FundingStageNum > 0) {
            FundingStage storage prevRecord = Collection[FundingStageNum];

            // if other funding stages exist we need to make sure that the following things don't happen:

            // 1 - new stage does not start before the previous one ends
            if( _time_start <= prevRecord.time_end ) {
                revert();
            }

            // 2 - make sure previous stage + new stage token percentage does not amount to over 100%
            if( _token_share_percentage + prevRecord.token_share_percentage > 100 ) {
                 revert();
            }

        }

        FundingStage storage record = Collection[++FundingStageNum];
        record.name             = _name;
        record.description      = _description;
        record.time_start       = _time_start;
        record.time_end         = _time_end;
        record.amount_cap_soft  = _amount_cap_soft;
        record.amount_cap_hard  = _amount_cap_hard;

        // funding method settings
        record.methods          = _methods;
        record.minimum_entry    = _minimum_entry;

        // token settings
        record.start_parity             = _start_parity;
        record.use_parity_from_previous = _use_parity_from_previous;
        record.token_share_percentage   = _token_share_percentage;

        // state new
        record.state = getRecordState("NEW");
        record.index = FundingStageNum;

        FundingStageCreated( FundingStageNum, _name );

        adjustFundingSettingsBasedOnNewFundingStage();
    }

    function adjustFundingSettingsBasedOnNewFundingStage() internal requireNotInitialised {

        uint256 local_AmountCapSoft;
        uint256 local_AmountCapHard;
        uint8 local_TokenSellPercentage;

        for(uint8 i = 1; i <= FundingStageNum; i++) {
            FundingStage storage rec = Collection[i];

            // cumulate soft and hard cap
            local_AmountCapSoft+=rec.amount_cap_soft;
            local_AmountCapHard+=rec.amount_cap_hard;
            local_TokenSellPercentage+= rec.token_share_percentage;

            // first stage determines when we start receiving funds
            if( i == 1 ) {
                Funding_Setting_funding_time_start = rec.time_start;
            }
            // last stage determines when we stop receiving funds
            if( i == FundingStageNum ) {
                Funding_Setting_funding_time_end = rec.time_end;
            }
        }

        // set globals
        AmountCapSoft = local_AmountCapSoft;
        AmountCapHard = local_AmountCapHard;
        TokenSellPercentage = local_TokenSellPercentage;

        // set cashback just in case
        // cashback starts 1 day after funding status is failed
        Funding_Setting_cashback_time_start = Funding_Setting_funding_time_end + Funding_Setting_cashback_before_start_wait_duration;
        Funding_Setting_cashback_time_end = Funding_Setting_cashback_time_start + Funding_Setting_cashback_duration;
    }

    function allowedPaymentMethod(uint8 _payment_method) public pure returns (bool) {
        if(
        _payment_method == uint8(FundingMethodIds.DIRECT_ONLY) ||
        _payment_method == uint8(FundingMethodIds.MILESTONE_ONLY)
        ){
            return true;
        } else {
            return false;
        }
    }

    function runBeforeInitialization() internal requireNotInitialised returns(bool) {
        DirectInput = new FundingInputDirect();
        MilestoneInput = new FundingInputMilestone();
        EventRunBeforeInit(assetName);
        return true;
    }

    event EventVaultReceivedPayment(address indexed _vault, uint8 indexed _payment_method, uint256 indexed _amount );

    function receivePayment(address _sender, uint8 _payment_method)
        payable
        public
        requireInitialised
        onlyInputPaymentMethod
        returns(bool)
    {
        if(allowedPaymentMethod(_payment_method)) {
            FundingVault vault;

            // no vault present
            if(!hasVault(_sender)) {
                // create and initialize a new one
                vault = new FundingVault();

                if(vault.initialize(_sender, multiSigOutputAddress, address(this), getMilestoneAssetAddressFromApp())) {
                    // store new vault address.
                    vaultList[_sender] = vault;
                } else {
                    revert();
                }
            } else {
                // use existing vault
                vault = FundingVault(vaultList[_sender]);
            }

            // save in local mapping, emit event, send value to vault, return success or revert.
            EventVaultReceivedPayment(vault, _payment_method, msg.value);

            if( vault.addPayment.value(msg.value)( _payment_method ) ) {
                return true;
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    // TODO: change to milestone asset
    function getMilestoneAssetAddressFromApp() returns(address) {
        //
        return address(this);
    }

    modifier onlyInputPaymentMethod() {
        require(msg.sender != 0x0 && ( msg.sender == address(DirectInput) || msg.sender == address(MilestoneInput) ));
        _;
    }

    mapping  (address => address) public vaultList;

    function hasVault(address _sender) internal view returns(bool) {
        if(vaultList[_sender] != address(0x0)) {
            return true;
        } else {
            return false;
        }
    }

    /*
        Hook into Project State
    */
    function getProjectCurrentState() public pure returns (uint8) {
        return 5;
    }
    /*
        Hook into Project State
    */
    function getProjectDevelopmentState() public pure returns (uint8) {
        return 5; // IN DEVELOPMENT
    }


    function canAcceptPayment(uint256 _amount) public view returns (bool) {

        // funding state should be IN_PROGRESS
        if( CurrentEntityState == getEntityState("IN_PROGRESS") ) {

            // get current record
            FundingStage memory record = Collection[currentFundingStage];

            /*
            soft cap is used to determine if funding is successful
            hard cap is used to determine if payment can be accepted,
                 each funding stage has it's own hard cap!
                 so.. globals do nothing here
            */

            // check if _amount is higher than entry minimum

            // check if _amount is lower than remaining ( global maixmum - amount raised )
            // check if _amount is also lower than record.amount_cap_hard if amount_cap_hard > 0

            // uint256 remainingGlobal = AmountCapHard - AmountRaised;
            uint256 remaining = record.amount_cap_hard - record.amount_raised;

            if( _amount >= record.minimum_entry  && _amount <= remaining ) {

                // we have a stage hard cap.
                if(record.amount_cap_hard > 0) {

                }
                // && _amount <= remaining

                return true;
            }
        }
        return false;
    }


    function getHardCapsSoFar() internal view returns (uint256) {
        uint256 hard_cap = 0;

        for(int i = 1; i <= currentFundingStage; i++ ) {
            FundingStage memory record = Collection[currentFundingStage];
            hard_cap+=record.amount_cap_hard;
        }
        return hard_cap;
    }

    function checkStateAcceptsPayment() public view returns (bool) {

        if( CurrentEntityState == getEntityState("IN_PROGRESS") ) {
            return true;
        }
        return false;
    }

    function checkStateStartCashBack() public pure returns (bool) {
        /*
            Method should be able to override any internal state that failed for some reason.        
        */
        
    }
    
    function checkStateAcceptsCashBack() public view returns (bool) {

        /*
        enum ThisEntityStates {
            __IGNORED__,
            NEW,
            WAITING,
            IN_PROGRESS,
            COOLDOWN,
            FUNDING_ENDED,
            SUCCESSFUL,
            FAILED,
            CASHBACK_IN_PROGRESS,
            CASHBACK_COMPLETE,
            FINAL
        }
        */
        
        
        // Funding_Setting_cashback_time_start
    
        if( CurrentEntityState == getEntityState("IN_PROGRESS") ) {
            return true;
        }
        return false;
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

    function nextStepCycle() public requireInitialised returns (uint8) {

        // fire event so we can check how many times this method runs.
        LifeCycle();

        // make sure we're in development state
        if (getProjectCurrentState() == getProjectDevelopmentState()) {

            saveRequiredStateChanges();
            if( getRecordStateRequiredChanges() != getRecordState("__IGNORED__") ) {
                nextStepCycle();
            }

            /*
            uint8 recId = getFirstUsableFundingStageId();
            if (recId > 0) {

                // setRequirementsMet();

                FundingStage storage rec = collection[recId];
                uint8 nextState = rec.state + 1;
                rec.time_start = getDevelopmentStartDate();
                rec.time_end = rec.time_start + rec.duration;

                // update state
                updateFundingStage(rec.index, nextState);

                return recId;
            }
            else {

                return 0;
            }
            */
        }

        // no records left.. or project state not in development
        // app should change project state to -> DELIVERED
        return 0;

    }

    function saveRequiredStateChanges() public returns (bool) {
        // getRequiredStateChanges();
        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();

        CurrentRecordState = 0;
        EntityStateRequired = 0;

        if( RecordStateRequired != getRecordState("__IGNORED__") ) {

            updateFundingStage( RecordStateRequired );
            if( RecordStateRequired == getRecordState("FINAL") ) {
                if(currentFundingStage == FundingStageNum) {
                    // set funding complete by time!
                } else {
                    // jump to next stage if needed
                    currentFundingStage++;
                }
            }
            return true;
        }
        return false;
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
    /*
    function getFirstUsableFundingStageId() public view requireInitialised returns ( uint8 ) {
        for(uint8 i = 1; i <= FundingStageNum; i++) {
            FundingStage storage rec = Collection[i];
            if(rec.state != getRecordState("FINAL")) {
                return rec.index;
            }
        }
        return 0;
    }
    */
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
        uint8 _new_state
    )
    public
        requireInitialised
        FundingStageUpdateAllowed(_new_state)
    returns (bool) {

        FundingStage storage rec = Collection[currentFundingStage];
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

    modifier FundingStageUpdateAllowed(uint8 _new_state) {
        require( isFundingStageUpdateAllowed( _new_state )  );
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
    function isFundingStageUpdateAllowed(uint8 _new_state ) public view returns (bool) {

        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();

        CurrentRecordState = 0;
        EntityStateRequired = 0;

        if(_new_state == uint8(RecordStateRequired)) {
            return true;
        }
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
     * @return       uint8 RecordStateRequired
     */
    function getRecordStateRequiredChanges() public view returns (uint8) {

        // get FundingStage current state

        FundingStage memory record = Collection[currentFundingStage];
        // uint8 CurrentRecordState = record.state;
        uint8 RecordStateRequired = getRecordState("__IGNORED__");


        /*
            If funding stage is not started and timestamp is after start time:
            - we need to change state to IN_PROGRESS so we can start receiving funds
        */
        if( getTimestamp() >= record.time_start ) {
            RecordStateRequired = getRecordState("IN_PROGRESS");
        }

        /*
            This is where we're accepting payments unless we can change state to FINAL

            1. Check if timestamp is after record time_end
            2. Check if AmountRaised equals AmountCapHard
            3. Has (optional) Funding Phase HardCap
                - Check if AmountRaised equals Funding Phase HardCap

            All lead to state change => FINAL
        */

        // Time check
        if(getTimestamp() >= record.time_end) {
            // Funding Phase ended passed
            return getRecordState("FINAL");
        }

        // Global Hard Cap Check
        if(AmountRaised == AmountCapHard) {
            // hard cap reached
            return getRecordState("FINAL");
        }

        // Has (optional) Funding Phase HardCap
        if(record.amount_cap_hard > 0) {
            // amount raised is Funding Phase HardCap
            if(AmountRaised == record.amount_cap_hard) {
                return getRecordState("FINAL");
            }
        }

        /*
            - else we need to wait for funding stage to start..
        */

        return RecordStateRequired;

    }


    function hasStateChanges() public view returns (bool) {
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

    function doStateChanges(bool recursive) public {
        var (CurrentRecordState, RecordStateRequired, EntityStateRequired) = getRequiredStateChanges();
        bool callAgain = false;

        DebugRecordRequiredChanges( CurrentRecordState, RecordStateRequired );
        DebugEntityRequiredChanges( CurrentEntityState, EntityStateRequired );

        if( RecordStateRequired != getRecordState("__IGNORED__") ) {
            updateFundingStage( RecordStateRequired );
            if( RecordStateRequired == getRecordState("FINAL") ) {
                if(currentFundingStage < FundingStageNum) {
                    // jump to next stage
                    currentFundingStage++;
                }
            }
            DebugCallAgain(2);
            callAgain = true;
        }

        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            if(CurrentEntityState != EntityStateRequired) {
                CurrentEntityState = EntityStateRequired;
                DebugCallAgain(1);
                callAgain = true;
            }
        }

        if(recursive && callAgain) {
            doStateChanges(recursive);
        } else {
            // call action processor
            EntityProcessor(recursive);
        }
    }

    function EntityProcessor(bool recursive) internal {

        EventEntityProcessor( CurrentEntityState );

        if( CurrentEntityState == getEntityState("NEW") ) {
            // nothing to do here
        } else if ( CurrentEntityState == getEntityState("WAITING") ) {
            // nothing to do here
        } else if ( CurrentEntityState == getEntityState("IN_PROGRESS") ) {
            // nothing to do here
        } else if ( CurrentEntityState == getEntityState("COOLDOWN") ) {
            // nothing to do here
        } else if ( CurrentEntityState == getEntityState("FUNDING_ENDED") ) {

            /*
                process internals and determine if successful or failed
            */

            // Global Hard Cap Check
            if(AmountRaised == AmountCapHard) {
                // hard cap reached
                CurrentEntityState = getEntityState("FINAL");
            } else {
                CurrentEntityState = getEntityState("FAILED");
            }

        } else if ( CurrentEntityState == getEntityState("SUCCESSFUL") ) {

            /*
                retrieve funds from vaults, allocate tokens
            */

        } else if ( CurrentEntityState == getEntityState("FAILED") ) {
            // nothing to do here, app needs to change state to CashBack!

        } else if ( CurrentEntityState == getEntityState("CASHBACK_IN_PROGRESS") ) {
            // nothing to do here, app needs to change state

        } else if ( CurrentEntityState == getEntityState("CASHBACK_COMPLETE") ) {
            // nothing to do here, app needs to change state

        } else if ( CurrentEntityState == getEntityState("FINAL") ) {

        }

        doStateChanges(recursive);
    }

    /*
     * Method: Get Record and Entity State Changes
     *
     * @access       public
     * @type         method
     * @modifiers    onlyOwner
     *
     * @return       ( uint8 CurrentRecordState, uint8 RecordStateRequired, uint8 EntityStateRequired)
     */
    function getRequiredStateChanges() public view returns (uint8, uint8, uint8) {

        // get FundingStage current state
        FundingStage memory record = Collection[currentFundingStage];

        uint8 CurrentRecordState = record.state;
        uint8 RecordStateRequired = getRecordStateRequiredChanges();
        uint8 EntityStateRequired = getEntityState("__IGNORED__");

        // just deployed
        if( CurrentEntityState == getEntityState("NEW") ) {
            /*
                Entity processed, we move to waiting for funding start
            */
            EntityStateRequired = getEntityState("WAITING");

        } else if ( CurrentEntityState == getEntityState("WAITING") ) {
            /*
                Waiting for funding start
            */

        } else if ( CurrentEntityState == getEntityState("IN_PROGRESS") ) {
            /*
                We're accepting funding here
            */

        } else if ( CurrentEntityState == getEntityState("COOLDOWN") ) {

            // doStateChanges action

        } else if ( CurrentEntityState == getEntityState("FUNDING_ENDED") ) {

            // Processor action

        } else if ( CurrentEntityState == getEntityState("SUCCESSFUL") ) {
            // Processor action

        } else if ( CurrentEntityState == getEntityState("FAILED") ) {

            EntityStateRequired = getEntityState("CASHBACK_IN_PROGRESS");

        } else if ( CurrentEntityState == getEntityState("CASHBACK_IN_PROGRESS") ) {
            // nothing to do here, app needs to change state

        } else if ( CurrentEntityState == getEntityState("CASHBACK_COMPLETE") ) {
            // nothing to do here, app needs to change state

        } else if ( CurrentEntityState == getEntityState("FINAL") ) {

        }



        /*
            // so this is where we need to retrieve funding from Direct Wallet
            // then generate tokens
            // once that is complete we change to FINAL
        if (NewRecordStateRequired == getRecordState("__IGNORED__)) {
            // after cashback stage.. move to donate
        } else if (record.state == getEntityState("FAILED)) {
            // If records exist, allow them to be started
            // else tell project to change state to development
        }


        */


        if(CurrentRecordState != RecordStateRequired) {

            // direct state overrides by funding stage
            if(RecordStateRequired == getRecordState("IN_PROGRESS") ) {
                // both funding stage and entity states need to move to IN_PROGRESS
                EntityStateRequired = getEntityState("IN_PROGRESS");

            } else if (RecordStateRequired == getRecordState("FINAL")) {
                // funding stage moves to FINAL

                if (currentFundingStage == FundingStageNum) {
                    // if current funding is last
                    EntityStateRequired = getEntityState("FUNDING_ENDED");
                }
                else {
                    // start cooldown between funding stages
                    EntityStateRequired = getEntityState("COOLDOWN");
                }
            }
        } else {
            RecordStateRequired = getRecordState("__IGNORED__");
        }

        return (CurrentRecordState, RecordStateRequired, EntityStateRequired);
    }


    function getTimestamp() view public returns (uint256) {
        return now;
    }

}