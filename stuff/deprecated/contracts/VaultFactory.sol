/*

 * @name        Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    Vault Factory test
*/

pragma solidity ^0.4.17;


contract VaultContract {
    address public owner;
    uint256 public amount = 0;

    event VaultReceived ( uint256 indexed _amount );

    function receive(address _sender) public payable {
        owner = _sender;
        amount = msg.value;
        VaultReceived(msg.value);
    }
}

contract VaultFactory {

    event NewVaultCreated ( address indexed _address );
    event VaultReceivedNotIndexed ( uint256 indexed _amount );

    mapping (uint256 => address) public vaultRegistry;
    uint256 public vaultNum = 0;

    function createVault() public payable returns (address) {
        uint256 vaultId = vaultNum++;
        VaultContract newVault = new VaultContract();
        vaultRegistry[vaultId] = newVault;

        VaultReceivedNotIndexed(msg.value);


        // let's make some voodoo
        if( newVault.call.value(msg.value)(bytes4(keccak256("receive(address)")), msg.sender) ) {
            NewVaultCreated(newVault);
            return newVault;
        } else {
            revert();
        }
    }


}