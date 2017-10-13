/*

 * @name        Test Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/ApplicationEntity.sol";

contract TestApplicationEntity is ApplicationEntity {

    function setTestInitialized() external {
        _initialized = true;
    }

    function setTestGatewayInterfaceEntity(address _address) external {
        GatewayInterfaceAddress = _address;
        GatewayInterfaceEntity = GatewayInterface(GatewayInterfaceAddress);
    }

    function callTestApproveCodeUpgrade(address _address) external {
        GatewayInterfaceEntity.approveCodeUpgrade(_address);
    }

    function callTestAssetTransferToNewOwner(address _address, address _newOwner) external returns (bool) {
        return _address.call(bytes4(keccak256("transferToNewOwner(address)")), _newOwner);
    }
}
