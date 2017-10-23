/*

 * @name        Funding Vault
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    each purchase creates a separate funding vault.
*/

pragma solidity ^0.4.17;

import "./Funding.sol";
import "./Milestones.sol";

// import "../library/FundingVaultLib.sol";

contract FundingVault {

    /* Asset initialised or not */
    bool public _initialized = false;

    /*
        Addresses:
        vaultOwner - the address of the wallet that stores purchases in this vault ( investor address )
        outputAddress - address where funds go upon successful funding or successful milestone release
        managerAddress - address of the "fund manager => funding contract"
    */
    address public vaultOwner ;
    address public outputAddress;
    address public managerAddress;

    /*
        Assets
    */
    Funding public FundingEntity;
    Milestones public MilestonesEntity;

    /*
        Globals
    */
    uint256 public amount_direct = 0;
    uint256 public amount_milestone = 0;


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


    function initialize(
        address _owner,
        address _output,
        address _fundingAddress,
        address _milestoneAddress
    )
        public
        requireNotInitialised
    {
        outputAddress = _output;
        vaultOwner = _owner;

        // whomever creates this contract is the manager.
        managerAddress = msg.sender;

        // assets
        FundingEntity = Funding(_fundingAddress);
        MilestonesEntity = Milestones(_milestoneAddress);

        // init
        _initialized = true;
    }

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
            else if(_payment_method == 2) {
                amount_milestone+= purchase.amount;
            }

            EventPaymentReceived( purchase.payment_method, purchase.amount, purchase.index );
            return true;
        } else {
            revert();
        }
    }

    function ReleaseFundsToOutputAddress()
        public
        requireInitialised
        onlyManager
    {
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
    }

    function ReleaseFundsToInvestor()
        public
        requireInitialised
    {
        if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("NEW") ) {

        }
        // IF Funding Contract is FAILED
        // transfer my tokens back to owner address
        // send all ether to wallet owner
    }


    function getStats() public view returns (uint256, uint256) {
        uint256 amoutByDirect = 0;
        uint256 amoutByMilestone = 0;
        for(uint16 i = 1; i <= purchaseRecordsNum; i++ ) {
            PurchaseStruct storage current = purchaseRecords[i];
            // direct funding
            if(current.payment_method == 1) {
                amoutByDirect+=current.amount;
            }
            // milestone funding
            else if(current.payment_method == 2) {
                amoutByMilestone+=current.amount;
            }
        }
        return (amoutByDirect, amoutByMilestone);
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