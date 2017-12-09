/*

 * @name        Funding Vault
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    each purchase creates a separate funding vault contract
*/

// add Token / Ether Black Hole prevention

pragma solidity ^0.4.17;

import "./FundingVaultLib.sol";

contract FundingVault {

    using FundingVaultLib for FundingVaultLib.VaultStorage;
    FundingVaultLib.VaultStorage VaultStorage;

     /*
        Addresses:
        vaultOwner - the address of the wallet that stores purchases in this vault ( investor address )
        outputAddress - address where funds go upon successful funding or successful milestone release
        managerAddress - address of the "FundingManager"
    */

     function vaultOwner() public view returns (address) {
        return VaultStorage.vaultOwner;
    }

    function outputAddress() public view returns (address) {
        return VaultStorage.outputAddress;
    }

    function managerAddress() public view returns (address) {
        return VaultStorage.managerAddress;
    }

    function _initialized() public view returns (bool) {
        return VaultStorage._initialized;
    }

    function allFundingProcessed() public view returns (bool) {
        return VaultStorage.allFundingProcessed;
    }

    function DirectFundingProcessed() public view returns (bool) {
        return VaultStorage.DirectFundingProcessed;
    }

    /*
        Assets
    */
    /*
    ApplicationEntityABI public ApplicationEntity;
    Funding public FundingEntity;
    FundingManager public FundingManagerEntity;
    Milestones public MilestonesEntity;
    Proposals public ProposalsEntity;
    TokenManager public TokenManagerEntity;
    TokenSCADAGeneric public TokenSCADAEntity;
    Token public TokenEntity ;
    */

    /*
        Globals
    */
    function amount_direct() public view returns (uint256) {
        return VaultStorage.amount_direct;
    }

    function amount_milestone() public view returns (uint256) {
        return VaultStorage.amount_milestone;
    }

    function emergencyFundReleased() public view returns (bool) {
        return VaultStorage.emergencyFundReleased;
    }

    /*
    mapping(uint16 => PurchaseStruct) public purchaseRecords;
    struct PurchaseStruct {
        uint256 unix_time;
        uint8 payment_method;
        uint256 amount;
        uint8 funding_stage;
        uint16 index;
    }
    */

    /*
    {
    "constant": true,
    "inputs": [
    {
    "name": "",
    "type": "uint16"
    }
    ],
    "name": "purchaseRecords",
    "outputs": [
    {
    "name": "unix_time",
    "type": "uint256"
    },
    {
    "name": "payment_method",
    "type": "uint8"
    },
    {
    "name": "amount",
    "type": "uint256"
    },
    {
    "name": "funding_stage",
    "type": "uint8"
    },
    {
    "name": "index",
    "type": "uint16"
    }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
    },
    */
    function purchaseRecords(uint16 record) public view returns (uint256, uint8, uint256, uint8, uint16) {
        return (
            VaultStorage.getPurchaseRecords_unix_time(record),
            VaultStorage.getPurchaseRecords_payment_method(record),
            VaultStorage.getPurchaseRecords_amount(record),
            VaultStorage.getPurchaseRecords_funding_stage(record),
            VaultStorage.getPurchaseRecords_index(record)
        );
    }

    function purchaseRecordsNum() public view returns (uint16) {
        return VaultStorage.purchaseRecordsNum;
    }

    function stageAmounts(uint8 record) public view returns (uint256) {
        return VaultStorage.stageAmounts[record];
    }

    function stageAmountsDirect(uint8 record) public view returns (uint256) {
        return VaultStorage.stageAmountsDirect[record];
    }

    function etherBalances(uint8 record) public view returns (uint256) {
        return VaultStorage.etherBalances[record];
    }

    function tokenBalances(uint8 record) public view returns (uint256) {
        return VaultStorage.tokenBalances[record];
    }

    function BalanceNum() public view returns (uint8) {
        return VaultStorage.BalanceNum;
    }

    function BalancesInitialised() public view returns (bool) {
        return VaultStorage.BalancesInitialised;
    }

    /*
    mapping (uint8 => uint256) public etherBalances;
    mapping (uint8 => uint256) public tokenBalances;
    uint8 public BalanceNum = 0;

    bool public BalancesInitialised = false;
    */


    /*
    struct PurchaseStruct {
        uint256 unix_time;
        uint8 payment_method;
        uint256 amount;
        uint8 funding_stage;
        uint16 index;
    }
    */

    // mapping(uint16 => PurchaseStruct) public purchaseRecords;
    // uint16 public purchaseRecordsNum;

    event EventPaymentReceived(uint8 indexed _payment_method, uint256 indexed _amount, uint16 indexed _index );

    // mapping(uint16 => bool) public processedRecords;

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

        return VaultStorage.initialize(
            _owner,
            _output,
            _fundingAddress,
            _milestoneAddress,
            _proposalsAddress
        );
    }



    /*
        The funding contract decides if a vault should receive payments or not, since it's the one that creates them,
        no point in creating one if you can't accept payments.
    */



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
        return VaultStorage.addPayment(_payment_method, _funding_stage);
    }


    function getBoughtTokens() public view returns (uint256) {
        return VaultStorage.getBoughtTokens();
    }

    function getDirectBoughtTokens() public view returns (uint256) {
        return VaultStorage.getDirectBoughtTokens();
    }

    function initMilestoneTokenAndEtherBalances() internal
    {
        return VaultStorage.initMilestoneTokenAndEtherBalances();
    }

    function ReleaseFundsAndTokens()
        public
        requireInitialised
        onlyManager
        returns (bool)
    {
        return VaultStorage.ReleaseFundsAndTokens();
    }


    function releaseTokensAndEtherForEmergencyFund()
        public
        requireInitialised
        onlyManager
        returns (bool)
    {
        return VaultStorage.releaseTokensAndEtherForEmergencyFund();
    }

    function ReleaseFundsToInvestor()
        public
        requireInitialised
        isOwner
    {
        VaultStorage.ReleaseFundsToInvestor();
    }

    /*
        1 - if the funding of the project Failed, allows investors to claim their locked ether back.
        2 - if the Investor votes NO to a Development Milestone Completion Proposal, where the majority
            also votes NO allows investors to claim their locked ether back.
        3 - project owner misses to set the time for a Development Milestone Completion Meeting allows investors
        to claim their locked ether back.
    */
    function canCashBack() public view requireInitialised returns (bool) {
        return VaultStorage.canCashBack();
    }

    function checkFundingStateFailed() public view returns (bool) {
        return VaultStorage.checkFundingStateFailed();
    }

    function checkMilestoneStateInvestorVotedNoVotingEndedNo() public view returns (bool) {
        return VaultStorage.checkMilestoneStateInvestorVotedNoVotingEndedNo();
    }

    function checkOwnerFailedToSetTimeOnMeeting() public view returns (bool) {
        return VaultStorage.checkOwnerFailedToSetTimeOnMeeting();
    }


    modifier isOwner() {
        require(msg.sender == vaultOwner());
        _;
    }

    modifier onlyManager() {
        require(msg.sender == managerAddress());
        _;
    }

    modifier requireInitialised() {
        require(_initialized() == true);
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized() == false);
        _;
    }
}