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
import "./Entity/ListingContract.sol";



contract ApplicationEntity {

    /* Source Code Url */
    bytes32 sourceCodeUrl;

    /* Entity initialised or not */
    bool public _initialized = false;

    /* GatewayInterface address */
    address GatewayInterfaceAddress;

    /* Parent Entity Instance */
    GatewayInterface GatewayInterfaceEntity;

    /* Asset Entities */
    Proposals ProposalsEntity;
    Funding FundingEntity;
    Milestones MilestonesEntity;
    Meetings MeetingsEntity;
    GeneralVault GeneralVaultEntity;
    ListingContract ListingContractEntity;

    event EventAppEntityReady ( address indexed _address );
    event EventAppEntityCodeUpgradeProposal ( address indexed _address, bytes32 indexed _sourceCodeUrl );
    event EventAppEntityInitAsset ( bytes32 indexed _name, address indexed _address );
    /*
        Empty Constructor
    */
    function ApplicationEntity() public {

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
    function addAssetProposals(address _assetAddresses) external requireNotInitialised {
        ProposalsEntity = Proposals(_assetAddresses);
        EventAppEntityInitAsset("Proposals", _assetAddresses);
    }

    function addAssetFunding(address _assetAddresses) external requireNotInitialised {
        FundingEntity = Funding(_assetAddresses);
        EventAppEntityInitAsset("Funding", _assetAddresses);
    }

    function addAssetMilestones(address _assetAddresses) external requireNotInitialised {
        MilestonesEntity = Milestones(_assetAddresses);
        EventAppEntityInitAsset("Milestones", _assetAddresses);
    }

    function addAssetMeetings(address _assetAddresses) external requireNotInitialised {
        MeetingsEntity = Meetings(_assetAddresses);
        EventAppEntityInitAsset("Meetings", _assetAddresses);
    }

    function addAssetGeneralVault(address _assetAddresses) external requireNotInitialised {
        GeneralVaultEntity = GeneralVault(_assetAddresses);
        EventAppEntityInitAsset("GeneralVault", _assetAddresses);
    }

    function addAssetListingContract(address _assetAddresses) external requireNotInitialised {
        ListingContractEntity = ListingContract(_assetAddresses);
        EventAppEntityInitAsset("ListingContract", _assetAddresses);
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

    modifier requireParent() {
        require(GatewayInterfaceAddress != address(0x0));
        _;
    }

    modifier requireNoParent() {
        require(GatewayInterfaceAddress == address(0x0));
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true);
        _;
    }

}