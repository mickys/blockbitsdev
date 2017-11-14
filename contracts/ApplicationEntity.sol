/*

 * @name        Application Entity Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the main company Entity Contract code deployed and linked to the Gateway Interface.

*/

pragma solidity ^0.4.17;

import "./GatewayInterface.sol";
import "./Entity/Proposals.sol";
import "./Entity/Funding.sol";
import "./Entity/Meetings.sol";
import "./Entity/Milestones.sol";
import "./Entity/GeneralVault.sol";
import "./Entity/TokenManager.sol";
import "./Entity/FundingManager.sol";
import "./Entity/ListingContract.sol";
import "./Entity/NewsContract.sol";

contract ApplicationEntity {

    /* Source Code Url */
    bytes32 sourceCodeUrl;

    /* Entity initialised or not */
    bool public _initialized = false;

    /* Entity locked or not */
    bool public _locked = false;

    /* GatewayInterface address */
    address public GatewayInterfaceAddress;

    /* Parent Entity Instance */
    GatewayInterface GatewayInterfaceEntity;

    /* Asset Entities */
    Proposals public ProposalsEntity;
    Funding public FundingEntity;
    Milestones public MilestonesEntity;
    Meetings public MeetingsEntity;
    GeneralVault public GeneralVaultEntity;
    TokenManager public TokenManagerEntity;
    ListingContract public ListingContractEntity;
    FundingManager public FundingManagerEntity;
    NewsContract public NewsContractEntity;

    /* Asset Collection */
    mapping (bytes32 => address) public AssetCollection;
    mapping (uint8 => bytes32) public AssetCollectionIdToName;
    uint8 public AssetCollectionNum = 0;



    event EventAppEntityReady ( address indexed _address );
    event EventAppEntityCodeUpgradeProposal ( address indexed _address, bytes32 indexed _sourceCodeUrl );
    event EventAppEntityInitAsset ( bytes32 indexed _name, address indexed _address );
    event EventAppEntityInitAssetsToThis ( uint8 indexed _assetNum );
    event EventAppEntityAssetsToNewApplication ( address indexed _address );
    event EventAppEntityLocked ( address indexed _address );

    address public deployerAddress;

    function ApplicationEntity() public {
        deployerAddress = msg.sender;
    }

    /*
    * Initialize Application and it's assets
    * If gateway is freshly deployed, just link
    * else, create a voting proposal that needs to be accepted for the linking
    *
    * @param        address _newAddress
    * @param        bytes32 _sourceCodeUrl
    *
    * @modifiers    requireNoParent, requireNotInitialised
    */
    function linkToGateway(
        address _GatewayInterfaceAddress,
        bytes32 _sourceCodeUrl
    )
        external
        requireNoParent
        requireNotInitialised
        onlyDeployer
    {
        GatewayInterfaceAddress = _GatewayInterfaceAddress;
        sourceCodeUrl = _sourceCodeUrl;

        // init gateway entity and set app address
        GatewayInterfaceEntity = GatewayInterface(GatewayInterfaceAddress);
        GatewayInterfaceEntity.requestCodeUpgrade( address(this), sourceCodeUrl );
    }


    /*
        For the sake of simplicity, and solidity warnings about "unknown gas usage" do this.. instead of sending
        an array of addresses
    */
    function addAssetProposals(address _assetAddresses) external requireNotInitialised onlyDeployer {
        ProposalsEntity = Proposals(_assetAddresses);
        assetInitialized("Proposals", _assetAddresses);
    }

    function addAssetFunding(address _assetAddresses) external requireNotInitialised onlyDeployer {
        FundingEntity = Funding(_assetAddresses);
        assetInitialized("Funding", _assetAddresses);
    }

    function addAssetMilestones(address _assetAddresses) external requireNotInitialised onlyDeployer {
        MilestonesEntity = Milestones(_assetAddresses);
        assetInitialized("Milestones", _assetAddresses);
    }

    function addAssetMeetings(address _assetAddresses) external requireNotInitialised onlyDeployer {
        MeetingsEntity = Meetings(_assetAddresses);
        assetInitialized("Meetings", _assetAddresses);
    }

    function addAssetGeneralVault(address _assetAddresses) external requireNotInitialised onlyDeployer {
        GeneralVaultEntity = GeneralVault(_assetAddresses);
        assetInitialized("GeneralVault", _assetAddresses);
    }

    function addAssetTokenManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        TokenManagerEntity = TokenManager(_assetAddresses);
        assetInitialized("TokenManager", _assetAddresses);
    }

    function addAssetFundingManager(address _assetAddresses) external requireNotInitialised onlyDeployer {
        FundingManagerEntity = FundingManager(_assetAddresses);
        assetInitialized("FundingManager", _assetAddresses);
    }

    function addAssetListingContract(address _assetAddresses) external requireNotInitialised onlyDeployer {
        ListingContractEntity = ListingContract(_assetAddresses);
        assetInitialized("ListingContract", _assetAddresses);
    }

    function addAssetNewsContract(address _assetAddresses) external requireNotInitialised onlyDeployer {
        NewsContractEntity = NewsContract(_assetAddresses);
        assetInitialized("NewsContract", _assetAddresses);
    }

    function assetInitialized(bytes32 name, address _assetAddresses) internal {
        require(AssetCollection[name] == 0x0);
     
        AssetCollectionIdToName[AssetCollectionNum] = name;
        AssetCollection[name] = _assetAddresses;
        AssetCollectionNum++;

        EventAppEntityInitAsset(name, _assetAddresses);
    }

    /* Application Bylaws mapping */
    mapping (bytes32 => uint256) public BylawsUint256;
    mapping (bytes32 => string) public BylawsString;


    function setBylawUint256(bytes32 name, uint256 value) public requireNotInitialised onlyDeployer {
        BylawsUint256[name] = value;
    }

    function getBylawUint256(bytes32 name) public view requireInitialised returns (uint256) {
        return BylawsUint256[name];
    }

    function setBylawString(bytes32 name, string value) public requireNotInitialised onlyDeployer {
        BylawsString[name] = value;
    }

    function getBylawString(bytes32 name) public view requireInitialised returns (string) {
        return BylawsString[name];
    }

    function initialize() external requireNotInitialised onlyGatewayInterface returns (bool) {
        _initialized = true;
        EventAppEntityReady( address(this) );
        return true;
    }

    function getParentAddress() external view returns(address) {
        return GatewayInterfaceAddress;
    }

    function createCodeUpgradeProposal(
        address _newAddress,
        bytes32 _sourceCodeUrl
    )
        external
        requireInitialised
        onlyGatewayInterface
        returns (uint256)
    {
        // proposals create new.. code upgrade proposal
        EventAppEntityCodeUpgradeProposal ( _newAddress, _sourceCodeUrl );

        // return true;
        return ProposalsEntity.addCodeUpgradeProposal(_newAddress, _sourceCodeUrl);
    }

    /*
    * Only a proposal can update the ApplicationEntity Contract address
    *
    * @param        address _newAddress
    * @modifiers    onlyProposalsAsset
    */
    function acceptCodeUpgradeProposal(address _newAddress) external onlyProposalsAsset  {
        GatewayInterfaceEntity.approveCodeUpgrade( _newAddress );
    }

    function initializeAssetsToThisApplication() external onlyGatewayInterface returns (bool) {

        for(uint8 i = 0; i < AssetCollectionNum; i++ ) {
            bytes32 _name = AssetCollectionIdToName[i];
            address current = AssetCollection[_name];
            if(!current.call(bytes4(keccak256("setInitialOwnerAndName(bytes32)")), _name) ) {
                revert();
            }
        }
        EventAppEntityInitAssetsToThis( AssetCollectionNum );

        return true;
    }

    function transferAssetsToNewApplication(address _newAddress) external onlyGatewayInterface returns (bool){
        for(uint8 i = 0; i < AssetCollectionNum; i++ ) {
            
            bytes32 _name = AssetCollectionIdToName[i];
            address current = AssetCollection[_name];
            if(!current.call(bytes4(keccak256("transferToNewOwner(address)")), _newAddress) ) {
                revert();
            }
        }
        EventAppEntityAssetsToNewApplication ( _newAddress );
        return true;
    }

    /*
    * Only the gateway interface can lock current app after a successful code upgrade proposal
    *
    * @modifiers    onlyGatewayInterface
    */
    function lock() external onlyGatewayInterface returns (bool) {
        _locked = true;
        EventAppEntityLocked(address(this));
        return true;
    }

    /*
        DUMMY METHOD, to be replaced in a future Code Upgrade with a check to determine if sender CAN initiate a code upgrade
    */
    function canInitiateCodeUpgrade(address _sender) public view returns(bool) {
        // suppress warning
        _sender = 0;
        if(_initialized) { }
        return false;
    }

    /*
    * Throws if called by any other entity except GatewayInterface
    */
    modifier onlyGatewayInterface() {
        require(GatewayInterfaceAddress != address(0) && msg.sender == GatewayInterfaceAddress);
        _;
    }

    /*
    * Throws if called by any other entity except Proposals Asset Contract
    */
    modifier onlyProposalsAsset() {
        require(msg.sender == address(ProposalsEntity));
        _;
    }

    modifier requireNoParent() {
        require(GatewayInterfaceAddress == address(0x0));
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false && _locked == false);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true && _locked == false);
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployerAddress);
        _;
    }

}