/*

 * @name        Application Asset Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Any contract inheriting this will be usable as an Asset in the Application Entity

*/

pragma solidity ^0.4.17;
import "./ApplicationEntityABI.sol";

contract ApplicationAsset {

    event EventAppAssetOwnerSet(bytes32 indexed _name, address indexed _owner);
    event EventRunBeforeInit(bytes32 indexed _name);
    event EventRunBeforeApplyingSettings(bytes32 indexed _name);

    bytes32 assetName;

    /* Asset records */
    uint8 public RecordNum = 0;

    /* Asset initialised or not */
    bool public _initialized = false;

    /* Asset settings present or not */
    bool public _settingsApplied = false;

    /* Asset owner ( ApplicationEntity address ) */
    address public owner = address(0x0) ;
    address public _deployerAddress = address(0x0) ;


    function ApplicationAsset() public {
        _deployerAddress = msg.sender;
    }

    function setInitialOwnerAndName(bytes32 _name) external requireNotInitialised returns (bool){
        address _newOwner = msg.sender;
        require(owner == address(0x0) && _newOwner != address(0x0));
        owner = _newOwner;
        assetName = _name;
        runBeforeInitialization();
        _initialized = true;
        EventAppAssetOwnerSet(_name, owner);
        return true;
    }

    function runBeforeInitialization()
        internal
        requireNotInitialised
    {
        EventRunBeforeInit(assetName);
    }

    function applyAndLockSettings()
        public
        requireInitialised
        requireSettingsNotApplied
        onlyDeployer
        returns(bool)
    {
        runBeforeApplyingSettings();
        _settingsApplied = true;
        return true;
    }

    function runBeforeApplyingSettings() internal requireInitialised requireSettingsNotApplied {
        EventRunBeforeApplyingSettings(assetName);
    }

    function transferToNewOwner(address _newOwner) public requireInitialised onlyOwner returns (bool) {
        require(owner != address(0x0) && _newOwner != address(0x0));
        owner = _newOwner;
        EventAppAssetOwnerSet(assetName, owner);
        return true;
    }

    function getApplicationAssetAddressByName(bytes32 _name) public view requireInitialised returns(address) {
        address asset = ApplicationEntityABI(owner).AssetCollection(_name);
        if( asset != address(0x0) ) {
            return asset;
        } else {
            revert();
        }

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

    modifier requireSettingsApplied() {
        require(_settingsApplied == true);
        _;
    }

    modifier requireSettingsNotApplied() {
        require(_settingsApplied == false);
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == _deployerAddress);
        _;
    }
}
