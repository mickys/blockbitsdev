/*

 * @name        Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Used as a resolver to retrieve the latest deployed version of the Company contract

*/

pragma solidity ^0.4.17;

import "./ApplicationEntity.sol";

contract GatewayInterface {

    enum EventTypes     { NEW, PENDING, DONE, CANCEL, FAILED }
    enum Phases         { NEW, PROGRESS, DONE, CANCEL, FAILED }

    uint16 constant noIndex = 0;
    event Event ( EventTypes eventType, address newAddress, uint16 index );

    struct request {
        address initiator;
        address current;
        address proposed;
        bytes32 url;
        uint256 time;                       // 2^32 - we don't care about times in the past.. so this should be just fine
        Phases  phase;
        bool    cancelled;
        uint16  index;                      // 0 to 65,535 should be more than enough
    }

    mapping (address => request) public registry;
    mapping (uint16 => address) public reqById;
    uint16 public reqNum = 0;

    address public owner;                               // contract owner
    address public currentApplicationEntityAddress;     // currently linked ApplicationEntity address

    ApplicationEntity appInstance;

    // constructor 
    function GatewayInterface(address _address) public {
        owner = msg.sender;
    }

    /*
    * Get current ApplicationEntity Contract address
    *
    * @return       address currentApplicationEntityAddress
    */
    function getApplicationEntityAddress() public view returns (address) {
        return currentApplicationEntityAddress;
    }

    /*
    * Get current ApplicationEntity Contract address
    *
    * @return       address currentApplicationEntityAddress
    */
    function revokeOwner() external onlyOwnerOrApplicationEntity {
        // check ApplicationEntity State, make sure all Milestones are complete
        // and if so set owner to ApplicationEntity Contract Address
        owner = currentApplicationEntityAddress;
    }

    /*
    * GatewayInterface can initiate a new linkage request.
    *
    * Will auto link if gateway interface is new.
    * Else will record request and submit it for approval in current ApplicationEntity
    *
    * @param        address _new
    * @param        bytes32 _url
    * @event        EventTypes.NEW, EventTypes.DONE, EventTypes.PENDING
    * @modifiers    onlyOwner
    * @return
    */
    function add( address _new, bytes32 _url) external onlyOwnerOrApplicationEntity {

        // make sure new address is provided
        require( _new != address(0) );

        Event( EventTypes.NEW, _new, noIndex);

        if(currentApplicationEntityAddress == address(0)) {
            // first linkage, no need to check anything
            recordLinkRequest( _new, _url);
            currentApplicationEntityAddress = _new;

            // instantiate current application entity
            appInstance = ApplicationEntity(currentApplicationEntityAddress);
            Event( EventTypes.DONE, currentApplicationEntityAddress, noIndex );
        }
        else
        {
            // make sure we haven't requested this already
            require(registry[_new].current == address(0));

            uint16 requestId = recordLinkRequest( _new, _url);

            // move to phase 2
            registry[_new].phase = Phases.PROGRESS;

            // current application entity, start voting for request
            appInstance = ApplicationEntity(currentApplicationEntityAddress);

            appInstance.processLinkRequest( requestId );

            Event( EventTypes.PENDING, _new, requestId );
        }
    }


    /*
    * ApplicationEntity can approve a linkage request.
    *
    * @param        uint16 _id
    * @event        EventLinkageUpdateDone
    * @modifiers    onlyEntity
    * @return
    */
    function approve(uint16 _id) external onlyApplicationEntity {

        request storage lr = registry[reqById[_id]];

        // make sure current address matches request "old" address
        require(lr.current == currentApplicationEntityAddress );

        // set request to complete
        lr.phase = Phases.DONE;
        currentApplicationEntityAddress = lr.proposed;

        Event( EventTypes.DONE, currentApplicationEntityAddress, lr.index );
    }

    /*
    * ApplicationEntity can deny a linkage request.
    *
    * @param        uint16 _id
    * @event        EventLinkageUpdateFailed
    * @modifiers    onlyEntity
    * @return
    */
    function deny(uint16 _id) external onlyApplicationEntity {
        request storage lr = registry[reqById[_id]];

        // set request to failed
        lr.phase = Phases.FAILED;

        // fire failed linkage
        Event( EventTypes.FAILED, lr.proposed, lr.index );
    }

    /*
    * GatewayInterface can cancel a linkage request. Will broadcast downstream.
    *
    * @param        address linkAddress
    * @event        EventLinkageUpdateCancel
    * @modifiers    onlyOwner
    * @return
    */
    function cancel(address _address) external onlyOwnerOrApplicationEntity {
        registry[_address].cancelled = true;
        Event( EventTypes.CANCEL, registry[_address].proposed, registry[_address].index );

        // cancel voting if already started inside ApplicationEntity
        // EntityInstance.cancelLinkageRequestVote( requestRegistry[linkAddress].index );
    }

    /*
    * Record new linkage request
    *
    * @param        address _new
    * @param        bytes32 _url
    * @return
    */
    function recordLinkRequest( address _new, bytes32 _url) internal returns (uint16) {

        // make sure this address has not been requested before
        require( registry[_new].current == address(0) );

        ++reqNum; // increment then set value

        // set registry
        registry[_new] = request({
        initiator:  msg.sender,
        current:    currentApplicationEntityAddress,
        proposed:   _new,
        url:        _url,
        time:       now,
        phase:      Phases.NEW,
        cancelled:  false,
        index:      reqNum
        });

        // index by id for easy access
        reqById[reqNum] = _new;

        return reqNum;
    }

    /*
    * Throws if called by any other entity except ApplicationEntity
    */
    modifier onlyApplicationEntity() {
        require(msg.sender == currentApplicationEntityAddress);
        _;
    }

    /*
    * Change owner, fires Ownership event
    *
    * @param        address _newOwner
    * @event        EventOwnershipChange
    * @modifiers    onlyOwner
    * @return       void
    */
    function changeOwner(address _newOwner) public onlyOwner {
        owner = _newOwner;
    }

    /*
    * Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /*
    * Throws if called by any account other than the owner or the ApplicationEntity contract.
    */
    modifier onlyOwnerOrApplicationEntity() {
        require(msg.sender == owner || msg.sender == currentApplicationEntityAddress);
        _;
    }

}