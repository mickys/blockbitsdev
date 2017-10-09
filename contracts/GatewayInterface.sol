/*

 * @name        Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Used as a resolver to retrieve the latest deployed version of the Application

 ENS: gateway.main.blockbits.eth will point directly to this contract.

    ADD ENS domain ownership / transfer methods

*/

pragma solidity ^0.4.17;

contract GatewayInterface {

    event EventNewAddress ( address newAddress );

    address public currentApplicationEntityAddress;     // currently linked ApplicationEntity address

    // constructor
    function GatewayInterface() public {

    }

    /*
    * Set current ApplicationEntity Contract address
    * first time anyone can set it.
    *
    * @param        address _new
    * @modifiers    onlyApplicationEntity
    */
    function setApplicationEntityAddress(address _address) external {

        // if current address is set, allow only the application to point to a new address.
        if(currentApplicationEntityAddress != address(0x0)) {
            require(msg.sender == currentApplicationEntityAddress);
        }

        currentApplicationEntityAddress = _address;
        EventNewAddress(_address);
    }

    /*
    * Get current ApplicationEntity Contract address
    *
    * @return       address currentApplicationEntityAddress
    */
    function getApplicationEntityAddress() external view returns (address) {
        return currentApplicationEntityAddress;
    }

}