/*

 * @name        Link Database Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the linkage database used to upgrade ApplicationEntity address link based on shareholder voting

 Restraints:
    linking can be updated only in the following cases

 1 - Currently linked contract does not exist
    * request is processed instantly

 2 - If currently linked contract holds ether
    * check if a "proposal for upgrade" has been initiated
    * if said proposal is accepted, link
    * else initiate new upgrade proposal that needs to be voted by shareholders.

*/

pragma solidity ^0.4.17;

contract LinkDatabase {

    enum EventTypes     { NEW, PENDING, DONE, CANCEL, FAILED }
    enum Phases         { NEW, PROGRESS, DONE, CANCEL, FAILED }

    uint16 constant noIndex = 0;
    event Event ( EventTypes eventType, address newAddress, uint16 index );

    address public GIAddress;               // GatewayInterface address
    address public current;                 // currently linked ApplicationEntity address

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

    function LinkDatabase() public {

    }

    function getApplicationEntityAddress() public view returns (address) {
        return current;
    }

    /*
    * Record new linkage request
    *
    * @param        address _new
    * @param        bytes32 _url
    * @return
    */
    function recordLinkRequest( address _new, bytes32 _url) internal {

        // make sure this address has not been requested before
        require( registry[_new].current == address(0) );

        ++reqNum; // increment then set value

        // set registry
        registry[_new] = request({
        initiator:  msg.sender,
        current:    current,
        proposed:   _new,
        url:        _url,
        time:       now,
        phase:      Phases.NEW,
        cancelled:  false,
        index:      reqNum
        });

        // index by id for easy access
        reqById[reqNum] = _new;
    }

    /*
    * GatewayInterface can initiate a new linkage request.
    *
    * Will auto link if gateway interface is new.
    * Else will record request and submit it for approval in ApplicationEntity
    *
    * @param        address _new
    * @param        bytes32 _url
    * @event        EventTypes.NEW, EventTypes.DONE, EventTypes.PENDING
    * @modifiers    onlyOwner
    * @return
    */
    function add( address _new, bytes32 _url) external onlyGatewayInterface {

        // make sure new address is provided
        require( _new != address(0) );

        Event( EventTypes.NEW, _new, noIndex);

        if(current == address(0)) {
            // first linkage, no need to check anything
            recordLinkRequest( _new, _url);
            current = _new;
            Event( EventTypes.DONE, current, noIndex );
        }
        else
        {
            // make sure we haven't requested this already
            require(registry[_new].current == address(0));

            recordLinkRequest( _new, _url);

            // move to phase 2
            registry[_new].phase = Phases.PROGRESS;

            Event( EventTypes.PENDING, _new, reqNum );
            /*
            EntityInstance.requestLinkageApproval(
                reqNum,
                requestRegistry[_new].proposed,
                requestRegistry[_new].url
            );
            */

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
        require(lr.current == current );

        // set request to complete
        lr.phase = Phases.DONE;
        current = lr.proposed;

        Event( EventTypes.DONE, current, lr.index );
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
    function cancel(address _address) external onlyGatewayInterface {
        registry[_address].cancelled = true;
        Event( EventTypes.CANCEL, registry[_address].proposed, registry[_address].index );

        // cancel voting if already started inside ApplicationEntity
        // EntityInstance.cancelLinkageRequestVote( requestRegistry[linkAddress].index );
    }

    /*
    * Throws if called by any other entity except ApplicationEntity
    */
    modifier onlyApplicationEntity() {
        require(msg.sender == current);
        _;
    }

    /*
    * Throws if called by any other entity except GatewayInterface
    */
    modifier onlyGatewayInterface() {
        if( current != address(0) )
        require(msg.sender == GIAddress);
        _;
    }

}