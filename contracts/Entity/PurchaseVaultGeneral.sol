/*

 * @name        Entity/PurchaseVault/General Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


    a factory creates this contract, sets it up, then transfers eth to it.

    if project is successful
    the collector contract assigns a token balance to this contract.

    if project is underfunded
    Owner of this contract can retrieve their locked ETH


*/

pragma solidity ^0.4.17;

contract PurchaseVaultGeneral {


    address public WalletOwner;

    address public platformMultiSigOutputAddress;
    address public collectorAddress;

    event EntityPurchaseVaultGeneralLogPaymentReceived(address sender, uint amount);
    event LogPaid(address recipient, uint amount);


    function InitializeVault() public returns (bool) {
        // connect our milestones entity
        // MilestonesEntity = Milestones(_milestoneObject);

        // connect our collector entity
        // MilestonesEntity = Milestones(_milestoneObject);

        WalletOwner = msg.sender;
        return true;
    }

    function ReceivePayment(address _sender) public payable returns(bool)
    {
        EntityPurchaseVaultGeneralLogPaymentReceived(msg.sender, msg.value);
        EntityPurchaseVaultGeneralLogPaymentReceived(_sender, msg.value);

        return true;
    }

    // abstract method that sends ether to the owner, only if the project's funding failed
    function OwnerRequestsEther() view public onlyOwner {
        if(WalletOwner != address(0x0)) {
            
        }
    }

    // abstract method that sends ether to the project, only if the project's funding succeeded
    function ProjectRequestsEther() view public onlyOwner {
        if(WalletOwner != address(0x0)) {
            
        }
    }

    /**
    * Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        require(msg.sender == WalletOwner);
        _;
    }

    /**
    * @dev Allows the current owner to transfer control of the contract to a newOwner.
    * @param newOwner The address to transfer ownership to.
    */
    function transferOwnership(address newOwner) public onlyOwner {
        if (newOwner != address(0)) {
            WalletOwner = newOwner;
        }
    }


}