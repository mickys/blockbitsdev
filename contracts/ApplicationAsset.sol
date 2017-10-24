/*

 * @name        Application Asset Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Any contract inheriting this will be usable as an Asset in the Application Entity

*/

pragma solidity ^0.4.17;

contract ApplicationAsset {

    event EventAppAssetOwnerSet(bytes32 indexed _name, address indexed _owner);
    event EventRunBeforeInit(bytes32 indexed _name);

    bytes32 assetName;

    /* Asset records */
    uint8 public RecordNum = 0;

    /* Asset initialised or not */
    bool public _initialized = false;
    
    /* Asset owner ( ApplicationEntity address ) */
    address public owner = address(0x0) ;

    function ApplicationAsset() public {

    }

    function setInitialOwnerAndName(bytes32 _name) external requireNotInitialised returns (bool){
        address _newOwner = msg.sender;
        require(owner == address(0x0) && _newOwner != address(0x0));
        owner = _newOwner;
        assetName = _name;
        if(runBeforeInitialization()) {
            _initialized = true;
            EventAppAssetOwnerSet(_name, owner);
            return true;
        } else {
            revert();
        }
    }

    function runBeforeInitialization() internal requireNotInitialised returns(bool) {
        EventRunBeforeInit(assetName);
        return true;
    }

    function transferToNewOwner(address _newOwner) public requireInitialised onlyOwner returns (bool) {
        require(owner != address(0x0) && _newOwner != address(0x0));
        owner = _newOwner;
        EventAppAssetOwnerSet(assetName, owner);
        return true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
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
