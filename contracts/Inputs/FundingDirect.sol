/*

 * @name        FundingDirect Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


*/

pragma solidity ^0.4.17;

import "./../Entity/PurchaseVaultDirect.sol";
import "./../Entity/PurchaseVaultFactory.sol";


contract FundingDirect {

    uint8 public typeId = 0;

    event LogPaymentReceived(address sender, uint amount, uint8 _type);

    PurchaseVaultFactory public VaultFactory ;

    function FundingDirect(address _vaultFactoryAddress) public {
        typeId = 1;
        VaultFactory = PurchaseVaultFactory(_vaultFactoryAddress);
    }
    

    function () public payable {
        buy();
    }

    // first of all, create objects, then save the state, then transfer
    // 1. check if we can accept payment
    // 2. create ownedVault and assign to msg.sender
    // 3. set current sale conditions in it
    // 4. transfer funds into vault

    // this should protect against call stack attacks
        
    function buy() public payable {

        // make sure someone sent a value first
        require(msg.value > 0);

        address NewVaultAddress = VaultFactory.CreateDirectVault(msg.sender);
        PurchaseVaultDirect vault = PurchaseVaultDirect( NewVaultAddress );

        if(!vault.ReceivePayment.value(msg.value)(msg.sender)) {
            revert();
        }

        LogPaymentReceived(msg.sender, msg.value, typeId);
   }
}
