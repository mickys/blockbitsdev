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

    function amount_direct() public view returns (uint256) {
        return VaultStorage.amount_direct;
    }

    function amount_milestone() public view returns (uint256) {
        return VaultStorage.amount_milestone;
    }

    function emergencyFundReleased() public view returns (bool) {
        return VaultStorage.emergencyFundReleased;
    }

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
        require(msg.sender == VaultStorage.vaultOwner);
        _;
    }

    modifier onlyManager() {
        require(msg.sender == VaultStorage.managerAddress);
        _;
    }

    modifier requireInitialised() {
        require(VaultStorage._initialized == true);
        _;
    }

    modifier requireNotInitialised() {
        require(VaultStorage._initialized == false);
        _;
    }
}