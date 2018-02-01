pragma solidity ^0.4.17;

/*

 * @name        Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Used as a resolver to retrieve the latest deployed version of the Application

 ENS: gateway.main.blockbits.eth will point directly to this contract.

    ADD ENS domain ownership / transfer methods

*/





contract GatewayInterface {

    event EventGatewayNewLinkRequest ( address indexed newAddress );
    event EventGatewayNewAddress ( address indexed newAddress );

    address public currentApplicationEntityAddress;     // currently linked ApplicationEntity address
    ApplicationEntity private currentApp;

    address public deployerAddress;

    // constructor
    function GatewayInterface() public {
        deployerAddress = msg.sender;
    }

    /**
    @notice Get current ApplicationEntity Contract address
    @return {
        "currentApplicationEntityAddress": Currently bound application address
    }
    */
    function getApplicationAddress() external view returns (address) {
        return currentApplicationEntityAddress;
    }


    /**
    @notice ApplicationEntity Contract requests to be linked
    @dev modifier validCodeUpgradeInitiator
    @param _newAddress address, The address of the application contract
    @param _sourceCodeUrl bytes32, The url of the application source code on etherscan
    @return {
        "bool": TRUE if successfully processed
    }
    */
    function requestCodeUpgrade( address _newAddress, bytes32 _sourceCodeUrl )
        external
        validCodeUpgradeInitiator
        returns (bool)
    {
        require(_newAddress != address(0x0));

        EventGatewayNewLinkRequest ( _newAddress );

        /*
            case 1 - Newly Deployed Gateway and Application

            gateway links to app and initializes
        */
        if(currentApplicationEntityAddress == address(0x0)) {

            if(!ApplicationEntity(_newAddress).initializeAssetsToThisApplication()) {
                revert();
            }
            link(_newAddress);
            return true;
        } else {
            /*
                case 2 - Actual Code Upgrade Request

                - Current app should exist already
                - Current app
                    - Create a proposal
                    - Vote on result
                    - Get Result
                    - Approve Result
            */
            currentApp.createCodeUpgradeProposal(_newAddress, _sourceCodeUrl);
        }
    }

    /**
    @notice ApplicationEntity Contract approves code Upgrade
    @dev modifier onlyCurrentApplicationEntity
    @param _newAddress address, The address of the new application contract
    @return {
        "bool": TRUE if successfully processed
    }
    */
    function approveCodeUpgrade( address _newAddress ) external returns (bool) {
        require(msg.sender == currentApplicationEntityAddress);
        uint8 atState = currentApp.CurrentEntityState();
        lockCurrentApp();
        if(!currentApp.transferAssetsToNewApplication(_newAddress)) {
            revert();
        }
        link(_newAddress);
        currentApp.setUpgradeState( atState );
        return true;
    }

    /**
    @notice Locks current application entity
    @dev Internally used by gateway to lock current application entity before switching to the new one
    */
    function lockCurrentApp() internal {
        if(!currentApp.lock()) {
            revert();
        }
    }

    /**
    @notice Link to new Application Entity
    @param _newAddress address, The address of the new application contract
    @return {
        "bool": TRUE if successfully processed
    }
    */
    function link( address _newAddress ) internal returns (bool) {

        currentApplicationEntityAddress = _newAddress;
        currentApp = ApplicationEntity(currentApplicationEntityAddress);
        if( !currentApp.initialize() ) {
            revert();
        }
        EventGatewayNewAddress(currentApplicationEntityAddress);
        return true;
    }


    /**
    @notice Get current News Contract address
    @return {
        "address": 0x address of the News Contract
    }
    */
    function getNewsContractAddress() external view returns (address) {
        return currentApp.NewsContractEntity();
    }

    /**
    @notice Get current Listing Contract address
    @return {
        "address": 0x address of the Listing Contract
    }
    */
    function getListingContractAddress() external view returns (address) {
        return currentApp.ListingContractEntity();
    }

    /*
    * Validates if new application's deployer is allowed to upgrade current app
    */

    /**
    @notice Validates if new application's deployer is allowed to upgrade current app
    */
    modifier validCodeUpgradeInitiator() {
        bool valid = false;

        ApplicationEntity newDeployedApp = ApplicationEntity(msg.sender);
        address newDeployer = newDeployedApp.deployerAddress();

        if(newDeployer == deployerAddress) {
            valid = true;
        } else {
            if(currentApplicationEntityAddress != address(0x0)) {
                currentApp = ApplicationEntity(currentApplicationEntityAddress);
                if(currentApp.canInitiateCodeUpgrade(newDeployer)) {
                    valid = true;
                }
            }
        }

        // ok if current app accepts newDeployer as a token holder that can do a code upgrade
        // ok if newDeployer is oldDeployer
        require( valid == true );
        _;
    }
}

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
    uint256 public totalSupply;

    function balanceOf(address who) public view returns (uint256);

    function transfer(address to, uint256 value) public returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 indexed value);
}

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  /*
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }
  */

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
    using SafeMath for uint256;

    mapping (address => uint256) public balances;

    /**
    * @dev transfer token for a specified address
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));

        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
        return true;
    }

    /**
    * @dev Gets the balance of the specified address.
    * @param _owner The address to query the the balance of.
    * @return An uint256 representing the amount owned by the passed address.
    */
    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

}

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender) public view returns (uint256);

    function transferFrom(address from, address to, uint256 value) public returns (bool);

    function approve(address spender, uint256 value) public returns (bool);

    event Approval(address indexed owner, address indexed spender, uint256 indexed value);
}

/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

    mapping (address => mapping (address => uint256)) allowed;


    /**
     * @dev Transfer tokens from one address to another
     * @param _from address The address which you want to send tokens from
     * @param _to address The address which you want to transfer to
     * @param _value uint256 the amount of tokens to be transferred
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));

        uint256 _allowance = allowed[_from][msg.sender];

        // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
        // require (_value <= _allowance);

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = _allowance.sub(_value);
        Transfer(_from, _to, _value);
        return true;
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     *
     * Beware that changing an allowance with this method brings the risk that someone may use both the old
     * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param _spender The address which will spend the funds.
     * @param _value The amount of tokens to be spent.
     */
    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }

    /**
     * @dev Function to check the amount of tokens that an owner allowed to a spender.
     * @param _owner address The address which owns the funds.
     * @param _spender address The address which will spend the funds.
     * @return A uint256 specifying the amount of tokens still available for the spender.
     */
    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    /**
     * approve should be called when allowed[_spender] == 0. To increment
     * allowed value is better to use this function to avoid 2 calls (and wait until
     * the first transaction is mined)
     * From MonolithDAO Token.sol
     */
    function increaseApproval(address _spender, uint _addedValue)
    public
    returns (bool success) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval(address _spender, uint _subtractedValue)
    public
    returns (bool success) {
        uint oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        }
        else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

}

/*

 * @name        Token Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Zeppelin ERC20 Standard Token

*/





contract Token is StandardToken {
    string public  symbol;
    string public  name;
    uint8 public   decimals;
    uint256 public totalSupply;
    string public  version = 'v1';

    address public owner;

    event Mint(address indexed to, uint256 amount);
    event MintFinished();

    bool public mintingFinished = false;

    function Token(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol,
        string _version
    )
    public
    {
        decimals = _decimalUnits;                               // Amount of decimals for display purposes
        totalSupply = _initialAmount;                           // Set initial supply.. should be 0 if we're minting
        name = _tokenName;                                      // Set the name for display purposes
        symbol = _tokenSymbol;                                  // Set the symbol for display purposes
        version = _version;                                     // Set token version string

        // set internal owner that can mint tokens.
        owner = msg.sender;
    }

    modifier canMint() {
        require(!mintingFinished);
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /**
     * @dev Function to mint tokens
     * @param _to The address that will receive the minted tokens.
     * @param _amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
        totalSupply = totalSupply.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        Mint(_to, _amount);
        Transfer(address(0), _to, _amount);
        return true;
    }

    /**
     * @dev Function to stop minting new tokens.
     * @return True if the operation was successful.
     */
    function finishMinting() onlyOwner canMint public returns (bool) {
        mintingFinished = true;
        MintFinished();
        return true;
    }
}

/*

 * @name        Application Entity Generic Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    Used for the ABI interface when assets need to call Application Entity.

    This is required, otherwise we end up loading the assets themselves when we load the ApplicationEntity contract
    and end up in a loop
*/



contract ApplicationEntityABI {

    address public ProposalsEntity;
    address public FundingEntity;
    address public MilestonesEntity;
    address public MeetingsEntity;
    address public BountyManagerEntity;
    address public TokenManagerEntity;
    address public ListingContractEntity;
    address public FundingManagerEntity;
    address public NewsContractEntity;

    address public deployerAddress;

    uint8 public CurrentEntityState;

    function getAssetAddressByName(bytes32 _name) public view returns (address);

    function getBylawUint256(bytes32 name) public view returns (uint256);
    function getBylawBytes32(bytes32 name) public view returns (bytes32);

    function getEntityState(bytes32 name) public view returns (uint8);

    function canInitiateCodeUpgrade(address _sender) public view returns(bool);

    function acceptCodeUpgradeProposal(address _newAddress) external ;
}

/*

 * @name        Application Asset Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Any contract inheriting this will be usable as an Asset in the Application Entity

*/




contract ApplicationAsset {

    event EventAppAssetOwnerSet(bytes32 indexed _name, address indexed _owner);
    event EventRunBeforeInit(bytes32 indexed _name);
    event EventRunBeforeApplyingSettings(bytes32 indexed _name);


    mapping (bytes32 => uint8) public EntityStates;
    mapping (bytes32 => uint8) public RecordStates;
    uint8 public CurrentEntityState;

    event EventEntityProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);
    event DebugEntityRequiredChanges( bytes32 _assetName, uint8 indexed _current, uint8 indexed _required );

    bytes32 public assetName;

    /* Asset records */
    uint8 public RecordNum = 0;

    /* Asset initialised or not */
    bool public _initialized = false;

    /* Asset settings present or not */
    bool public _settingsApplied = false;

    /* Asset owner ( ApplicationEntity address ) */
    address public owner = address(0x0) ;
    address public deployerAddress;

    function ApplicationAsset() public {
        deployerAddress = msg.sender;
    }

    function setInitialApplicationAddress(address _ownerAddress) public onlyDeployer requireNotInitialised {
        owner = _ownerAddress;
    }

    function setInitialOwnerAndName(bytes32 _name) external
        requireNotInitialised
        onlyOwner
        returns (bool)
    {
        // init states
        setAssetStates();
        assetName = _name;
        // set initial state
        CurrentEntityState = getEntityState("NEW");
        runBeforeInitialization();
        _initialized = true;
        EventAppAssetOwnerSet(_name, owner);
        return true;
    }

    function setAssetStates() internal {
        // Asset States
        EntityStates["__IGNORED__"]     = 0;
        EntityStates["NEW"]             = 1;
        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
    }

    function getRecordState(bytes32 name) public view returns (uint8) {
        return RecordStates[name];
    }

    function getEntityState(bytes32 name) public view returns (uint8) {
        return EntityStates[name];
    }

    function runBeforeInitialization() internal requireNotInitialised  {
        EventRunBeforeInit(assetName);
    }

    function applyAndLockSettings()
        public
        onlyDeployer
        requireInitialised
        requireSettingsNotApplied
        returns(bool)
    {
        runBeforeApplyingSettings();
        _settingsApplied = true;
        return true;
    }

    function runBeforeApplyingSettings() internal requireInitialised requireSettingsNotApplied  {
        EventRunBeforeApplyingSettings(assetName);
    }

    function transferToNewOwner(address _newOwner) public requireInitialised onlyOwner returns (bool) {
        require(owner != address(0x0) && _newOwner != address(0x0));
        owner = _newOwner;
        EventAppAssetOwnerSet(assetName, owner);
        return true;
    }

    function getApplicationAssetAddressByName(bytes32 _name)
        public
        view
        returns(address)
    {
        address asset = ApplicationEntityABI(owner).getAssetAddressByName(_name);
        if( asset != address(0x0) ) {
            return asset;
        } else {
            revert();
        }
    }

    function getApplicationState() public view returns (uint8) {
        return ApplicationEntityABI(owner).CurrentEntityState();
    }

    function getApplicationEntityState(bytes32 name) public view returns (uint8) {
        return ApplicationEntityABI(owner).getEntityState(name);
    }

    function getAppBylawUint256(bytes32 name) public view requireInitialised returns (uint256) {
        ApplicationEntityABI CurrentApp = ApplicationEntityABI(owner);
        return CurrentApp.getBylawUint256(name);
    }

    function getAppBylawBytes32(bytes32 name) public view requireInitialised returns (bytes32) {
        ApplicationEntityABI CurrentApp = ApplicationEntityABI(owner);
        return CurrentApp.getBylawBytes32(name);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyApplicationEntity() {
        require(msg.sender == owner);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true);
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false);
        _;
    }

    modifier requireSettingsApplied() {
        require(_settingsApplied == true);
        _;
    }

    modifier requireSettingsNotApplied() {
        require(_settingsApplied == false);
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployerAddress);
        _;
    }

    modifier onlyAsset(bytes32 _name) {
        address AssetAddress = getApplicationAssetAddressByName(_name);
        require( msg.sender == AssetAddress);
        _;
    }

    function getTimestamp() view public returns (uint256) {
        return now;
    }


}

/*

 * @name        Meetings Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Meetings Contract code deployed and linked to the Application Entity

*/





contract Meetings is ApplicationAsset {
    /*
    function add() public view onlyOwner {
        // find out AppEntity delivery state and based on that decide if initiator has access to call this or not

    }
    */

    struct Record {
        bytes32 hash;
        bytes32 name;
        uint8 state;
        uint256 time_start;                     // start at unixtimestamp
        uint256 duration;
        uint8 index;
    }

    mapping (uint8 => Record) public Collection;

}

/*

 * @name        Milestones Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Milestones Contract code deployed and linked to the Application Entity

*/









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
        // EntityStates["VOTING_ENDED"]              = 21;
        EntityStates["VOTING_ENDED_YES"]             = 22;
        EntityStates["VOTING_ENDED_NO"]              = 23;
        EntityStates["VOTING_ENDED_NO_FINAL"]        = 25;

        EntityStates["VOTING_FUNDS_PROCESSED"]       = 30;
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

    function getBylawsCashBackVoteRejectedDuration() public view returns (uint256) {
        return getAppBylawUint256("cashback_investor_no");
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
        uint8   _perc
    )
        public
        onlyDeployer
        requireSettingsNotApplied
    {

        Record storage rec = Collection[++RecordNum];

        rec.name                = _name;
        rec.description         = _description;
        rec.duration            = _duration;
        rec.funding_percentage  = _perc;
        rec.state               = getRecordState("NEW");
        rec.index               = RecordNum;
    }

    function getMilestoneFundingPercentage(uint8 recordId) public view returns (uint8){
        return Collection[recordId].funding_percentage;
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
            EntityProcessor(EntityStateRequired);
            DebugCallAgain(1);
            callAgain = true;
        }


    }

    function MilestonesCanChange() internal view returns (bool) {
        if(
            CurrentEntityState == getEntityState("WAITING") ||
            CurrentEntityState == getEntityState("IN_DEVELOPMENT") ||
            CurrentEntityState == getEntityState("VOTING_FUNDS_PROCESSED")
        ) {
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

                if( getTimestamp() >= record.time_end || ( getTimestamp() >= record.meeting_time && record.meeting_time > 0 ) ) {
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
    }


    function EntityProcessor(uint8 EntityStateRequired) internal {
        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Do State Specific Updates
        // Update our Entity State
        CurrentEntityState = EntityStateRequired;

        if ( CurrentEntityState == getEntityState("DEADLINE_MEETING_TIME_YES") ) {
            // create meeting
            // Meetings.create("internal", "MILESTONE_END", "");

        } else if( CurrentEntityState == getEntityState("VOTING_IN_PROGRESS") ) {
            // create proposal and start voting on it
            createMilestoneAcceptanceProposal();

        } else if( CurrentEntityState == getEntityState("WAITING_MEETING_TIME") ) {

            PostponeMeetingIfApproved();

        } else if( CurrentEntityState == getEntityState("VOTING_ENDED_YES") ) {

        } else if( CurrentEntityState == getEntityState("VOTING_ENDED_NO") ) {

            // possible cashback time starts from now
            MilestoneCashBackTime = getTimestamp();

        } else if( CurrentEntityState == getEntityState("VOTING_FUNDS_PROCESSED") ) {
            MilestoneCashBackTime = 0;
            startNextMilestone();
        }

    }

    mapping (bytes32 => bool) public MilestonePostponingHash;

    function PostponeMeetingIfApproved() internal {
        if(MilestonePostponingHash[ bytes32(currentRecord) ] == false ) {
            if(PostponeForCurrentMilestoneIsApproved()) {
                uint256 time = ProposalsEntity.getCurrentMilestonePostponingProposalDuration();
                Record storage record = Collection[currentRecord];
                record.time_end = record.time_end + time;
                MilestonePostponingHash[ bytes32(currentRecord) ] = true;
            }
        }
    }

    function PostponeForCurrentMilestoneIsApproved() internal view returns ( bool ) {
        uint8 ProposalActionType = ProposalsEntity.getActionType("MILESTONE_POSTPONING");
        uint8 ProposalRecordState = ProposalsEntity.getCurrentMilestoneProposalStatusForType( ProposalActionType  );
        if(ProposalRecordState == ProposalsEntity.getRecordState("VOTING_RESULT_YES") ) {
            return true;
        }
        return false;
    }

    uint256 public MilestoneCashBackTime = 0;

    function afterVoteNoCashBackTime() public view returns ( bool ) {
        uint256 time =  MilestoneCashBackTime + getBylawsCashBackVoteRejectedDuration();
        // after cash back time
        if(getTimestamp() > time) {
            return true;
        }
        return false;
    }

    function getHash(uint8 actionType, bytes32 arg1, bytes32 arg2) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1, arg2);
    }

    function getCurrentHash() public view returns ( bytes32 ) {
        return getHash(1, bytes32(currentRecord), 0);
    }

    mapping (bytes32 => uint256) public ProposalIdByHash;
    function createMilestoneAcceptanceProposal() internal {
        if(ProposalIdByHash[ getCurrentHash() ] == 0x0 ) {
            ProposalIdByHash[ getCurrentHash() ] = ProposalsEntity.createMilestoneAcceptanceProposal();
        }
    }

    function getCurrentProposalId() internal view returns ( uint256 ) {
        return ProposalIdByHash[ getCurrentHash() ];
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

        // set current record end date etc
        rec.time_ended = getTimestamp();
        rec.state = getRecordState("FINAL");

        if(currentRecord < RecordNum) {
            // jump to next milestone
            currentRecord++;

            Record storage nextRec = Collection[currentRecord];
                nextRec.time_start = rec.time_ended;
                nextRec.time_end = rec.time_ended + nextRec.duration;
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

                    if(MilestonePostponingHash[ bytes32(currentRecord) ] == false) {
                        if(PostponeForCurrentMilestoneIsApproved()) {
                            EntityStateRequired = getEntityState("WAITING_MEETING_TIME");
                        }
                    }

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

                uint8 ProposalRecordState = ProposalsEntity.getProposalState( getCurrentProposalId() );

                if ( ProposalRecordState == ProposalsEntity.getRecordState("VOTING_RESULT_YES") ) {
                    EntityStateRequired = getEntityState("VOTING_ENDED_YES");
                }

                if (ProposalRecordState == ProposalsEntity.getRecordState("VOTING_RESULT_NO") ) {
                    EntityStateRequired = getEntityState("VOTING_ENDED_NO");
                }

            } else if ( CurrentEntityState == getEntityState("VOTING_ENDED_YES") ) {

                if( FundingManagerEntity.CurrentEntityState() == FundingManagerEntity.getEntityState("MILESTONE_PROCESS_DONE")) {
                    EntityStateRequired = getEntityState("VOTING_FUNDS_PROCESSED");
                }

            } else if ( CurrentEntityState == getEntityState("VOTING_ENDED_NO") ) {

                // check if milestone cashout period has passed and if so process fund releases
                if(afterVoteNoCashBackTime()) {
                    EntityStateRequired = getEntityState("VOTING_ENDED_NO_FINAL");
                }

            } else if ( CurrentEntityState == getEntityState("VOTING_ENDED_NO_FINAL") ) {

                if( FundingManagerEntity.CurrentEntityState() == FundingManagerEntity.getEntityState("MILESTONE_PROCESS_DONE")) {
                    EntityStateRequired = getEntityState("VOTING_FUNDS_PROCESSED");
                }

            } else if ( CurrentEntityState == getEntityState("VOTING_FUNDS_PROCESSED") ) {


                if(currentRecord < RecordNum) {
                    EntityStateRequired = getEntityState("IN_DEVELOPMENT");
                } else {

                    if(FundingManagerEntity.getCurrentMilestoneProcessed() == true) {
                        if(FundingManagerEntity.CurrentEntityState() == FundingManagerEntity.getEntityState("COMPLETE_PROCESS_DONE")) {
                            EntityStateRequired = getEntityState("DEVELOPMENT_COMPLETE");
                        } else {
                            EntityStateRequired = getEntityState("VOTING_FUNDS_PROCESSED");
                        }
                    } else {
                        EntityStateRequired = getEntityState("IN_DEVELOPMENT");
                    }
                }

            }
            /*
            else if ( CurrentEntityState == getEntityState("DEVELOPMENT_COMPLETE") ) {

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

/*

 * @name        Funding Vault
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    each purchase creates a separate funding vault contract
*/

// add Token / Ether Black Hole prevention

// add Emergency Fund

// think about team's locked tokens












contract FundingVault {

    /* Asset initialised or not */
    bool public _initialized = false;

    /*
        Addresses:
        vaultOwner - the address of the wallet that stores purchases in this vault ( investor address )
        outputAddress - address where funds go upon successful funding or successful milestone release
        managerAddress - address of the "FundingManager"
    */
    address public vaultOwner ;
    address public outputAddress;
    address public managerAddress;

    /*
        Lock and BlackHole settings
    */

    bool public allFundingProcessed = false;
    bool public DirectFundingProcessed = false;

    /*
        Assets
    */
    // ApplicationEntityABI public ApplicationEntity;
    Funding FundingEntity;
    FundingManager FundingManagerEntity;
    Milestones MilestonesEntity;
    Proposals ProposalsEntity;
    // TokenManager TokenManagerEntity;
    TokenSCADAVariable TokenSCADAEntity;
    // address TokenSCADAAddress;
    Token TokenEntity ;

    /*
        Globals
    */
    uint256 public amount_direct = 0;
    uint256 public amount_milestone = 0;

    // bylaws
    bool public emergencyFundReleased = false;
    uint8 emergencyFundPercentage = 0;
    uint256 BylawsCashBackOwnerMiaDuration;
    uint256 BylawsCashBackVoteRejectedDuration;
    uint256 BylawsProposalVotingDuration;

    struct PurchaseStruct {
        uint256 unix_time;
        uint8 payment_method;
        uint256 amount;
        uint8 funding_stage;
        uint16 index;
    }

    mapping(uint16 => PurchaseStruct) public purchaseRecords;
    uint16 public purchaseRecordsNum;

    event EventPaymentReceived(uint8 indexed _payment_method, uint256 indexed _amount, uint16 indexed _index );
    event VaultInitialized(address indexed _owner);

    function initialize(
        address _owner,
        address _output,
        address _fundingAddress,
        address _milestoneAddress,
        address _proposalsAddress
    )
        public
        requireNotInitialised
        returns(bool)
    {
        VaultInitialized(_owner);

        outputAddress = _output;
        vaultOwner = _owner;

        // whomever creates this contract is the manager.
        managerAddress = msg.sender;

        // assets
        FundingEntity = Funding(_fundingAddress);
        FundingManagerEntity = FundingManager(managerAddress);
        MilestonesEntity = Milestones(_milestoneAddress);
        ProposalsEntity = Proposals(_proposalsAddress);

        address TokenManagerAddress = FundingEntity.getApplicationAssetAddressByName("TokenManager");
        TokenManager TokenManagerEntity = TokenManager(TokenManagerAddress);

        address TokenAddress = TokenManagerEntity.TokenEntity();
        TokenEntity = Token(TokenAddress);

        address TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();
        TokenSCADAEntity = TokenSCADAVariable(TokenSCADAAddress);

        // set Emergency Fund Percentage if available.
        address ApplicationEntityAddress = TokenManagerEntity.owner();
        ApplicationEntityABI ApplicationEntity = ApplicationEntityABI(ApplicationEntityAddress);

        // get Application Bylaws
        emergencyFundPercentage             = uint8( ApplicationEntity.getBylawUint256("emergency_fund_percentage") );
        BylawsCashBackOwnerMiaDuration      = ApplicationEntity.getBylawUint256("cashback_owner_mia_dur") ;
        BylawsCashBackVoteRejectedDuration  = ApplicationEntity.getBylawUint256("cashback_investor_no") ;
        BylawsProposalVotingDuration        = ApplicationEntity.getBylawUint256("proposal_voting_duration") ;

        // init
        _initialized = true;
        return true;
    }



    /*
        The funding contract decides if a vault should receive payments or not, since it's the one that creates them,
        no point in creating one if you can't accept payments.
    */

    mapping (uint8 => uint256) public stageAmounts;
    mapping (uint8 => uint256) public stageAmountsDirect;

    function addPayment(
        uint8 _payment_method,
        uint8 _funding_stage
    )
        public
        payable
        requireInitialised
        onlyManager
        returns (bool)
    {
        if(msg.value > 0 && FundingEntity.allowedPaymentMethod(_payment_method)) {

            // store payment
            PurchaseStruct storage purchase = purchaseRecords[++purchaseRecordsNum];
                purchase.unix_time = now;
                purchase.payment_method = _payment_method;
                purchase.amount = msg.value;
                purchase.funding_stage = _funding_stage;
                purchase.index = purchaseRecordsNum;

            // assign payment to direct or milestone
            if(_payment_method == 1) {
                amount_direct+= purchase.amount;
                stageAmountsDirect[_funding_stage]+=purchase.amount;
            }

            if(_payment_method == 2) {
                amount_milestone+= purchase.amount;
            }

            // in order to not iterate through purchase records, we just increase funding stage amount.
            // issue with iterating over them, while processing vaults, would be that someone could create a large
            // number of payments, which would result in an "out of gas" / stack overflow issue, that would lock
            // our contract, so we don't really want to do that.
            // doing it this way also saves some gas
            stageAmounts[_funding_stage]+=purchase.amount;

            EventPaymentReceived( purchase.payment_method, purchase.amount, purchase.index );
            return true;
        } else {
            revert();
        }
    }

    function getBoughtTokens() public view returns (uint256) {
        return TokenSCADAEntity.getBoughtTokens( address(this), false );
    }

    function getDirectBoughtTokens() public view returns (uint256) {
        return TokenSCADAEntity.getBoughtTokens( address(this), true );
    }


    mapping (uint8 => uint256) public etherBalances;
    mapping (uint8 => uint256) public tokenBalances;
    uint8 public BalanceNum = 0;

    bool public BalancesInitialised = false;
    function initMilestoneTokenAndEtherBalances() internal
    {
        if(BalancesInitialised == false) {

            uint256 milestoneTokenBalance = TokenEntity.balanceOf(address(this));
            uint256 milestoneEtherBalance = this.balance;

            // no need to worry about fractions because at the last milestone, we send everything that's left.

            // emergency fund takes it's percentage from initial balances.
            if(emergencyFundPercentage > 0) {
                tokenBalances[0] = milestoneTokenBalance / 100 * emergencyFundPercentage;
                etherBalances[0] = milestoneEtherBalance / 100 * emergencyFundPercentage;

                milestoneTokenBalance-=tokenBalances[0];
                milestoneEtherBalance-=etherBalances[0];
            }

            // milestones percentages are then taken from what's left.
            for(uint8 i = 1; i <= MilestonesEntity.RecordNum(); i++) {

                uint8 perc = MilestonesEntity.getMilestoneFundingPercentage(i);
                tokenBalances[i] = milestoneTokenBalance / 100 * perc;
                etherBalances[i] = milestoneEtherBalance / 100 * perc;
            }

            BalanceNum = i;
            BalancesInitialised = true;
        }
    }

    function ReleaseFundsAndTokens()
        public
        requireInitialised
        onlyManager
        returns (bool)
    {
        // first make sure cashback is not possible, and that we've not processed everything in this vault
        if(!canCashBack() && allFundingProcessed == false) {

            if(FundingManagerEntity.CurrentEntityState() == FundingManagerEntity.getEntityState("FUNDING_SUCCESSFUL_PROGRESS")) {

                // case 1, direct funding only
                if(amount_direct > 0 && amount_milestone == 0) {

                    // if we have direct funding and no milestone balance, transfer everything and lock vault
                    // to save gas in future processing runs.

                    // transfer tokens to the investor
                    TokenEntity.transfer(vaultOwner, TokenEntity.balanceOf( address(this) ) );

                    // transfer ether to the owner's wallet
                    outputAddress.transfer(this.balance);

                    // lock vault.. and enable black hole methods
                    allFundingProcessed = true;

                } else {
                // case 2 and 3, direct funding only

                    if(amount_direct > 0 && DirectFundingProcessed == false ) {
                        TokenEntity.transfer(vaultOwner, getDirectBoughtTokens() );
                        // transfer "direct funding" ether to the owner's wallet
                        outputAddress.transfer(amount_direct);
                        DirectFundingProcessed = true;
                    }

                    // process and initialize milestone balances, emergency fund, etc, once
                    initMilestoneTokenAndEtherBalances();
                }
                return true;

            } else if(FundingManagerEntity.CurrentEntityState() == FundingManagerEntity.getEntityState("MILESTONE_PROCESS_PROGRESS")) {

                // get current milestone so we know which one we need to release funds for.
                uint8 milestoneId = MilestonesEntity.currentRecord();

                uint256 transferTokens = tokenBalances[milestoneId];
                uint256 transferEther = etherBalances[milestoneId];

                if(milestoneId == BalanceNum - 1) {
                    // we're processing the last milestone and balance, this means we're transferring everything left.
                    // this is done to make sure we've transferred everything, even "ether that got mistakenly sent to this address"
                    // as well as the emergency fund if it has not been used.
                    transferTokens = TokenEntity.balanceOf(address(this));
                    transferEther = this.balance;
                }

                // set balances to 0 so we can't transfer multiple times.
                // tokenBalances[milestoneId] = 0;
                // etherBalances[milestoneId] = 0;

                // transfer tokens to the investor
                TokenEntity.transfer(vaultOwner, transferTokens );

                // transfer ether to the owner's wallet
                outputAddress.transfer(transferEther);

                if(milestoneId == BalanceNum - 1) {
                    // lock vault.. and enable black hole methods
                    allFundingProcessed = true;
                }

                return true;
            }
        }

        return false;
    }


    function releaseTokensAndEtherForEmergencyFund()
        public
        requireInitialised
        onlyManager
        returns (bool)
    {
        if( emergencyFundReleased == false && emergencyFundPercentage > 0) {

            // transfer tokens to the investor
            TokenEntity.transfer(vaultOwner, tokenBalances[0] );

            // transfer ether to the owner's wallet
            outputAddress.transfer(etherBalances[0]);

            emergencyFundReleased = true;
            return true;
        }
        return false;
    }

    function ReleaseFundsToInvestor()
        public
        requireInitialised
        isOwner
    {
        if(canCashBack()) {

            // IF we're doing a cashback
            // transfer vault tokens back to owner address
            // send all ether to wallet owner

            // get token balance
            uint256 myBalance = TokenEntity.balanceOf(address(this));
            // transfer all vault tokens to owner
            if(myBalance > 0) {
                TokenEntity.transfer(outputAddress, myBalance );
            }

            // now transfer all remaining ether back to investor address
            vaultOwner.transfer(this.balance);

            // update FundingManager Locked Token Amount, so we don't break voting
            FundingManagerEntity.VaultRequestedUpdateForLockedVotingTokens( vaultOwner );

            // disallow further processing, so we don't break Funding Manager.
            // this method can still be called to collect future black hole ether to this vault.
            allFundingProcessed = true;
        }
    }

    /*
        1 - if the funding of the project Failed, allows investors to claim their locked ether back.
        2 - if the Investor votes NO to a Development Milestone Completion Proposal, where the majority
            also votes NO allows investors to claim their locked ether back.
        3 - project owner misses to set the time for a Development Milestone Completion Meeting allows investors
        to claim their locked ether back.
    */
    function canCashBack() public view requireInitialised returns (bool) {

        // case 1
        if(checkFundingStateFailed()) {
            return true;
        }
        // case 2
        if(checkMilestoneStateInvestorVotedNoVotingEndedNo()) {
            return true;
        }
        // case 3
        if(checkOwnerFailedToSetTimeOnMeeting()) {
            return true;
        }

        return false;
    }

    function checkFundingStateFailed() public view returns (bool) {
        if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FAILED_FINAL") ) {
            return true;
        }

        // also check if funding period ended, and 7 days have passed and no processing was done.
        if( FundingEntity.getTimestamp() >= FundingEntity.Funding_Setting_cashback_time_start() ) {

            // should only be possible if funding entity has been stuck in processing for more than 7 days.
            if( FundingEntity.CurrentEntityState() != FundingEntity.getEntityState("SUCCESSFUL_FINAL") ) {
                return true;
            }
        }

        return false;
    }

    function checkMilestoneStateInvestorVotedNoVotingEndedNo() public view returns (bool) {
        if(MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("VOTING_ENDED_NO") ) {
            // first we need to make sure we actually voted.
            if( ProposalsEntity.getHasVoteForCurrentMilestoneRelease(vaultOwner) == true) {
                // now make sure we voted NO, and if so return true
                if( ProposalsEntity.getMyVoteForCurrentMilestoneRelease( vaultOwner ) == false) {
                    return true;
                }
            }
        }
        return false;
    }

    function checkOwnerFailedToSetTimeOnMeeting() public view returns (bool) {
        // Looks like the project owner is missing in action
        // they only have to do 1 thing, which is set the meeting time 7 days before the end of the milestone so that
        // investors know when they need to show up for a progress report meeting

        // as they did not, we consider them missing in action and allow investors to retrieve their locked ether back
        if( MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("DEADLINE_MEETING_TIME_FAILED") ) {
            return true;
        }
        return false;
    }


    modifier isOwner() {
        require(msg.sender == vaultOwner);
        _;
    }

    modifier onlyManager() {
        require(msg.sender == managerAddress);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true);
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false);
        _;
    }
}

/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Funding Contract code deployed and linked to the Application Entity

*/












contract FundingManager is ApplicationAsset {

    Funding FundingEntity;
    TokenManager TokenManagerEntity;
    Token TokenEntity;
    TokenSCADAVariable TokenSCADAEntity;
    Proposals ProposalsEntity;
    Milestones MilestonesEntity;

    uint256 public LockedVotingTokens = 0;

    event EventFundingManagerReceivedPayment(address indexed _vault, uint8 indexed _payment_method, uint256 indexed _amount );
    event EventFundingManagerProcessedVault(address _vault, uint256 id );

    mapping  (address => address) public vaultList;
    mapping  (uint256 => address) public vaultById;
    uint256 public vaultNum = 0;

    function setAssetStates() internal {
        // Asset States
        EntityStates["__IGNORED__"]                 = 0;
        EntityStates["NEW"]                         = 1;
        EntityStates["WAITING"]                     = 2;

        EntityStates["FUNDING_FAILED_START"]        = 10;
        EntityStates["FUNDING_FAILED_PROGRESS"]     = 11;
        EntityStates["FUNDING_FAILED_DONE"]         = 12;

        EntityStates["FUNDING_SUCCESSFUL_START"]    = 20;
        EntityStates["FUNDING_SUCCESSFUL_PROGRESS"] = 21;
        EntityStates["FUNDING_SUCCESSFUL_DONE"]     = 22;
        EntityStates["FUNDING_SUCCESSFUL_ALLOCATE"] = 25;


        EntityStates["MILESTONE_PROCESS_START"]     = 30;
        EntityStates["MILESTONE_PROCESS_PROGRESS"]  = 31;
        EntityStates["MILESTONE_PROCESS_DONE"]      = 32;

        EntityStates["EMERGENCY_PROCESS_START"]     = 40;
        EntityStates["EMERGENCY_PROCESS_PROGRESS"]  = 41;
        EntityStates["EMERGENCY_PROCESS_DONE"]      = 42;


        EntityStates["COMPLETE_PROCESS_START"]     = 100;
        EntityStates["COMPLETE_PROCESS_PROGRESS"]  = 101;
        EntityStates["COMPLETE_PROCESS_DONE"]      = 102;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;

    }

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);
        EventRunBeforeApplyingSettings(assetName);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        TokenManagerEntity = TokenManager(TokenManagerAddress);
        TokenEntity = Token(TokenManagerEntity.TokenEntity());

        address TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();
        TokenSCADAEntity = TokenSCADAVariable(TokenSCADAAddress) ;

        address MilestonesAddress = getApplicationAssetAddressByName('Milestones');
        MilestonesEntity = Milestones(MilestonesAddress) ;

        address ProposalsAddress = getApplicationAssetAddressByName('Proposals');
        ProposalsEntity = Proposals(ProposalsAddress) ;
    }



    function receivePayment(address _sender, uint8 _payment_method, uint8 _funding_stage)
        payable
        public
        requireInitialised
        onlyAsset('Funding')
        returns(bool)
    {
        // check that msg.value is higher than 0, don't really want to have to deal with minus in case the network breaks this somehow
        if(msg.value > 0) {
            FundingVault vault;

            // no vault present
            if(!hasVault(_sender)) {
                // create and initialize a new one
                vault = new FundingVault();
                if(vault.initialize(
                    _sender,
                    FundingEntity.multiSigOutputAddress(),
                    address(FundingEntity),
                    address(getApplicationAssetAddressByName('Milestones')),
                    address(getApplicationAssetAddressByName('Proposals'))
                )) {
                    // store new vault address.
                    vaultList[_sender] = vault;
                    // increase internal vault number
                    vaultNum++;
                    // assign vault to by int registry
                    vaultById[vaultNum] = vault;

                } else {
                    revert();
                }
            } else {
                // use existing vault
                vault = FundingVault(vaultList[_sender]);
            }

            EventFundingManagerReceivedPayment(vault, _payment_method, msg.value);

            if( vault.addPayment.value(msg.value)( _payment_method, _funding_stage ) ) {

                // if payment is received in the vault then mint tokens based on the received value!
                TokenManagerEntity.mint( vault, TokenSCADAEntity.getTokensForValueInCurrentStage(msg.value) );

                return true;
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    function getMyVaultAddress(address _sender) public view returns (address) {
        return vaultList[_sender];
    }

    function hasVault(address _sender) internal view returns(bool) {
        if(vaultList[_sender] != address(0x0)) {
            return true;
        } else {
            return false;
        }
    }

    bool public fundingProcessed = false;
    uint256 public lastProcessedVaultId = 0;
    uint8 public VaultCountPerProcess = 10;
    bytes32 public currentTask = "";

    mapping (bytes32 => bool) public taskByHash;

    function setVaultCountPerProcess(uint8 _perProcess) external onlyDeployer {
        if(_perProcess > 0) {
            VaultCountPerProcess = _perProcess;
        } else {
            revert();
        }
    }

    function getHash(bytes32 actionType, bytes32 arg1) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1);
    }

    function getCurrentMilestoneProcessed() public view returns (bool) {
        return taskByHash[ getHash("MILESTONE_PROCESS_START", getCurrentMilestoneIdHash() ) ];
    }



    function ProcessVaultList(uint8 length) internal {

        if(taskByHash[currentTask] == false) {
            if(
                CurrentEntityState == getEntityState("FUNDING_FAILED_PROGRESS") ||
                CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ||
                CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS") ||
                CurrentEntityState == getEntityState("EMERGENCY_PROCESS_PROGRESS") ||
                CurrentEntityState == getEntityState("COMPLETE_PROCESS_PROGRESS")
            ) {

                uint256 start = lastProcessedVaultId + 1;
                uint256 end = start + length - 1;

                if(end > vaultNum) {
                    end = vaultNum;
                }

                // first run
                if(start == 1) {
                    // reset LockedVotingTokens, as we reindex them
                    LockedVotingTokens = 0;
                }

                for(uint256 i = start; i <= end; i++) {
                    address currentVault = vaultById[i];
                    EventFundingManagerProcessedVault(currentVault, i);
                    ProcessFundingVault(currentVault);
                    lastProcessedVaultId++;
                }
                if(lastProcessedVaultId >= vaultNum ) {
                    // reset iterator and set task state to true so we can't call it again.
                    lastProcessedVaultId = 0;
                    taskByHash[currentTask] = true;
                }
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    function processFundingFailedFinished() public view returns (bool) {
        bytes32 thisHash = getHash("FUNDING_FAILED_START", "");
        return taskByHash[thisHash];
    }

    function processFundingSuccessfulFinished() public view returns (bool) {
        bytes32 thisHash = getHash("FUNDING_SUCCESSFUL_START", "");
        return taskByHash[thisHash];
    }

    function getCurrentMilestoneIdHash() internal view returns (bytes32) {
        return bytes32(MilestonesEntity.currentRecord());
    }

    function processMilestoneFinished() public view returns (bool) {
        bytes32 thisHash = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneIdHash());
        return taskByHash[thisHash];
    }

    function processEmergencyFundReleaseFinished() public view returns (bool) {
        bytes32 thisHash = getHash("EMERGENCY_PROCESS_START", bytes32(0));
        return taskByHash[thisHash];
    }

    function ProcessFundingVault(address vaultAddress ) internal {
        FundingVault vault = FundingVault(vaultAddress);

        if(vault.allFundingProcessed() == false) {

            if(CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS")) {

                // tokens are minted and allocated to this vault when it receives payments.
                // vault should now hold as many tokens as the investor bought using direct and milestone funding,
                // as well as the ether they sent
                // "direct funding" release -> funds to owner / tokens to investor
                if(!vault.ReleaseFundsAndTokens()) {
                    revert();
                }

            } else if(CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS")) {
                // release funds to owner / tokens to investor
                if(!vault.ReleaseFundsAndTokens()) {
                    revert();
                }

            } else if(CurrentEntityState == getEntityState("EMERGENCY_PROCESS_PROGRESS")) {
                // release emergency funds to owner / tokens to investor
                if(!vault.releaseTokensAndEtherForEmergencyFund()) {
                    revert();
                }
            }

            // For proposal voting, we need to know how many investor locked tokens remain.
            LockedVotingTokens+= getAfterTransferLockedTokenBalances(vaultAddress, true);

        }
    }

    function getAfterTransferLockedTokenBalances(address vaultAddress, bool excludeCurrent) public view returns (uint256) {
        FundingVault vault = FundingVault(vaultAddress);
        uint8 currentMilestone = MilestonesEntity.currentRecord();

        uint256 LockedBalance = 0;
        // handle emergency funding first
        if(vault.emergencyFundReleased() == false) {
            LockedBalance+=vault.tokenBalances(0);
        }

        // get token balances starting from current
        uint8 start = currentMilestone;

        if(CurrentEntityState != getEntityState("FUNDING_SUCCESSFUL_PROGRESS")) {
            if(excludeCurrent == true) {
                start++;
            }
        }

        for(uint8 i = start; i < vault.BalanceNum() ; i++) {
            LockedBalance+=vault.tokenBalances(i);
        }
        return LockedBalance;

    }

    function VaultRequestedUpdateForLockedVotingTokens(address owner) public {
        // validate sender
        address vaultAddress = vaultList[owner];
        if(msg.sender == vaultAddress){
            // get token balances starting from current
            LockedVotingTokens-= getAfterTransferLockedTokenBalances(vaultAddress, false);
        }
    }

    bool FundingPoolBalancesAllocated = false;

    function AllocateAfterFundingBalances() internal {
        // allocate owner, advisor, bounty pools
        if(FundingPoolBalancesAllocated == false) {

            // mint em!
            uint256 mintedSupply = TokenEntity.totalSupply();
            uint256 salePercent = getAppBylawUint256("token_sale_percentage");

            // find one percent
            uint256 onePercent = (mintedSupply * 1 / salePercent * 100) / 100;

            // bounty tokens
            uint256 bountyPercent = getAppBylawUint256("token_bounty_percentage");
            uint256 bountyValue = onePercent * bountyPercent;

            address BountyManagerAddress = getApplicationAssetAddressByName("BountyManager");
            TokenManagerEntity.mint( BountyManagerAddress, bountyValue );

            // project tokens
            // should be 40
            uint256 projectPercent = 100 - salePercent - bountyPercent;
            uint256 projectValue = onePercent * projectPercent;

            // project tokens get minted to Token Manager's address, and are locked there
            TokenManagerEntity.mint( TokenManagerEntity, projectValue );
            TokenManagerEntity.finishMinting();

            FundingPoolBalancesAllocated = true;
        }
    }


    function doStateChanges() public {

        var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
        bool callAgain = false;

        DebugEntityRequiredChanges( assetName, returnedCurrentEntityState, EntityStateRequired );

        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            EntityProcessor(EntityStateRequired);
            callAgain = true;
        }
    }

    function hasRequiredStateChanges() public view returns (bool) {
        bool hasChanges = false;
        var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
        // suppress unused local variable warning
        returnedCurrentEntityState = 0;
        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            hasChanges = true;
        }
        return hasChanges;
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {

        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Update our Entity State
        CurrentEntityState = EntityStateRequired;
        // Do State Specific Updates

// Funding Failed
        if ( EntityStateRequired == getEntityState("FUNDING_FAILED_START") ) {
            // set ProcessVaultList Task
            currentTask = getHash("FUNDING_FAILED_START", "");
            CurrentEntityState = getEntityState("FUNDING_FAILED_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("FUNDING_FAILED_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

// Funding Successful
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_START") ) {

            // init SCADA variable cache.
            //if(TokenSCADAEntity.initCacheForVariables()) {

            // start processing vaults
            currentTask = getHash("FUNDING_SUCCESSFUL_START", "");
            CurrentEntityState = getEntityState("FUNDING_SUCCESSFUL_PROGRESS");

        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_ALLOCATE") ) {
            AllocateAfterFundingBalances();

// Milestones
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_START") ) {
            currentTask = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneIdHash() );
            CurrentEntityState = getEntityState("MILESTONE_PROCESS_PROGRESS");

        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

// Emergency funding release
        } else if ( EntityStateRequired == getEntityState("EMERGENCY_PROCESS_START") ) {
            currentTask = getHash("EMERGENCY_PROCESS_START", bytes32(0) );
            CurrentEntityState = getEntityState("EMERGENCY_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("EMERGENCY_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

// Completion
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_START") ) {
            currentTask = getHash("COMPLETE_PROCESS_START", "");
            CurrentEntityState = getEntityState("COMPLETE_PROCESS_PROGRESS");

        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
            // release platform owner tokens from token manager
            TokenManagerEntity.ReleaseOwnersLockedTokens( FundingEntity.multiSigOutputAddress() );
            CurrentEntityState = getEntityState("COMPLETE_PROCESS_DONE");
        }

    }

    /*
     * Method: Get Entity Required State Changes
     *
     * @access       public
     * @type         method
     *
     * @return       ( uint8 CurrentEntityState, uint8 EntityStateRequired )
     */
    function getRequiredStateChanges() public view returns (uint8, uint8) {

        uint8 EntityStateRequired = getEntityState("__IGNORED__");

        if(ApplicationInFundingOrDevelopment()) {

            if ( CurrentEntityState == getEntityState("WAITING") ) {
                /*
                    This is where we decide if we should process something
                */

                // For funding
                if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FAILED")) {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_START");
                }
                else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL")) {
                    // make sure we haven't processed this yet
                    if(taskByHash[ getHash("FUNDING_SUCCESSFUL_START", "") ] == false) {
                        EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_START");
                    }
                }
                else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL")) {

                    if ( processMilestoneFinished() == false) {
                        if(
                            MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("VOTING_ENDED_YES") ||
                            MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("VOTING_ENDED_NO_FINAL")
                        ) {
                            EntityStateRequired = getEntityState("MILESTONE_PROCESS_START");
                        }
                    }

                    if(processEmergencyFundReleaseFinished() == false) {
                        if(ProposalsEntity.EmergencyFundingReleaseApproved() == true) {
                            EntityStateRequired = getEntityState("EMERGENCY_PROCESS_START");
                        }
                    }

                    // else, check if all milestones have been processed and try finalising development process
                    // EntityStateRequired = getEntityState("COMPLETE_PROCESS_START");


                }

            } else if ( CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
                // still in progress? check if we should move to done
                if ( processFundingSuccessfulFinished() ) {
                    EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_ALLOCATE");
                } else {
                    EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_PROGRESS");
                }

            } else if ( CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_ALLOCATE") ) {

                if(FundingPoolBalancesAllocated) {
                    EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_DONE");
                }

            } else if ( CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_DONE") ) {
                EntityStateRequired = getEntityState("WAITING");

    // Funding Failed
            } else if ( CurrentEntityState == getEntityState("FUNDING_FAILED_PROGRESS") ) {
                // still in progress? check if we should move to done
                if ( processFundingFailedFinished() ) {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_DONE");
                } else {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_PROGRESS");
                }

    // Milestone process
            } else if ( CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
                // still in progress? check if we should move to done

                if ( processMilestoneFinished() ) {
                    EntityStateRequired = getEntityState("MILESTONE_PROCESS_DONE");
                } else {
                    EntityStateRequired = getEntityState("MILESTONE_PROCESS_PROGRESS");
                }

            } else if ( CurrentEntityState == getEntityState("MILESTONE_PROCESS_DONE") ) {

                if(processMilestoneFinished() == false) {
                    EntityStateRequired = getEntityState("WAITING");

                } else if(MilestonesEntity.currentRecord() == MilestonesEntity.RecordNum()) {
                    EntityStateRequired = getEntityState("COMPLETE_PROCESS_START");
                }

    // Emergency funding release
            } else if ( CurrentEntityState == getEntityState("EMERGENCY_PROCESS_PROGRESS") ) {
                // still in progress? check if we should move to done

                if ( processEmergencyFundReleaseFinished() ) {
                    EntityStateRequired = getEntityState("EMERGENCY_PROCESS_DONE");
                } else {
                    EntityStateRequired = getEntityState("EMERGENCY_PROCESS_PROGRESS");
                }
            } else if ( CurrentEntityState == getEntityState("EMERGENCY_PROCESS_DONE") ) {
                EntityStateRequired = getEntityState("WAITING");

    // Completion
            } else if ( CurrentEntityState == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
                EntityStateRequired = getEntityState("COMPLETE_PROCESS_PROGRESS");
            }
        } else {

            if( CurrentEntityState == getEntityState("NEW") ) {
                // general so we know we initialized
                EntityStateRequired = getEntityState("WAITING");
            }
        }

        return (CurrentEntityState, EntityStateRequired);
    }

    function ApplicationInFundingOrDevelopment() public view returns(bool) {
        uint8 AppState = getApplicationState();
        if(
            AppState == getApplicationEntityState("IN_FUNDING") ||
            AppState == getApplicationEntityState("IN_DEVELOPMENT")
        ) {
            return true;
        }
        return false;
    }



}

/*

 * @name        General Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/



contract FundingInputGeneral {

    uint8 public typeId = 0;
    address public FundingAssetAddress;

    event EventInputPaymentReceived(address sender, uint amount, uint8 _type);

    function FundingInputGeneral() public {
        FundingAssetAddress = msg.sender;
    }

    function () public payable {
        buy();
    }

    function buy() public payable returns(bool) {
        if(msg.value > 0) {
            if(isContract(FundingAssetAddress)) {
                if(FundingAssetAddress.call.value(msg.value)(bytes4(bytes32(keccak256("receivePayment(address,uint8)"))), msg.sender, typeId)) {
                    EventInputPaymentReceived(msg.sender, msg.value, typeId);
                    return true;
                } else {
                    revert();
                }
            }
            else {
                revert();
            }
        } else {
            revert();
        }
    }

    // this call adds 704 gas, good enough to keep
    function isContract(address addr) internal view returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }
}

/*

 * @name        Direct Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/





contract FundingInputDirect is FundingInputGeneral {
    function FundingInputDirect() FundingInputGeneral() public {
        typeId = 1;
    }
}

/*

 * @name        Milestone Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/





contract FundingInputMilestone is FundingInputGeneral {
    function FundingInputMilestone() FundingInputGeneral() public {
        typeId = 2;
    }
}

/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Funding Contract code deployed and linked to the Application Entity


    !!! Links directly to Milestones

*/










contract Funding is ApplicationAsset {

    address public multiSigOutputAddress;
    FundingInputDirect public DirectInput;
    FundingInputMilestone public MilestoneInput;


    // mapping (bytes32 => uint8) public FundingMethods;
    enum FundingMethodIds {
        __IGNORED__,
        DIRECT_ONLY, 				//
        MILESTONE_ONLY, 		    //
        DIRECT_AND_MILESTONE		//
    }

    TokenManager public TokenManagerEntity;
    FundingManager public FundingManagerEntity;

    event FundingStageCreated( uint8 indexed index, bytes32 indexed name );

    struct FundingStage {
        bytes32 name;
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
        uint256 fixed_tokens;
        uint8   price_addition_percentage;  //
        uint8   token_share_percentage;
        uint8   index;
    }

    mapping (uint8 => FundingStage) public Collection;
    uint8 public FundingStageNum = 0;
    uint8 public currentFundingStage = 1;

    // funding settings
    uint256 public AmountRaised = 0;
    uint256 public MilestoneAmountRaised = 0;

    uint256 public GlobalAmountCapSoft = 0;
    uint256 public GlobalAmountCapHard = 0;

    uint8 public TokenSellPercentage = 0;

    uint256 public Funding_Setting_funding_time_start = 0;
    uint256 public Funding_Setting_funding_time_end = 0;

    uint256 public Funding_Setting_cashback_time_start = 0;
    // end time is ignored at this stage, anyone can cashback forever if funding fails.
    uint256 public Funding_Setting_cashback_time_end = 0;

    // to be taken from application bylaws
    uint256 public Funding_Setting_cashback_before_start_wait_duration = 7 days;
    uint256 public Funding_Setting_cashback_duration = 365 days;

    event LifeCycle();
    event DebugRecordRequiredChanges( bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required );
    event DebugCallAgain(uint8 indexed _who);

    event EventEntityProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);
    event EventRecordProcessor(bytes32 indexed _assetName, uint8 indexed _current, uint8 indexed _required);

    event DebugAction(bytes32 indexed _name, bool indexed _allowed);


    event EventFundingReceivedPayment(address indexed _sender, uint8 indexed _payment_method, uint256 indexed _amount );

    function runBeforeInitialization() internal requireNotInitialised {
        DirectInput = new FundingInputDirect();
        MilestoneInput = new FundingInputMilestone();

        // instantiate token manager, moved from runBeforeApplyingSettings
        TokenManagerEntity = TokenManager( getApplicationAssetAddressByName('TokenManager') );
        FundingManagerEntity = FundingManager( getApplicationAssetAddressByName('FundingManager') );

        EventRunBeforeInit(assetName);
    }

    function setAssetStates() internal {
        // Asset States
        EntityStates["__IGNORED__"]     = 0;
        EntityStates["NEW"]             = 1;
        EntityStates["WAITING"]         = 2;
        EntityStates["IN_PROGRESS"]     = 3;
        EntityStates["COOLDOWN"]        = 4;
        EntityStates["FUNDING_ENDED"]   = 5;
        EntityStates["FAILED"]          = 6;
        EntityStates["FAILED_FINAL"]    = 7;
        EntityStates["SUCCESSFUL"]      = 8;
        EntityStates["SUCCESSFUL_FINAL"]= 9;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;
        RecordStates["NEW"]             = 1;
        RecordStates["IN_PROGRESS"]     = 2;
        RecordStates["FINAL"]           = 3;
    }

    function addSettings(address _outputAddress, uint256 soft_cap, uint256 hard_cap, uint8 sale_percentage )
        public
        requireInitialised
        requireSettingsNotApplied
    {
        if(soft_cap > hard_cap) {
            revert();
        }

        multiSigOutputAddress = _outputAddress;
        GlobalAmountCapSoft = soft_cap;
        GlobalAmountCapHard = hard_cap;

        if(sale_percentage > 90) {
            revert();
        }

        TokenSellPercentage = sale_percentage;
    }

    function addFundingStage(
        bytes32 _name,
        uint256 _time_start,
        uint256 _time_end,
        uint256 _amount_cap_soft,
        uint256 _amount_cap_hard,   // required > 0
        uint8   _methods,
        uint256 _minimum_entry,
        uint256 _fixed_tokens,
        uint8   _price_addition_percentage,
        uint8   _token_share_percentage
    )
        public
        //onlyDeployer
        //requireInitialised
        //requireSettingsNotApplied
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
        if(_amount_cap_soft > _amount_cap_hard) {
            revert();
        }

        if(_token_share_percentage > 0) {
            revert();
        }

        FundingStage storage prevRecord = Collection[FundingStageNum];
        if(FundingStageNum > 0) {

            // new stage does not start before the previous one ends
            if( _time_start <= prevRecord.time_end ) {
                revert();
            }

            /*
            if(TokenManagerEntity.getTokenSCADARequiresHardCap() == false)
            {
                // make sure previous stage + new stage token percentage does not amount to over 90%
                if( _token_share_percentage + prevRecord.token_share_percentage > 90 ) {
                    revert();
                }
            }
            */
        }

        FundingStage storage record = Collection[++FundingStageNum];
        record.name             = _name;
        record.time_start       = _time_start;
        record.time_end         = _time_end;
        record.amount_cap_soft  = _amount_cap_soft;
        record.amount_cap_hard  = _amount_cap_hard;

        // funding method settings
        record.methods          = _methods;
        record.minimum_entry    = _minimum_entry;

        // token settings
        record.fixed_tokens              = _fixed_tokens;
        record.price_addition_percentage = _price_addition_percentage;
        record.token_share_percentage    = _token_share_percentage;

        // state new
        record.state = getRecordState("NEW");
        record.index = FundingStageNum;

        FundingStageCreated( FundingStageNum, _name );

        adjustFundingSettingsBasedOnNewFundingStage();
    }

    function adjustFundingSettingsBasedOnNewFundingStage() internal {

        /*
        if(TokenManagerEntity.getTokenSCADARequiresHardCap() == false) {
            uint8 local_TokenSellPercentage;
            for(uint8 i = 1; i <= FundingStageNum; i++) {
                FundingStage storage rec = Collection[i];
                // cumulate sell percentages
                local_TokenSellPercentage+= rec.token_share_percentage;
            }
            TokenSellPercentage = local_TokenSellPercentage;
        }
        */

        // set funding start
        Funding_Setting_funding_time_start = Collection[1].time_start;
        // set funding end
        Funding_Setting_funding_time_end = Collection[FundingStageNum].time_end;

        // cashback starts 1 day after funding status is failed
        Funding_Setting_cashback_time_start = Funding_Setting_funding_time_end + Funding_Setting_cashback_before_start_wait_duration;
        Funding_Setting_cashback_time_end = Funding_Setting_cashback_time_start + Funding_Setting_cashback_duration;
    }

    function getStageAmount(uint8 StageId) public view returns ( uint256 ) {
        return Collection[StageId].fixed_tokens;
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

    function receivePayment(address _sender, uint8 _payment_method)
        payable
        public
        requireInitialised
        onlyInputPaymentMethod
        returns(bool)
    {
        // check that msg.value is higher than 0, don't really want to have to deal with minus in case the network breaks this somehow
        if(allowedPaymentMethod(_payment_method) && canAcceptPayment(msg.value) ) {

            uint256 contributed_value = msg.value;

            uint256 amountOverCap = getValueOverCurrentCap(contributed_value);
            if ( amountOverCap > 0 ) {
                // calculate how much we can accept

                // update contributed value
                contributed_value -= amountOverCap;
            }

            Collection[currentFundingStage].amount_raised+= contributed_value;
            AmountRaised+= contributed_value;

            if(_payment_method == uint8(FundingMethodIds.MILESTONE_ONLY)) {
                MilestoneAmountRaised+=contributed_value;
            }

            EventFundingReceivedPayment(_sender, _payment_method, contributed_value);

            if( FundingManagerEntity.receivePayment.value(contributed_value)( _sender, _payment_method, currentFundingStage ) ) {

                if(amountOverCap > 0) {
                    // last step, if we received more than we can accept, send remaining back
                    // amountOverCap sent back
                    if( _sender.send(this.balance) ) {
                        return true;
                    }
                    else {
                        revert();
                    }
                } else {
                    return true;
                }
            } else {
                revert();
            }

        } else {
            revert();
        }
    }

    modifier onlyInputPaymentMethod() {
        require(msg.sender != 0x0 && ( msg.sender == address(DirectInput) || msg.sender == address(MilestoneInput) ));
        _;
    }

    function canAcceptPayment(uint256 _amount) public view returns (bool) {
        if( _amount > 0 ) {
            // funding state should be IN_PROGRESS, no state changes should be required
            if( CurrentEntityState == getEntityState("IN_PROGRESS") && hasRequiredStateChanges() == false) {
                return true;
            }
        }
        return false;
    }

    function getValueOverCurrentCap(uint256 _amount) public view returns (uint256) {
        FundingStage memory record = Collection[currentFundingStage];
        uint256 remaining = record.amount_cap_hard - AmountRaised;
        if( _amount > remaining ) {
            return _amount - remaining;
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

    function updateFundingStage( uint8 _new_state )
        internal
        requireInitialised
        FundingStageUpdateAllowed(_new_state)
        returns (bool)
    {
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

        FundingStage memory record = Collection[currentFundingStage];
        uint8 RecordStateRequired = getRecordState("__IGNORED__");

        if(record.state == getRecordState("FINAL")) {
            return getRecordState("__IGNORED__");
        }

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
            2. Check hard caps
            All lead to state change => FINAL
        */

        // Time check
        if(getTimestamp() >= record.time_end) {
            // Funding Phase ended passed
            return getRecordState("FINAL");
        }

        // will trigger in pre-ico
        // Record Hard Cap Check
        if(AmountRaised >= record.amount_cap_hard) {
            // record hard cap reached
            return getRecordState("FINAL");
        }

        // will trigger in ico
        // Global Hard Cap Check
        if(AmountRaised >= GlobalAmountCapHard) {
            // hard cap reached
            return getRecordState("FINAL");
        }

        if( record.state == RecordStateRequired ) {
            RecordStateRequired = getRecordState("__IGNORED__");
        }

        return RecordStateRequired;
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
        updateFundingStage( RecordStateRequired );
        if( RecordStateRequired == getRecordState("FINAL") ) {
            if(currentFundingStage < FundingStageNum) {
                // jump to next stage
                currentFundingStage++;
            }
        }
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {
        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Do State Specific Updates
        // Update our Entity State
        CurrentEntityState = EntityStateRequired;

        if ( EntityStateRequired == getEntityState("FUNDING_ENDED") ) {
            /*
                STATE: FUNDING_ENDED
                @Processor hook
                Action: Check if funding is successful or not, and move state to "FAILED" or "SUCCESSFUL"
            */

            // Global Hard Cap Check
            if(AmountRaised >= GlobalAmountCapSoft) {
                // hard cap reached
                CurrentEntityState = getEntityState("SUCCESSFUL");
            } else {
                CurrentEntityState = getEntityState("FAILED");
            }
        }


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


        // Funding Record State Overrides
        // if(CurrentRecordState != RecordStateRequired) {
        if(RecordStateRequired != getRecordState("__IGNORED__"))
        {
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

            // Records do not require any updates.
            // Do Entity Checks

            if( CurrentEntityState == getEntityState("NEW") ) {
                /*
                    STATE: NEW
                    Processor Action: Allocate Tokens to Funding / Owners then Update to WAITING
                */
                EntityStateRequired = getEntityState("WAITING");
            } else  if ( CurrentEntityState == getEntityState("FUNDING_ENDED") ) {
                /*
                    STATE: FUNDING_ENDED
                    Processor Action: Check if funding is successful or not, and move state to "SUCCESSFUL" or "FAILED"
                */
            } else if ( CurrentEntityState == getEntityState("SUCCESSFUL") ) {
                /*
                    STATE: SUCCESSFUL
                    Processor Action: none

                    External Action:
                    FundingManager - Run Internal Processor ( deliver tokens, deliver direct funding eth )
                */

                // check funding manager has processed the FUNDING_SUCCESSFUL Task, if true => FUNDING_SUCCESSFUL_DONE
                if(FundingManagerEntity.taskByHash( FundingManagerEntity.getHash("FUNDING_SUCCESSFUL_START", "") ) == true) {
                    EntityStateRequired = getEntityState("SUCCESSFUL_FINAL");
                }
                /*
                if( FundingManagerEntity.CurrentEntityState() == FundingManagerEntity.getEntityState("FUNDING_SUCCESSFUL_DONE") ) {
                    EntityStateRequired = getEntityState("SUCCESSFUL_FINAL");
                }
                */

            } else if ( CurrentEntityState == getEntityState("FAILED") ) {
                /*
                    STATE: FAILED
                    Processor Action: none

                    External Action:
                    FundingManager - Run Internal Processor (release tokens to owner) ( Cashback is available )
                */

                // check funding manager state, if FUNDING_NOT_PROCESSED -> getEntityState("__IGNORED__")
                // if FUNDING_FAILED_DONE

                if(FundingManagerEntity.taskByHash( FundingManagerEntity.getHash("FUNDING_FAILED_START", "") ) == true) {
                    EntityStateRequired = getEntityState("FAILED_FINAL");
                }
            } else if ( CurrentEntityState == getEntityState("SUCCESSFUL_FINAL") ) {
                /*
                    STATE: SUCCESSFUL_FINAL
                    Processor Action: none

                    External Action:
                    Application: Run Internal Processor ( Change State to IN_DEVELOPMENT )
                */
            } else if ( CurrentEntityState == getEntityState("FAILED_FINAL") ) {
                /*
                    STATE: FINAL_FAILED
                    Processor Action: none

                    External Action:
                    Application: Run Internal Processor ( Change State to FUNDING_FAILED )
                */
            }
        }

        return (CurrentRecordState, RecordStateRequired, EntityStateRequired);
    }

}

/*

 * @name        Token Stake Calculation And Distribution Algorithm - Type 3 - Sell a variable amount of tokens for a fixed price
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


    Inputs:

    Defined number of tokens per wei ( X Tokens = 1 wei )
    Received amount of ETH
    Generates:

    Total Supply of tokens available in Funding Phase respectively Project
    Observations:

    Will sell the whole supply of Tokens available to Current Funding Phase
    Use cases:

    Any Funding Phase where you want the first Funding Phase to determine the token supply of the whole Project

*/








contract TokenSCADAVariable {

    Funding FundingEntity;

    bool public SCADA_requires_hard_cap = true;

    function TokenSCADAVariable( address _fundingContract ) public {

        FundingEntity = Funding(_fundingContract);
    }

    function requiresHardCap() public view returns (bool) {
        return SCADA_requires_hard_cap;
    }

    function getTokensForValueInCurrentStage(uint256 _value) public view returns (uint256) {
        return getTokensForValueInStage(FundingEntity.currentFundingStage(), _value);
    }

    function getTokensForValueInStage(uint8 _stage, uint256 _value) public view returns (uint256) {
        uint256 amount = FundingEntity.getStageAmount(_stage);
        return _value * amount;
    }

    function getBoughtTokens( address _vaultAddress, bool _direct ) public view returns (uint256) {
        FundingVault vault = FundingVault(_vaultAddress);

        if(_direct) {
            uint256 DirectTokens = getTokensForValueInStage(1, vault.stageAmountsDirect(1));
            DirectTokens+= getTokensForValueInStage(2, vault.stageAmountsDirect(2));
            return DirectTokens;
        } else {
            uint256 TotalTokens = getTokensForValueInStage(1, vault.stageAmounts(1));
            TotalTokens+= getTokensForValueInStage(2, vault.stageAmounts(2));
            return TotalTokens;
        }
    }
}

/*

 * @name        Token Manager Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>



*/









contract TokenManager is ApplicationAsset {

    TokenSCADAVariable public TokenSCADAEntity;
    Token public TokenEntity;
    address public MarketingMethodAddress;

    function addTokenSettingsAndInit(
        uint256 _tokenSupply,
        uint8 _tokenDecimals,
        string _tokenName,
        string _tokenSymbol,
        string _version
    )
        public
        requireInitialised
        requireSettingsNotApplied
        onlyDeployer
    {
        TokenEntity = new Token(
            _tokenSupply,
            _tokenName,
            _tokenDecimals,
            _tokenSymbol,
            _version
        );
    }


    /* Marketing fund */
    function setMarketingMethodAddress( address _address)
        requireInitialised
        requireSettingsNotApplied
        onlyDeployer
        public
    {
        MarketingMethodAddress = _address;
    }

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        // we need token address
        // we need funding contract address.. let's ask application entity ABI for it :D
        address fundingContractAddress = getApplicationAssetAddressByName('Funding');

        TokenSCADAEntity = new TokenSCADAVariable(fundingContractAddress);
        EventRunBeforeApplyingSettings(assetName);
    }

    function getTokenSCADARequiresHardCap() public view returns (bool) {
        return TokenSCADAEntity.requiresHardCap();
    }

    function mint(address _to, uint256 _amount)
        onlyAsset('FundingManager')
        public
        returns (bool)
    {
        return TokenEntity.mint(_to, _amount);
    }

    function finishMinting()
        onlyAsset('FundingManager')
        public
        returns (bool)
    {
        return TokenEntity.finishMinting();
    }

    function mintForMarketingPool(address _to, uint256 _amount)
        onlyMarketingPoolAsset
        requireSettingsApplied
        external
        returns (bool)
    {
        return TokenEntity.mint(_to, _amount);
    }

    modifier onlyMarketingPoolAsset() {
        require(msg.sender == MarketingMethodAddress);
        _;
    }

    // Development stage complete, release tokens to Project Owners
    event EventOwnerTokenBalancesReleased(address _addr, uint256 _value);
    bool OwnerTokenBalancesReleased = false;

    function ReleaseOwnersLockedTokens(address _multiSigOutputAddress)
        public
        onlyAsset('FundingManager')
        returns (bool)
    {
        require(OwnerTokenBalancesReleased == false);
        uint256 lockedBalance = TokenEntity.balanceOf(address(this));
        TokenEntity.transfer( _multiSigOutputAddress, lockedBalance );
        EventOwnerTokenBalancesReleased(_multiSigOutputAddress, lockedBalance);
        OwnerTokenBalancesReleased = true;
        return true;
    }

}

/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Listing Contract
 - used by the platform to find child campaigns
 - used by mobile application to retrieve News Items

ropsten - 0x1ec6988a826c4236b3b07c5eed9059e3aa033fe2

*/






contract ListingContract is ApplicationAsset {

    address public managerAddress;

    // child items
    struct item {
        bytes32 name;
        address itemAddress;
        bool    status;
        uint256 index;
    }

    mapping ( uint256 => item ) public items;
    uint256 public itemNum = 0;

    event EventNewChildItem(bytes32 _name, address _address, uint256 _index);

    function ListingContract() ApplicationAsset() public {

    }

    // deployer address, sets the address who is allowed to add entries, in order to avoid a code upgrade at first milestone.
    function setManagerAddress(address _manager) public onlyDeployer {
        managerAddress = _manager;
    }

    function addItem(bytes32 _name, address _address) public requireInitialised {
        require(msg.sender == owner || msg.sender == managerAddress); // only application

        item storage child = items[++itemNum];
        child.name = _name;
        child.itemAddress = _address;
        child.status = true;
        child.index = itemNum;

        EventNewChildItem( _name, _address, itemNum);
    }

    /*
    * Get current News Contract address
    *
    * @return       address NewsContractEntity
    */
    function getNewsContractAddress(uint256 _childId) external view returns (address) {
        item memory child = items[_childId];
        if(child.itemAddress != address(0x0)) {
            ApplicationEntityABI ChildApp = ApplicationEntityABI(child.itemAddress);
            return ChildApp.NewsContractEntity();
        } else {
            revert();
        }
    }

    function canBeDelisted(uint256 _childId) public view returns (bool) {

        item memory child = items[_childId];
        if(child.status == true) {
            ApplicationEntityABI ChildApp = ApplicationEntityABI(child.itemAddress);
            if(
                ChildApp.CurrentEntityState() == ChildApp.getEntityState("WAITING") ||
                ChildApp.CurrentEntityState() == ChildApp.getEntityState("NEW"))
            {
                return true;
            }
        }
        return ;
    }

    function getChildStatus( uint256 _childId ) public view returns (bool) {
        item memory child = items[_childId];
        return child.status;
    }

    // update so that this checks the child status, and only delists IF funding has not started yet.
    function delistChild( uint256 _childId ) public onlyAsset("Proposals") requireInitialised {
        require(canBeDelisted(_childId) == true );

        item storage child = items[_childId];
            child.status = false;
    }

}

/*

 * @name        Proposals Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Proposals Contract code deployed and linked to the Application Entity

*/











contract Proposals is ApplicationAsset {

    ApplicationEntityABI public Application;
    ListingContract public ListingContractEntity;
    Funding public FundingEntity;
    FundingManager public FundingManagerEntity;
    TokenManager public TokenManagerEntity;
    Token public TokenEntity;
    Milestones public MilestonesEntity;

    function getRecordState(bytes32 name) public view returns (uint8) {
        return RecordStates[name];
    }

    function getActionType(bytes32 name) public view returns (uint8) {
        return ActionTypes[name];
    }

    function getProposalState(uint256 _proposalId) public view returns (uint8) {
        return ProposalsById[_proposalId].state;
    }

    mapping (bytes32 => uint8) public ActionTypes;

    function setActionTypes() internal {
        // owner initiated
        ActionTypes["MILESTONE_DEADLINE"] = 1;
        ActionTypes["MILESTONE_POSTPONING"] = 2;
        ActionTypes["EMERGENCY_FUND_RELEASE"] = 60;
        ActionTypes["IN_DEVELOPMENT_CODE_UPGRADE"] = 50;

        // shareholder initiated
        ActionTypes["AFTER_COMPLETE_CODE_UPGRADE"] = 51;
        ActionTypes["PROJECT_DELISTING"] = 75;
    }


    function setAssetStates() internal {

        setActionTypes();

        RecordStates["NEW"]                 = 1;
        RecordStates["ACCEPTING_VOTES"]     = 2;
        RecordStates["VOTING_ENDED"]        = 3;
        RecordStates["VOTING_RESULT_YES"]   = 10;
        RecordStates["VOTING_RESULT_NO"]    = 20;
    }

    event EventNewProposalCreated ( bytes32 indexed _hash, uint256 indexed _proposalId );

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);

        address FundingManagerAddress = getApplicationAssetAddressByName('FundingManager');
        FundingManagerEntity = FundingManager(FundingManagerAddress);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        TokenManagerEntity = TokenManager(TokenManagerAddress);
        TokenEntity = Token(TokenManagerEntity.TokenEntity());

        address ListingContractAddress = getApplicationAssetAddressByName('ListingContract');
        ListingContractEntity = ListingContract(ListingContractAddress);

        address MilestonesContractAddress = getApplicationAssetAddressByName('Milestones');
        MilestonesEntity = Milestones(MilestonesContractAddress);

        EventRunBeforeApplyingSettings(assetName);
    }

    function getBylawsProposalVotingDuration() public view returns (uint256) {
        return getAppBylawUint256("proposal_voting_duration");
    }

    function getBylawsMilestoneMinPostponing() public view returns (uint256) {
        return getAppBylawUint256("min_postponing");
    }

    function getBylawsMilestoneMaxPostponing() public view returns (uint256) {
        return getAppBylawUint256("max_postponing");
    }

    function getHash(uint8 actionType, bytes32 arg1, bytes32 arg2) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1, arg2);
    }


    // need to implement a way to just iterate through active proposals, and remove the ones we already processed
    // otherwise someone with malicious intent could add a ton of proposals, just to make our contract cost a ton of gas.

    // to that end, we allow individual proposal processing. so that we don't get affected by people with too much
    // money and time on their hands.

    // whenever the system created a proposal, it will store the id, and process it when required.

    // not that much of an issue at this stage because:
    // NOW:
    // - only the system can create - MILESTONE_DEADLINE
    // - only the deployer can create - MILESTONE_POSTPONING / EMERGENCY_FUND_RELEASE / IN_DEVELOPMENT_CODE_UPGRADE

    // FUTURE:
    // - PROJECT_DELISTING is tied into an existing "listing id" which will be created by the system ( if requested by
    // someone, but at quite a significant cost )
    // - AFTER_COMPLETE_CODE_UPGRADE

    mapping (uint8 => uint256) public ActiveProposalIds;
    uint8 public ActiveProposalNum = 0;

    mapping (uint256 => bool) public ExpiredProposalIds;

    function process() public onlyApplicationEntity {
        for(uint8 i = 0; i < ActiveProposalNum; i++) {

            if(
                getProposalType(ActiveProposalIds[i]) == getActionType("PROJECT_DELISTING") ||
                getProposalType(ActiveProposalIds[i]) == getActionType("AFTER_COMPLETE_CODE_UPGRADE")
            ) {
                ProcessVoteTotals( ActiveProposalIds[i], VoteCountPerProcess );
            } else {
                // try expiry ending
                tryEndVoting(ActiveProposalIds[i]);
            }

        }
    }

    function hasRequiredStateChanges() public view returns (bool) {
        for(uint8 i = 0; i < ActiveProposalNum; i++) {
            if( needsProcessing( ActiveProposalIds[i] ) ) {
                return true;
            }
        }
        return false;
    }

    function getRequiredStateChanges() public view returns (uint8) {
        if(hasRequiredStateChanges()) {
            return ActiveProposalNum;
        }
        return 0;
    }

    function addCodeUpgradeProposal(address _addr, bytes32 _sourceCodeUrl)
        external
        onlyApplicationEntity   // shareholder check is done directly in Gateway by calling applicationEntity to confirm
        returns (uint256)
    {

        // hash enforces only 1 possible voting of this type per record.
        // basically if a vote failed, you need to deploy it with changes to a new address. that simple.

        // depending on the application overall state, we have 2 different voting implementations.

        uint8 thisAction;

        if(getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {
            thisAction = getActionType("IN_DEVELOPMENT_CODE_UPGRADE");

        } else if(getApplicationState() == getApplicationEntityState("DEVELOPMENT_COMPLETE") ) {
            thisAction = getActionType("AFTER_COMPLETE_CODE_UPGRADE");
        }

        return createProposal(
            msg.sender,
            "CODE_UPGRADE",
            getHash( thisAction, bytes32(_addr), 0 ),
            thisAction,
            _addr,
            _sourceCodeUrl,
            0
        );
    }


    function createMilestoneAcceptanceProposal()
        external
        onlyAsset("Milestones")
        returns (uint256)
    {

        uint8 recordId = MilestonesEntity.currentRecord();
        return createProposal(
            msg.sender,
            "MILESTONE_DEADLINE",
            getHash( getActionType("MILESTONE_DEADLINE"), bytes32( recordId ), 0 ),
            getActionType("MILESTONE_DEADLINE"),
            0,
            0,
            uint256(recordId)
        );
    }

    function createMilestonePostponingProposal(uint256 _duration)
        external
        onlyDeployer
        returns (uint256)
    {
        if(_duration >= getBylawsMilestoneMinPostponing() && _duration <= getBylawsMilestoneMaxPostponing() ) {

            uint8 recordId = MilestonesEntity.currentRecord();
            return createProposal(
                msg.sender,
                "MILESTONE_POSTPONING",
                getHash( getActionType("MILESTONE_POSTPONING"), bytes32( recordId ), 0 ),
                getActionType("MILESTONE_POSTPONING"),
                0,
                0,
                _duration
            );
        } else {
            revert();
        }
    }

    function getCurrentMilestonePostponingProposalDuration() public view returns (uint256) {
        uint8 recordId = MilestonesEntity.currentRecord();
        bytes32 hash = getHash( getActionType("MILESTONE_POSTPONING"), bytes32( recordId ), 0 );
        ProposalRecord memory proposal = ProposalsById[ ProposalIdByHash[hash] ];
        return proposal.extra;
    }

    function getCurrentMilestoneProposalStatusForType(uint8 _actionType ) public view returns (uint8) {

        if(_actionType == getActionType("MILESTONE_DEADLINE") || _actionType == getActionType("MILESTONE_POSTPONING")) {
            uint8 recordId = MilestonesEntity.currentRecord();
            bytes32 hash = getHash( _actionType, bytes32( recordId ), 0 );
            uint256 ProposalId = ProposalIdByHash[hash];
            ProposalRecord memory proposal = ProposalsById[ProposalId];
            return proposal.state;
        }
        return 0;
    }

    function createEmergencyFundReleaseProposal()
        external
        onlyDeployer
        returns (uint256)
    {
        return createProposal(
            msg.sender,
            "EMERGENCY_FUND_RELEASE",
            getHash( getActionType("EMERGENCY_FUND_RELEASE"), 0, 0 ),
            getActionType("EMERGENCY_FUND_RELEASE"),
            0,
            0,
            0
        );
    }

    function createDelistingProposal(uint256 _projectId)
        external
        onlyTokenHolder
        returns (uint256)
    {
        // let's validate the project is actually listed first in order to remove any spamming ability.
        if( ListingContractEntity.canBeDelisted(_projectId) == true) {

            return createProposal(
                msg.sender,
                "PROJECT_DELISTING",
                getHash( getActionType("PROJECT_DELISTING"), bytes32(_projectId), 0 ),
                getActionType("PROJECT_DELISTING"),
                0,
                0,
                _projectId
            );
        } else {
            revert();
        }
    }

    modifier onlyTokenHolder() {
        require( getTotalTokenVotingPower(msg.sender) > 0 );
        _;
    }

    struct ProposalRecord {
        address creator;
        bytes32 name;
        uint8 actionType;
        uint8 state;
        bytes32 hash;                       // action name + args hash
        address addr;
        bytes32 sourceCodeUrl;
        uint256 extra;
        uint256 time_start;
        uint256 time_end;
        uint256 index;
    }

    mapping (uint256 => ProposalRecord) public ProposalsById;
    mapping (bytes32 => uint256) public ProposalIdByHash;

    function createProposal(
        address _creator,
        bytes32 _name,
        bytes32 _hash,
        uint8   _action,
        address _addr,
        bytes32 _sourceCodeUrl,
        uint256 _extra
    )
        internal
        returns (uint256)
    {

        // if(_action > 0) {

        if(ProposalIdByHash[_hash] == 0) {

            ProposalRecord storage proposal = ProposalsById[++RecordNum];
            proposal.creator        = _creator;
            proposal.name           = _name;
            proposal.actionType     = _action;
            proposal.addr           = _addr;
            proposal.sourceCodeUrl  = _sourceCodeUrl;
            proposal.extra          = _extra;
            proposal.hash           = _hash;
            proposal.state          = getRecordState("NEW");
            proposal.time_start     = getTimestamp();
            proposal.time_end       = getTimestamp() + getBylawsProposalVotingDuration();
            proposal.index          = RecordNum;

            ProposalIdByHash[_hash] = RecordNum;

        } else {
            // already exists!
            revert();
        }

        initProposalVoting(RecordNum);
        EventNewProposalCreated ( _hash, RecordNum );
        return RecordNum;

        /*
        } else {
            // no action?!
            revert();
        }
        */
    }

    function acceptCodeUpgrade(uint256 _proposalId) internal {
        ProposalRecord storage proposal = ProposalsById[_proposalId];
        // reinitialize this each time, because we rely on "owner" as the address, and it will change
        Application = ApplicationEntityABI(owner);
        Application.acceptCodeUpgradeProposal(proposal.addr);
    }


    function initProposalVoting(uint256 _proposalId) internal {

        ResultRecord storage result = ResultsByProposalId[_proposalId];
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        if(getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {

            if(proposal.actionType == getActionType("PROJECT_DELISTING") ) {
                // while in development project delisting can be voted by all available tokens, except owner
                uint256 ownerLockedTokens = TokenEntity.balanceOf(TokenManagerEntity);
                result.totalAvailable = TokenEntity.totalSupply() - ownerLockedTokens;

                // since we're counting unlocked tokens, we need to recount votes each time we want to end the voting period
                result.requiresCounting = true;

            } else {
                // any other proposal is only voted by "locked ether", thus we use locked tokens
                result.totalAvailable = FundingManagerEntity.LockedVotingTokens();

                // locked tokens do not require recounting.
                result.requiresCounting = false;
            }

        } else if(getApplicationState() == getApplicationEntityState("DEVELOPMENT_COMPLETE") ) {
            // remove residual token balance from TokenManagerEntity.
            uint256 residualLockedTokens = TokenEntity.balanceOf(TokenManagerEntity);
            result.totalAvailable = TokenEntity.totalSupply() - residualLockedTokens;

            // since we're counting unlocked tokens, we need to recount votes each time we want to end the voting period
            result.requiresCounting = true;
        }
        result.requiredForResult = result.totalAvailable / 2;   // 50%

        proposal.state = getRecordState("ACCEPTING_VOTES");
        addActiveProposal(_proposalId);

        tryFinaliseNonLockedTokensProposal(_proposalId);
    }



    /*

    Voting

    */

    struct VoteStruct {
        address voter;
        uint256 time;
        bool    vote;
        uint256 power;
        bool    annulled;
        uint256 index;
    }

    struct ResultRecord {
        uint256 totalAvailable;
        uint256 requiredForResult;
        uint256 totalSoFar;
        uint256 yes;
        uint256 no;
        bool    requiresCounting;
    }


    mapping (uint256 => mapping (uint256 => VoteStruct) ) public VotesByProposalId;
    mapping (uint256 => mapping (address => VoteStruct) ) public VotesByCaster;
    mapping (uint256 => uint256 ) public VotesNumByProposalId;
    mapping (uint256 => ResultRecord ) public ResultsByProposalId;

    function RegisterVote(uint256 _proposalId, bool _myVote) public {
        address Voter = msg.sender;

        // get voting power
        uint256 VoterPower = getVotingPower(_proposalId, Voter);

        // get proposal for state
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        // make sure voting power is greater than 0
        // make sure proposal.state allows receiving votes
        // make sure proposal.time_end has not passed.

        if(VoterPower > 0 && proposal.state == getRecordState("ACCEPTING_VOTES")) {

            // first check if this Voter has a record registered,
            // and if they did, annul initial vote, update results, and add new one
            if( hasPreviousVote(_proposalId, Voter) ) {
                undoPreviousVote(_proposalId, Voter);
            }

            registerNewVote(_proposalId, Voter, _myVote, VoterPower);

            // this is where we can end voting before time if result.yes or result.no > totalSoFar
            tryEndVoting(_proposalId);

        } else {
            revert();
        }
    }

    function hasPreviousVote(uint256 _proposalId, address _voter) public view returns (bool) {
        VoteStruct storage previousVoteByCaster = VotesByCaster[_proposalId][_voter];
        if( previousVoteByCaster.power > 0 ) {
            return true;
        }
        return false;
    }

    function undoPreviousVote(uint256 _proposalId, address _voter) internal {

        VoteStruct storage previousVoteByCaster = VotesByCaster[_proposalId][_voter];

        // if( previousVoteByCaster.power > 0 ) {
            previousVoteByCaster.annulled = true;

            VoteStruct storage previousVoteByProposalId = VotesByProposalId[_proposalId][previousVoteByCaster.index];
            previousVoteByProposalId.annulled = true;

            ResultRecord storage result = ResultsByProposalId[_proposalId];

            // update total so far as well
            result.totalSoFar-= previousVoteByProposalId.power;

            if(previousVoteByProposalId.vote == true) {
                result.yes-= previousVoteByProposalId.power;
            // } else if(previousVoteByProposalId.vote == false) {
            } else {
                result.no-= previousVoteByProposalId.power;
            }
        // }

    }

    function registerNewVote(uint256 _proposalId, address _voter, bool _myVote, uint256 _power) internal {

        // handle new vote
        uint256 currentVoteId = VotesNumByProposalId[_proposalId]++;
        VoteStruct storage vote = VotesByProposalId[_proposalId][currentVoteId];
            vote.voter = _voter;
            vote.time = getTimestamp();
            vote.vote = _myVote;
            vote.power = _power;
            vote.index = currentVoteId;

        VotesByCaster[_proposalId][_voter] = VotesByProposalId[_proposalId][currentVoteId];

        addVoteIntoResult(_proposalId, _myVote, _power );
    }

    event EventAddVoteIntoResult ( uint256 indexed _proposalId, bool indexed _type, uint256 indexed _power );

    function addVoteIntoResult(uint256 _proposalId, bool _type, uint256 _power ) internal {

        EventAddVoteIntoResult(_proposalId, _type, _power );

        ResultRecord storage newResult = ResultsByProposalId[_proposalId];
        newResult.totalSoFar+= _power;
        if(_type == true) {
            newResult.yes+= _power;
        } else {
            newResult.no+= _power;
        }
    }

    function getTotalTokenVotingPower(address _voter) public view returns ( uint256 ) {
        address VaultAddress = FundingManagerEntity.getMyVaultAddress(_voter);
        uint256 VotingPower = TokenEntity.balanceOf(VaultAddress);
        VotingPower+= TokenEntity.balanceOf(_voter);
        return VotingPower;
    }

    function getVotingPower(uint256 _proposalId, address _voter) public view returns ( uint256 ) {
        uint256 VotingPower = 0;
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        if(proposal.actionType == getActionType("AFTER_COMPLETE_CODE_UPGRADE")) {

            return TokenEntity.balanceOf(_voter);

        } else {

            address VaultAddress = FundingManagerEntity.getMyVaultAddress(_voter);
            if(VaultAddress != address(0x0)) {
                VotingPower = TokenEntity.balanceOf(VaultAddress);

                if( proposal.actionType == getActionType("PROJECT_DELISTING") ) {
                    // for project delisting, we want to also include tokens in the voter's wallet.
                    VotingPower+= TokenEntity.balanceOf(_voter);
                }
            }
        }
        return VotingPower;
    }


    mapping( uint256 => uint256 ) public lastProcessedVoteIdByProposal;
    mapping( uint256 => uint256 ) public ProcessedVotesByProposal;
    mapping( uint256 => uint256 ) public VoteCountAtProcessingStartByProposal;
    uint256 public VoteCountPerProcess = 10;

    function setVoteCountPerProcess(uint256 _perProcess) external onlyDeployer {
        if(_perProcess > 0) {
            VoteCountPerProcess = _perProcess;
        } else {
            revert();
        }
    }

    event EventProcessVoteTotals ( uint256 indexed _proposalId, uint256 indexed start, uint256 indexed end );

    function ProcessVoteTotals(uint256 _proposalId, uint256 length) public onlyApplicationEntity {

        uint256 start = lastProcessedVoteIdByProposal[_proposalId] + 1;
        uint256 end = start + length - 1;
        if(end > VotesNumByProposalId[_proposalId]) {
            end = VotesNumByProposalId[_proposalId];
        }

        EventProcessVoteTotals(_proposalId, start, end);

        // first run
        if(start == 1) {
            // save vote count at start, so we can reset if it changes
            VoteCountAtProcessingStartByProposal[_proposalId] = VotesNumByProposalId[_proposalId];

            // reset vote totals to 0
            ResultRecord storage result = ResultsByProposalId[_proposalId];
            result.yes = 0;
            result.no = 0;
            result.totalSoFar = 0;
        }

        // reset to start if vote count has changed in the middle of processing run
        if(VoteCountAtProcessingStartByProposal[_proposalId] != VotesNumByProposalId[_proposalId]) {
            // we received votes while counting
            // reset from start
            lastProcessedVoteIdByProposal[_proposalId] = 0;
            // exit
            return;
        }

        for(uint256 i = start; i <= end; i++) {

            VoteStruct storage vote = VotesByProposalId[_proposalId][i - 1];
            // process vote into totals.
            if(vote.annulled != true) {
                addVoteIntoResult(_proposalId, vote.vote, vote.power );
            }

            lastProcessedVoteIdByProposal[_proposalId]++;
        }

        // reset iterator so we can call it again.
        if(lastProcessedVoteIdByProposal[_proposalId] >= VotesNumByProposalId[_proposalId] ) {

            ProcessedVotesByProposal[_proposalId] = lastProcessedVoteIdByProposal[_proposalId];
            lastProcessedVoteIdByProposal[_proposalId] = 0;
            tryEndVoting(_proposalId);
        }
    }

    function canEndVoting(uint256 _proposalId) public view returns (bool) {

        ResultRecord memory result = ResultsByProposalId[_proposalId];
        if(result.requiresCounting == false) {
            if(result.yes > result.requiredForResult || result.no > result.requiredForResult) {
                return true;
            }
        }
        else {

            if(ProcessedVotesByProposal[_proposalId] == VotesNumByProposalId[_proposalId]) {
                if(result.yes > result.requiredForResult || result.no > result.requiredForResult) {
                    return true;
                }
            }

        }
        return false;
    }

    function getProposalType(uint256 _proposalId) public view returns (uint8) {
        return ProposalsById[_proposalId].actionType;
    }

    function expiryChangesState(uint256 _proposalId) public view returns (bool) {
        ProposalRecord memory proposal = ProposalsById[_proposalId];
        if( proposal.state == getRecordState("ACCEPTING_VOTES") && proposal.time_end < getTimestamp() ) {
            return true;
        }
        return false;
    }

    function needsProcessing(uint256 _proposalId) public view returns (bool) {
        if( expiryChangesState(_proposalId) ) {
            return true;
        }

        ResultRecord memory result = ResultsByProposalId[_proposalId];
        if(result.requiresCounting == true) {
            if( lastProcessedVoteIdByProposal[_proposalId] < VotesNumByProposalId[_proposalId] ) {
                if(ProcessedVotesByProposal[_proposalId] == VotesNumByProposalId[_proposalId]) {
                    return false;
                }
            }

        } else {
            return false;
        }

        return true;
    }

    function tryEndVoting(uint256 _proposalId) internal {
        if(canEndVoting(_proposalId)) {
            finaliseProposal(_proposalId);
        }

        if(expiryChangesState(_proposalId) ) {
            finaliseExpiredProposal(_proposalId);
        }
    }

    function finaliseProposal(uint256 _proposalId) internal {

        ResultRecord storage result = ResultsByProposalId[_proposalId];
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        // Milestone Deadline proposals cannot be ended "by majority vote", we rely on finaliseExpiredProposal here
        // because we want to allow everyone to be able to vote "NO" if they choose to cashback.

        if( proposal.actionType != getActionType("MILESTONE_DEADLINE")) {
            // read results,
            if(result.yes > result.requiredForResult) {
                // voting resulted in YES
                proposal.state = getRecordState("VOTING_RESULT_YES");
            } else if (result.no >= result.requiredForResult) {
                // voting resulted in NO
                proposal.state = getRecordState("VOTING_RESULT_NO");
            }
        }

        runActionAfterResult(_proposalId);
    }

    function finaliseExpiredProposal(uint256 _proposalId) internal {

        ResultRecord storage result = ResultsByProposalId[_proposalId];
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        // an expired proposal with no votes will end as YES
        if(result.yes == 0 && result.no == 0) {
            proposal.state = getRecordState("VOTING_RESULT_YES");
        } else {
            // read results,
            if(result.yes > result.no) {
                // voting resulted in YES
                proposal.state = getRecordState("VOTING_RESULT_YES");
            } else if (result.no >= result.yes) {
                // tie equals no
                // voting resulted in NO
                proposal.state = getRecordState("VOTING_RESULT_NO");
            }
        }
        runActionAfterResult(_proposalId);
    }

    function tryFinaliseNonLockedTokensProposal(uint256 _proposalId) internal {

        ResultRecord storage result = ResultsByProposalId[_proposalId];
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        if(result.requiredForResult == 0) {
            proposal.state = getRecordState("VOTING_RESULT_YES");
            runActionAfterResult(_proposalId);
        }
    }

    function addActiveProposal(uint256 _proposalId) internal {
        ActiveProposalIds[ActiveProposalNum++]= _proposalId;
    }

    function removeAndReindexActive(uint256 _proposalId) internal {

        bool found = false;
        for (uint8 i = 0; i < ActiveProposalNum; i++) {
            if(ActiveProposalIds[i] == _proposalId) {
                found = true;
            }
            if(found) {
                ActiveProposalIds[i] = ActiveProposalIds[i+1];
            }
        }

        ActiveProposalNum--;
    }


    bool public EmergencyFundingReleaseApproved = false;

    function runActionAfterResult(uint256 _proposalId) internal {

        ProposalRecord storage proposal = ProposalsById[_proposalId];

        if(proposal.state == getRecordState("VOTING_RESULT_YES")) {

            if(proposal.actionType == getActionType("MILESTONE_DEADLINE")) {

            } else if (proposal.actionType == getActionType("MILESTONE_POSTPONING")) {

            } else if (proposal.actionType == getActionType("EMERGENCY_FUND_RELEASE")) {
                EmergencyFundingReleaseApproved = true;

            } else if (proposal.actionType == getActionType("PROJECT_DELISTING")) {

                ListingContractEntity.delistChild( proposal.extra );

            } else if (
                proposal.actionType == getActionType("IN_DEVELOPMENT_CODE_UPGRADE") ||
                proposal.actionType == getActionType("AFTER_COMPLETE_CODE_UPGRADE")
            ) {

                // initiate code upgrade
                acceptCodeUpgrade(_proposalId);
            }

            removeAndReindexActive(_proposalId);

        } else if(proposal.state == getRecordState("VOTING_RESULT_NO")) {

            //
            if(proposal.actionType == getActionType("MILESTONE_DEADLINE")) {

            } else {
                removeAndReindexActive(_proposalId);
            }
        }
    }

    // used by vault cash back
    function getMyVoteForCurrentMilestoneRelease(address _voter) public view returns (bool) {
        // find proposal id for current milestone
        uint8 recordId = MilestonesEntity.currentRecord();
        bytes32 hash = getHash( getActionType("MILESTONE_DEADLINE"), bytes32( recordId ), 0 );
        uint256 proposalId = ProposalIdByHash[hash];
        // based on that proposal id, find my vote
        VoteStruct memory vote = VotesByCaster[proposalId][_voter];
        return vote.vote;
    }

    function getHasVoteForCurrentMilestoneRelease(address _voter) public view returns (bool) {
        // find proposal id for current milestone
        uint8 recordId = MilestonesEntity.currentRecord();
        bytes32 hash = getHash( getActionType("MILESTONE_DEADLINE"), bytes32( recordId ), 0 );
        uint256 proposalId = ProposalIdByHash[hash];
        return hasPreviousVote(proposalId, _voter);
    }

    function getMyVote(uint256 _proposalId, address _voter) public view returns (bool) {
        VoteStruct memory vote = VotesByCaster[_proposalId][_voter];
        return vote.vote;
    }

}

/*

 * @name        Bounty Program Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    Bounty program contract that holds and distributes tokens upon successful funding.
*/








contract BountyManager is ApplicationAsset {

    Funding FundingEntity;
    Token TokenEntity;

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        TokenManager TokenManagerEntity = TokenManager(TokenManagerAddress);
        TokenEntity = Token(TokenManagerEntity.TokenEntity());

        EventRunBeforeApplyingSettings(assetName);
    }

    function sendBounty( address _receiver, uint256 _amount )
        public
        requireInitialised
        requireSettingsApplied
        onlyDeployer
    {
        if( FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL") ) {
            TokenEntity.transfer( _receiver, _amount );
        } else {
            revert();
        }
    }
}

/*

 * @name        News Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

Contains This Application's News Items
*/






contract NewsContract is ApplicationAsset {

    // state types
    // 1 - generic news item

    // 2 - FUNDING FAILED
    // 3 - FUNDING SUCCESSFUL
    // 4 - MEETING DATE AND TIME SET
    // 5 - VOTING INITIATED

    // 10 - GLOBAL CASHBACK AVAILABLE
    // 50 - CODE UPGRADE PROPOSAL INITIATED

    // 100 - DEVELOPMENT COMPLETE, HELLO SKYNET

    // news items
    struct item {
        string hash;
        uint8 itemType;
        uint256 length;
    }

    mapping ( uint256 => item ) public items;
    uint256 public itemNum = 0;

    event EventNewsItem(string _hash);
    event EventNewsState(uint8 itemType);

    function NewsContract() ApplicationAsset() public {

    }

    function addInternalMessage(uint8 state) public requireInitialised {
        require(msg.sender == owner); // only application
        item storage child = items[++itemNum];
        child.itemType = state;
        EventNewsState(state);
    }

    function addItem(string _hash, uint256 _length) public onlyAppDeployer requireInitialised {
        item storage child = items[++itemNum];
        child.hash = _hash;
        child.itemType = 1;
        child.length = _length;
        EventNewsItem(_hash);
    }

    modifier onlyAppDeployer() {
        ApplicationEntityABI currentApp = ApplicationEntityABI(owner);
        require(msg.sender == currentApp.deployerAddress());
        _;
    }
}

/*

 * @name        Application Entity Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the main company Entity Contract code deployed and linked to the Gateway Interface.

*/














contract ApplicationEntity {

    /* Source Code Url */
    bytes32 sourceCodeUrl;

    /* Entity initialised or not */
    bool public _initialized = false;

    /* Entity locked or not */
    bool public _locked = false;

    /* Current Entity State */
    uint8 public CurrentEntityState;

    /* Available Entity State */
    mapping (bytes32 => uint8) public EntityStates;

    /* GatewayInterface address */
    address public GatewayInterfaceAddress;

    /* Parent Entity Instance */
    GatewayInterface GatewayInterfaceEntity;

    /* Asset Entities */
    Proposals public ProposalsEntity;
    Funding public FundingEntity;
    Milestones public MilestonesEntity;
    Meetings public MeetingsEntity;
    BountyManager public BountyManagerEntity;
    TokenManager public TokenManagerEntity;
    ListingContract public ListingContractEntity;
    FundingManager public FundingManagerEntity;
    NewsContract public NewsContractEntity;

    /* Asset Collection */
    mapping (bytes32 => address) public AssetCollection;
    mapping (uint8 => bytes32) public AssetCollectionIdToName;
    uint8 public AssetCollectionNum = 0;

    event EventAppEntityReady ( address indexed _address );
    event EventAppEntityCodeUpgradeProposal ( address indexed _address, bytes32 indexed _sourceCodeUrl );
    event EventAppEntityInitAsset ( bytes32 indexed _name, address indexed _address );
    event EventAppEntityInitAssetsToThis ( uint8 indexed _assetNum );
    event EventAppEntityAssetsToNewApplication ( address indexed _address );
    event EventAppEntityLocked ( address indexed _address );

    address public deployerAddress;

    function ApplicationEntity() public {
        deployerAddress = msg.sender;
        setEntityStates();
        CurrentEntityState = getEntityState("NEW");
    }

    function setEntityStates() internal {

        // ApplicationEntity States
        EntityStates["__IGNORED__"]                 = 0;
        EntityStates["NEW"]                         = 1;
        EntityStates["WAITING"]                     = 2;

        EntityStates["IN_FUNDING"]                  = 3;

        EntityStates["IN_DEVELOPMENT"]              = 5;
        EntityStates["IN_CODE_UPGRADE"]             = 50;

        EntityStates["UPGRADED"]                    = 100;

        EntityStates["IN_GLOBAL_CASHBACK"]          = 150;
        EntityStates["LOCKED"]                      = 200;

        EntityStates["DEVELOPMENT_COMPLETE"]        = 250;
    }

    function getEntityState(bytes32 name) public view returns (uint8) {
        return EntityStates[name];
    }

    /*
    * Initialize Application and it's assets
    * If gateway is freshly deployed, just link
    * else, create a voting proposal that needs to be accepted for the linking
    *
    * @param        address _newAddress
    * @param        bytes32 _sourceCodeUrl
    *
    * @modifiers    requireNoParent, requireNotInitialised
    */
    function linkToGateway(
        address _GatewayInterfaceAddress,
        bytes32 _sourceCodeUrl
    )
        external
        requireNoParent
        requireNotInitialised
        onlyDeployer
    {
        GatewayInterfaceAddress = _GatewayInterfaceAddress;
        sourceCodeUrl = _sourceCodeUrl;

        // init gateway entity and set app address
        GatewayInterfaceEntity = GatewayInterface(GatewayInterfaceAddress);
        GatewayInterfaceEntity.requestCodeUpgrade( address(this), sourceCodeUrl );
    }

    function setUpgradeState(uint8 state) public onlyGatewayInterface {
        CurrentEntityState = state;
    }

    /*
        For the sake of simplicity, and solidity warnings about "unknown gas usage" do this.. instead of sending
        an array of addresses
    */
    function addAssetProposals(address _assetAddresses) external requireNotInitialised onlyDeployer {
        ProposalsEntity = Proposals(_assetAddresses);
        assetInitialized("Proposals", _assetAddresses);
    }

    function addAssetFunding(address _assetAddresses) external requireNotInitialised onlyDeployer {
        FundingEntity = Funding(_assetAddresses);
        assetInitialized("Funding", _assetAddresses);
    }

    function addAssetMilestones(address _assetAddresses) external requireNotInitialised onlyDeployer {
        MilestonesEntity = Milestones(_assetAddresses);
        assetInitialized("Milestones", _assetAddresses);
    }

    function addAssetMeetings(address _assetAddresses) external requireNotInitialised onlyDeployer {
        MeetingsEntity = Meetings(_assetAddresses);
        assetInitialized("Meetings", _assetAddresses);
    }

    function addAssetBountyManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        BountyManagerEntity = BountyManager(_assetAddresses);
        assetInitialized("BountyManager", _assetAddresses);
    }

    function addAssetTokenManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        TokenManagerEntity = TokenManager(_assetAddresses);
        assetInitialized("TokenManager", _assetAddresses);
    }

    function addAssetFundingManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        FundingManagerEntity = FundingManager(_assetAddresses);
        assetInitialized("FundingManager", _assetAddresses);
    }

    function addAssetListingContract(address _assetAddresses) external requireNotInitialised onlyDeployer {
        ListingContractEntity = ListingContract(_assetAddresses);
        assetInitialized("ListingContract", _assetAddresses);
    }

    function addAssetNewsContract(address _assetAddresses) external requireNotInitialised onlyDeployer {
        NewsContractEntity = NewsContract(_assetAddresses);
        assetInitialized("NewsContract", _assetAddresses);
    }

    function assetInitialized(bytes32 name, address _assetAddresses) internal {
        if(AssetCollection[name] == 0x0) {
            AssetCollectionIdToName[AssetCollectionNum] = name;
            AssetCollection[name] = _assetAddresses;
            AssetCollectionNum++;
        } else {
            // just replace
            AssetCollection[name] = _assetAddresses;
        }
        EventAppEntityInitAsset(name, _assetAddresses);
    }

    function getAssetAddressByName(bytes32 _name) public view returns (address) {
        return AssetCollection[_name];
    }

    /* Application Bylaws mapping */
    mapping (bytes32 => uint256) public BylawsUint256;
    mapping (bytes32 => bytes32) public BylawsBytes32;


    function setBylawUint256(bytes32 name, uint256 value) public requireNotInitialised onlyDeployer {
        BylawsUint256[name] = value;
    }

    function getBylawUint256(bytes32 name) public view requireInitialised returns (uint256) {
        return BylawsUint256[name];
    }

    function setBylawBytes32(bytes32 name, bytes32 value) public requireNotInitialised onlyDeployer {
        BylawsBytes32[name] = value;
    }

    function getBylawBytes32(bytes32 name) public view requireInitialised returns (bytes32) {
        return BylawsBytes32[name];
    }

    function initialize() external requireNotInitialised onlyGatewayInterface returns (bool) {
        _initialized = true;
        EventAppEntityReady( address(this) );
        return true;
    }

    function getParentAddress() external view returns(address) {
        return GatewayInterfaceAddress;
    }

    function createCodeUpgradeProposal(
        address _newAddress,
        bytes32 _sourceCodeUrl
    )
        external
        requireInitialised
        onlyGatewayInterface
        returns (uint256)
    {
        // proposals create new.. code upgrade proposal
        EventAppEntityCodeUpgradeProposal ( _newAddress, _sourceCodeUrl );

        // return true;
        return ProposalsEntity.addCodeUpgradeProposal(_newAddress, _sourceCodeUrl);
    }

    /*
    * Only a proposal can update the ApplicationEntity Contract address
    *
    * @param        address _newAddress
    * @modifiers    onlyProposalsAsset
    */
    function acceptCodeUpgradeProposal(address _newAddress) external onlyProposalsAsset  {
        GatewayInterfaceEntity.approveCodeUpgrade( _newAddress );
    }

    function initializeAssetsToThisApplication() external onlyGatewayInterface returns (bool) {

        for(uint8 i = 0; i < AssetCollectionNum; i++ ) {
            bytes32 _name = AssetCollectionIdToName[i];
            address current = AssetCollection[_name];
            if(current != address(0x0)) {
                if(!current.call(bytes4(keccak256("setInitialOwnerAndName(bytes32)")), _name) ) {
                    revert();
                }
            } else {
                revert();
            }
        }
        EventAppEntityInitAssetsToThis( AssetCollectionNum );

        return true;
    }

    function transferAssetsToNewApplication(address _newAddress) external onlyGatewayInterface returns (bool){
        for(uint8 i = 0; i < AssetCollectionNum; i++ ) {
            
            bytes32 _name = AssetCollectionIdToName[i];
            address current = AssetCollection[_name];
            if(current != address(0x0)) {
                if(!current.call(bytes4(keccak256("transferToNewOwner(address)")), _newAddress) ) {
                    revert();
                }
            } else {
                revert();
            }
        }
        EventAppEntityAssetsToNewApplication ( _newAddress );
        return true;
    }

    /*
    * Only the gateway interface can lock current app after a successful code upgrade proposal
    *
    * @modifiers    onlyGatewayInterface
    */
    function lock() external onlyGatewayInterface returns (bool) {
        _locked = true;
        CurrentEntityState = getEntityState("UPGRADED");
        EventAppEntityLocked(address(this));
        return true;
    }

    /*
        DUMMY METHOD, to be replaced in a future Code Upgrade with a check to determine if sender should be able to initiate a code upgrade
        specifically used after milestone development completes
    */
    address testAddressAllowUpgradeFrom;
    function canInitiateCodeUpgrade(address _sender) public view returns(bool) {
        // suppress warning
        if(testAddressAllowUpgradeFrom != 0x0 && testAddressAllowUpgradeFrom == _sender) {
            return true;
        }
        return false;
    }

    /*
    * Throws if called by any other entity except GatewayInterface
    */
    modifier onlyGatewayInterface() {
        require(GatewayInterfaceAddress != address(0) && msg.sender == GatewayInterfaceAddress);
        _;
    }

    /*
    * Throws if called by any other entity except Proposals Asset Contract
    */
    modifier onlyProposalsAsset() {
        require(msg.sender == address(ProposalsEntity));
        _;
    }

    modifier requireNoParent() {
        require(GatewayInterfaceAddress == address(0x0));
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false && _locked == false);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true && _locked == false);
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployerAddress);
        _;
    }

    event DebugApplicationRequiredChanges( uint8 indexed _current, uint8 indexed _required );
    event EventApplicationEntityProcessor(uint8 indexed _current, uint8 indexed _required);

    /*
        We could create a generic method that iterates through all assets, and using assembly language get the return
        value of the "hasRequiredStateChanges" method on each asset. Based on return, run doStateChanges on them or not.

        Or we could be using a generic ABI contract that only defines the "hasRequiredStateChanges" and "doStateChanges"
        methods thus not requiring any assembly variable / memory management

        Problem with both cases is the fact that our application needs to change only specific asset states depending
        on it's own current state, thus making a generic call wasteful in gas usage.

        Let's stay away from that and follow the same approach as we do inside an asset.
        - view method: -> get required state changes
        - view method: -> has state changes
        - processor that does the actual changes.
        - doStateChanges recursive method that runs the processor if views require it to.

        // pretty similar to FundingManager
    */

    function doStateChanges() public {

        if(!_locked) {
            // process assets first so we can initialize them from NEW to WAITING
            AssetProcessor();

            var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
            bool callAgain = false;

            DebugApplicationRequiredChanges( returnedCurrentEntityState, EntityStateRequired );

            if(EntityStateRequired != getEntityState("__IGNORED__") ) {
                EntityProcessor(EntityStateRequired);
                callAgain = true;
            }
        } else {
            revert();
        }
    }

    function hasRequiredStateChanges() public view returns (bool) {
        bool hasChanges = false;
        if(!_locked) {
            var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
            // suppress unused local variable warning
            returnedCurrentEntityState = 0;
            if(EntityStateRequired != getEntityState("__IGNORED__") ) {
                hasChanges = true;
            }

            if(anyAssetHasChanges()) {
                hasChanges = true;
            }
        }
        return hasChanges;
    }

    function anyAssetHasChanges() public view returns (bool) {
        if( FundingEntity.hasRequiredStateChanges() ) {
            return true;
        }
        if( FundingManagerEntity.hasRequiredStateChanges() ) {
            return true;
        }
        if( MilestonesEntity.hasRequiredStateChanges() ) {
            return true;
        }
        if( ProposalsEntity.hasRequiredStateChanges() ) {
            return true;
        }

        return extendedAnyAssetHasChanges();
    }

    // use this when extending "has changes"
    function extendedAnyAssetHasChanges() internal view returns (bool) {
        if(_initialized) {}
        return false;
    }

    // use this when extending "asset state processor"
    function extendedAssetProcessor() internal  {
        // does not exist, but we check anyway to bypass compier warning about function state mutability
        if ( CurrentEntityState == 255 ) {
            ProposalsEntity.process();
        }
    }

    // view methods decide if changes are to be made
    // in case of tasks, we do them in the Processors.

    function AssetProcessor() internal {


        if ( CurrentEntityState == getEntityState("NEW") ) {

            // move all assets that have states to "WAITING"
            if(FundingEntity.hasRequiredStateChanges()) {
                FundingEntity.doStateChanges();
            }

            if(FundingManagerEntity.hasRequiredStateChanges()) {
                FundingManagerEntity.doStateChanges();
            }

            if( MilestonesEntity.hasRequiredStateChanges() ) {
                MilestonesEntity.doStateChanges();
            }

        } else if ( CurrentEntityState == getEntityState("WAITING") ) {

            if( FundingEntity.hasRequiredStateChanges() ) {
                FundingEntity.doStateChanges();
            }
        }
        else if ( CurrentEntityState == getEntityState("IN_FUNDING") ) {

            if( FundingEntity.hasRequiredStateChanges() ) {
                FundingEntity.doStateChanges();
            }

            if( FundingManagerEntity.hasRequiredStateChanges() ) {
                FundingManagerEntity.doStateChanges();
            }
        }
        else if ( CurrentEntityState == getEntityState("IN_DEVELOPMENT") ) {

            if( FundingManagerEntity.hasRequiredStateChanges() ) {
                FundingManagerEntity.doStateChanges();
            }

            if(MilestonesEntity.hasRequiredStateChanges()) {
                MilestonesEntity.doStateChanges();
            }

            if(ProposalsEntity.hasRequiredStateChanges()) {
                ProposalsEntity.process();
            }
        }
        else if ( CurrentEntityState == getEntityState("DEVELOPMENT_COMPLETE") ) {

            if(ProposalsEntity.hasRequiredStateChanges()) {
                ProposalsEntity.process();
            }
        }

        extendedAssetProcessor();
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {

        EventApplicationEntityProcessor( CurrentEntityState, EntityStateRequired );

        // Update our Entity State
        CurrentEntityState = EntityStateRequired;

        // Do State Specific Updates

        if ( EntityStateRequired == getEntityState("IN_FUNDING") ) {
            // run Funding state changer
            // doStateChanges
        }

        // EntityStateRequired = getEntityState("IN_FUNDING");


        // Funding Failed
        /*
        if ( EntityStateRequired == getEntityState("FUNDING_FAILED_START") ) {
            // set ProcessVaultList Task
            currentTask = getHash("FUNDING_FAILED_START", "");
            CurrentEntityState = getEntityState("FUNDING_FAILED_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("FUNDING_FAILED_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

            // Funding Successful
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_START") ) {

            // init SCADA variable cache.
            if(TokenSCADAEntity.initCacheForVariables()) {
                // start processing vaults
                currentTask = getHash("FUNDING_SUCCESSFUL_START", "");
                CurrentEntityState = getEntityState("FUNDING_SUCCESSFUL_PROGRESS");
            } else {
                // something went really wrong, just bail out for now
                CurrentEntityState = getEntityState("FUNDING_FAILED_START");
            }
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);
            // Milestones
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_START") ) {
            currentTask = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneId() );
            CurrentEntityState = getEntityState("MILESTONE_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

            // Completion
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_START") ) {
            currentTask = getHash("COMPLETE_PROCESS_START", "");
            CurrentEntityState = getEntityState("COMPLETE_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);
        }
        */
    }

    /*
     * Method: Get Entity Required State Changes
     *
     * @access       public
     * @type         method
     *
     * @return       ( uint8 CurrentEntityState, uint8 EntityStateRequired )
     */
    function getRequiredStateChanges() public view returns (uint8, uint8) {

        uint8 EntityStateRequired = getEntityState("__IGNORED__");

        if( CurrentEntityState == getEntityState("NEW") ) {
            // general so we know we initialized
            EntityStateRequired = getEntityState("WAITING");

        } else if ( CurrentEntityState == getEntityState("WAITING") ) {

            // Funding Started
            if( FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("IN_PROGRESS") ) {
                EntityStateRequired = getEntityState("IN_FUNDING");
            }

        } else if ( CurrentEntityState == getEntityState("IN_FUNDING") ) {

            if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL")) {
                // SUCCESSFUL_FINAL means FUNDING was successful, and FundingManager has finished distributing tokens and ether
                EntityStateRequired = getEntityState("IN_DEVELOPMENT");

            } else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FAILED_FINAL")) {
                // Funding failed..
                EntityStateRequired = getEntityState("IN_GLOBAL_CASHBACK");
            }

        } else if ( CurrentEntityState == getEntityState("IN_DEVELOPMENT") ) {

            // this is where most things happen
            // milestones get developed
            // code upgrades get initiated
            // proposals get created and voted

            /*
            if(ProposalsEntity.CurrentEntityState() == ProposalsEntity.getEntityState("CODE_UPGRADE_ACCEPTED")) {
                // check if we have an upgrade proposal that is accepted and move into said state
                EntityStateRequired = getEntityState("START_CODE_UPGRADE");
            }
            else
            */

            if(MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("DEVELOPMENT_COMPLETE")) {
                // check if we finished developing all milestones .. and if so move state to complete.
                EntityStateRequired = getEntityState("DEVELOPMENT_COMPLETE");
            }

            if(MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("DEADLINE_MEETING_TIME_FAILED")) {
                EntityStateRequired = getEntityState("IN_GLOBAL_CASHBACK");
            }

        } else if ( CurrentEntityState == getEntityState("START_CODE_UPGRADE") ) {

            // check stuff to move into IN_CODE_UPGRADE
            // EntityStateRequired = getEntityState("IN_CODE_UPGRADE");

        } else if ( CurrentEntityState == getEntityState("IN_CODE_UPGRADE") ) {

            // check stuff to finish
            // EntityStateRequired = getEntityState("FINISHED_CODE_UPGRADE");

        } else if ( CurrentEntityState == getEntityState("FINISHED_CODE_UPGRADE") ) {

            // move to IN_DEVELOPMENT or DEVELOPMENT_COMPLETE based on state before START_CODE_UPGRADE.
            // EntityStateRequired = getEntityState("DEVELOPMENT_COMPLETE");
            // EntityStateRequired = getEntityState("FINISHED_CODE_UPGRADE");

        }

        return (CurrentEntityState, EntityStateRequired);
    }

    function getTimestamp() view public returns (uint256) {
        return now;
    }

}