/*

 * @name        Application Entity Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the main company Entity Contract code deployed and linked to the Gateway Interface.

*/

pragma solidity ^0.4.17;

import "./GatewayInterface.sol";
// import "./Entity/Meetings.sol";
// import "./Entity/Proposals.sol";
// import "./Entity/Milestones.sol";


contract ApplicationEntity {

    /* Entity initialised or not */
    bool public _initialized = false;

    /* Parent address ( GatewayInterface or ListingContract for child ) */
    address public ParentAddress;

    /* Parent Entity Instance */
    GatewayInterface GatewayInterfaceEntity;

    /*
        Empty Constructor
    */
    function ApplicationEntity() public {

    }

    /*
    *   Initialize Entity and it's assets
    */
    function initialize(address _ParentInterfaceAddress) external requireNotInitialised {

        ParentAddress = _ParentInterfaceAddress;

        // init gateway entity and set app address
        GatewayInterfaceEntity = GatewayInterface(_ParentInterfaceAddress);
        GatewayInterfaceEntity.setApplicationEntityAddress( address(this) );

        // MilestonesEntity = new Milestones();
        // MilestonesEntity.setOwner( address(this) );

        // for now we just create the entity and link ourselves in.. no migrations
        // MeetingsEntity = new Meetings( address(this) );
        // ProposalsEntity = new Proposals(); // , address(MeetingsEntity)
        // ProposalsEntity.setOwner( address(this) );

        _initialized = true;
    }

    function getParentAddress() external view returns(address) {
        return ParentAddress;
    }

    function addProposal() external pure {
        // ProposalsEntity.add();
    }

    function processLinkRequest(uint16 _requestId) onlyParentInterface() {
        // add state change request
        // then on tick run request
        // tick checks if allowed or not

        // GatewayInterfaceEntity.approve(_requestId);
        // GatewayInterfaceEntity.deny(_requestId);
    }

    // since we might change contract structure in the future,
    // new contracts should hold "old to new" conversion
    function migrate(address _oldVersionAddress) external view onlyParentInterface  {
        // do nothing for now
        require(address(_oldVersionAddress) != 0);
    }

    /*
    * Throws if called by any other entity except GatewayInterface
    */
    modifier onlyParentInterface() {
        require(ParentAddress != address(0) && msg.sender == ParentAddress);
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