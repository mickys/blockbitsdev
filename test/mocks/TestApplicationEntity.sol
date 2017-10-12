/*

 * @name        Test Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/ApplicationEntity.sol";

contract TestApplicationEntity is ApplicationEntity {

    function setInitialized() external {
        _initialized = true;
    }

    function setGatewayInterfaceEntity(address _address) external {
        GatewayInterfaceAddress = _address;
        GatewayInterfaceEntity = GatewayInterface(GatewayInterfaceAddress);
    }
}
