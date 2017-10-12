/*

 * @name        Test Application Asset Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/ApplicationAsset.sol";

contract TestApplicationAsset is ApplicationAsset {

    function setTestOwner(address _address) external {
        owner = _address;
    }

}
