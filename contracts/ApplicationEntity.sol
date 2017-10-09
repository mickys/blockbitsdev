/*

 * @name        Application Entity Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the main company Entity Contract code deployed and linked to the Gateway Interface.

*/

pragma solidity ^0.4.17;

import "./GatewayInterface.sol";
import "./Entity/Proposals.sol";

// import "./Entity/Meetings.sol";
// import "./Entity/Milestones.sol";


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


    event EventApplicationReady ( address indexed _address );
    event EventCodeUpgradeProposal ( address indexed _address, bytes32 indexed _sourceCodeUrl );


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


    function initialize() external requireNotInitialised onlyGatewayInterface returns (bool) {

        // MilestonesEntity = Milestones();
        // MilestonesEntity.setOwner( address(this) );

        // MeetingsEntity = new Meetings( address(this) );
        // ProposalsEntity = new Proposals(); // , address(MeetingsEntity)
        // ProposalsEntity.setOwner( address(this) );

        _initialized = true;

        EventApplicationReady( address(this) );

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
        onlyGatewayInterface
        returns (bool)
    {
        // proposals create new.. code upgrade proposal
        EventCodeUpgradeProposal ( _newAddress, _sourceCodeUrl );
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