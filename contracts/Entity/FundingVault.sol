/*

 * @name        Funding Vault
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    each purchase creates a separate funding vault contract
*/

// add Token / Ether Black Hole prevention

// add Emergency Fund

// think about team's locked tokens


pragma solidity ^0.4.17;

import "./Token.sol";
import "./Funding.sol";
import "./Milestones.sol";
import "./TokenManager.sol";
import "./../Algorithms/TokenSCADAGeneric.sol";

import "./../ApplicationEntityABI.sol";

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
        Assets
    */
    // ApplicationEntityABI public ApplicationEntity;
    Funding public FundingEntity;
    FundingManager public FundingManagerEntity;
    Milestones public MilestonesEntity;
    TokenManager public TokenManagerEntity;
    TokenSCADAGeneric public TokenSCADAEntity;

    /*
        Globals
    */
    uint256 public amount_direct = 0;
    uint256 public amount_milestone = 0;

    bool emergencyFundReleased = false;

    struct PurchaseStruct {
        uint256 unix_time;
        uint8 payment_method;
        uint256 amount;
        uint16 index;
    }

    mapping(uint16 => PurchaseStruct) public purchaseRecords;
    uint16 public purchaseRecordsNum;

    event EventPaymentReceived(uint8 indexed _payment_method, uint256 indexed _amount, uint16 indexed _index );

    mapping(uint16 => bool) public processedRecords;

    event VaultInitialized(address indexed _owner);

    function initialize(
        address _owner,
        address _output,
        address _fundingAddress,
        address _milestoneAddress
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

        address TokenManagerAddress = FundingEntity.getApplicationAssetAddressByName("TokenManager");
        TokenManagerEntity = TokenManager(TokenManagerAddress);

        address TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();
        TokenSCADAEntity = TokenSCADAGeneric(TokenSCADAAddress);

        // address ApplicationEntityAddress = TokenManagerEntity.owner();
        // ApplicationEntity = ApplicationEntityABI(ApplicationEntityAddress);

        // init
        _initialized = true;
        return true;
    }

    /*
        The funding contract decides if a vault should receive payments or not, since it's the one that creates them,
        no point in creating one if you can't accept payments.

    */
    function addPayment(
        uint8 _payment_method
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
                purchase.index = purchaseRecordsNum;

            // assign payment to direct or milestone

            if(_payment_method == 1) {
                amount_direct+= purchase.amount;
            }

            if(_payment_method == 2) {
                amount_milestone+= purchase.amount;
            }

            EventPaymentReceived( purchase.payment_method, purchase.amount, purchase.index );
            return true;
        } else {
            revert();
        }
    }

    function getMyTokenStakeInCurrentFunding() public view returns (uint256) {
        return TokenSCADAEntity.getTokenAmountByEtherForFundingStage(0, amount_direct);
    }

    function ReleaseFundsToOutputAddress()
        public
        view // remove this shit
        requireInitialised
        onlyManager
        returns (bool)
    {
        // first make sure cashback is not possible
        if(!canCashBack()) {
            if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL") ) {

                return true;
                // step 0
                // figure out how much ether we are releasing.
                // based on application state
                // we want to have an internal state or something that does not let us run the same thing again

                // step 1
                // allocate tokens for direct funding.

                // step 2
                // allocate tokens for milestone funding.

                // step 3
                // allocate tokens for emergency fund

                // step 4
                // send ether to output address

            }
        }


        // IF Funding Contract is SUCCESSFUL
        // - release direct funding => direct_released = true

        // check current milestone progress, if any of them is "AWAITING RELEASE"
        // - release funding for said milestone => decrease available funding

        /*

        Upon successful funding, token manager assigns tokens to this vault.

        Flow:
            tokenContract.transfer from this => to my owner
            this.transfer(value) to output address
        */
        return false;
    }

    /*
    function releaseTokensAndEtherForEmergencyFund() public {
        uint256 Emergency_Fund_Exists = ApplicationEntity.getBylawUint256("Emergency_Fund_Exists") ;

        if(Emergency_Fund_Exists == 1 && emergencyFundReleased == false) {
            // get amount percentage from application bylaws
            uint256 percentage = ApplicationEntity.getBylawUint256("Emergency_Fund_Percentage") ;
        }
    }


   function getTokenAmountByEther() public view {

       var (percentInStage, raisedAmount) = FundingEntity.getFundingStageVariablesRequiredBySCADA(_fundingStage);

       // make sure raisedAmount is higher than 0
       if(raisedAmount > 0) {
           uint256 tokensInStage = tokenSupply * percentInStage / 100;
           uint256 myTokens = (tokensInStage * _ether_amount) / raisedAmount;
           return myTokens;
       } else {
           return 0;
       }

    }
    */

    function ReleaseFundsToInvestor()
        public
        requireInitialised
        isOwner
    {
        if(canCashBack()) {

            // IF we're doing a cashback
            // transfer vault tokens back to owner address
            // send all ether to wallet owner

            address TokenAddress = TokenManagerEntity.TokenEntity();
            Token TokenEntity = Token(TokenAddress);

            // get token balance
            uint256 myBalance = TokenEntity.balanceOf(address(this));
            // transfer all vault tokens to owner
            TokenEntity.transferFrom(address(this), outputAddress, myBalance );

            // now transfer all remaining ether back to investor address
            vaultOwner.transfer(this.balance);
        }
    }

    /*
        1 - if the funding of the project Failed, and releases all locked ethereum back to the Investor.
        2 - if the Investor votes NO to a Development Milestone Completion Proposal, where the majority
            also votes NO and releases remaining locked ethereum back to the Investor.

        3 - project owner misses a Development Milestone Completion Meeting and releases remaining locked
            ethereum back to the Investor.

        4 - checks if project is stuck in "development" ?!

        Can be manually triggered by anyone if the project remains stuck at any state
        other than "Development Finalised" for whatever reason. ( Never be possible in
        theory but cannot be ruled out )

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
        // case 4
        if(checkIfAppOrAnyAssetFailedToChangeState()) {
            return true;
        }
        return false;
    }

    function checkFundingStateFailed() public view returns (bool) {
        if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FAILED") ) {
            return true;
        }
        return false;
    }

    function checkMilestoneStateInvestorVotedNoVotingEndedNo() public view returns (bool) {
        if(MilestonesEntity.CurrentEntityState() == MilestonesEntity.getEntityState("VOTING_ENDED_NO") ) {
            // check if we voted NO, and if so return true
            return true;
        }
        return false;
    }

    function checkOwnerFailedToSetTimeOnMeeting() public view returns (bool) {
        // probably need to check all state change rules on all assets.

        uint8 currentMilestoneId = MilestonesEntity.currentMilestone();
        currentMilestoneId = 0;
        // get record times

        // get bylaws from app

        // check if time has passed.

        return false;
    }

    // change to view once we do things
    function checkIfAppOrAnyAssetFailedToChangeState() public pure returns (bool) {
        // probably need to check all state change rules on all assets.
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