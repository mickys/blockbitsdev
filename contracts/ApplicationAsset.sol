/*

 * @name        Application Asset Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Any contract inheriting this will be usable as an Asset in the Application Entity

*/

pragma solidity ^0.4.17;

contract ApplicationAsset {

    event OwnerSet(address indexed _owner);

    /* Asset records */
    uint8 public RecordNum = 0;

    /* Asset initialised or not */
    bool public _initialized = false;
    
    /* Asset owner ( ApplicationEntity address ) */
    address public owner;

    function setOwner(address _owner) public onlyOwner {
        owner = _owner;
        OwnerSet(owner);
    }

    modifier onlyOwner() {
        require(owner != address(0) && msg.sender == owner);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true);
        _;
    }
}
