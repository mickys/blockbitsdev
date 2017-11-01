/*

 * @name        Application Entity Generic Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    Used for the ABI interface when assets need to call Application Entity.

    This is required, otherwise we end up loading the assets themselves when we load the ApplicationEntity contract
    and end up in a loop
*/

pragma solidity 0.4.17;

contract ApplicationEntityABI {

    mapping (bytes32 => address) public AssetCollection;
    mapping (uint8 => bytes32) public AssetCollectionIdToName;

    function getBylawUint256(bytes32 name) public view returns (uint256);
    function getBylawString(bytes32 name) public view returns (string);


}