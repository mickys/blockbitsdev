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
        Lock and BlackHole settings
    */

    bool public allFundingProcessed = false;
    bool public DirectFundingProcessed = false;

    /*
        Assets
    */
    ApplicationEntityABI public ApplicationEntity;
    Funding public FundingEntity;
    FundingManager public FundingManagerEntity;
    Milestones public MilestonesEntity;
    TokenManager public TokenManagerEntity;
    TokenSCADAGeneric public TokenSCADAEntity;
    Token public TokenEntity ;

    /*
        Globals
    */
    uint256 public amount_direct = 0;
    uint256 public amount_milestone = 0;

    bool emergencyFundReleased = false;
    uint8 emergencyFundPercentage = 0;

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

        address TokenAddress = TokenManagerEntity.TokenEntity();
        TokenEntity = Token(TokenAddress);

        address TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();
        TokenSCADAEntity = TokenSCADAGeneric(TokenSCADAAddress);

        // set Emergency Fund Percentage if available.
        address ApplicationEntityAddress = TokenManagerEntity.owner();
        ApplicationEntity = ApplicationEntityABI(ApplicationEntityAddress);
        emergencyFundPercentage = uint8( ApplicationEntity.getBylawUint256("emergency_fund_percentage") );


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
                    TokenEntity.transfer(vaultOwner, TokenEntity.balanceOf(address(this)) );

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

                if(milestoneId == BalanceNum) {
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

                if(milestoneId == BalanceNum) {
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

        uint8 currentMilestoneId = MilestonesEntity.currentRecord();
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