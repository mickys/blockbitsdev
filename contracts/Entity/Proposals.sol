/*

 * @name        Proposals Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Proposals Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.14;

import "./../ApplicationAsset.sol";

contract Proposals is ApplicationAsset {

    enum ProposalActionTypes  {
        MILESTONE_DEADLINE,
        MILESTONE_POSTPONING,
        EMERGENCY_FUND_RELEASE,
        PROJECT_DELISTING,
        CODE_UPGRADE
    }

    enum States {
        CLEAR,
        WAITING_FOR_MEETING,
        MEETING_VOTE_STARTED,
        MEETING_VOTE_ENDED,
        MEETING_ACCEPTED,
        MEETING_REJECTED,
        VOTING_STARTED,
        VOTING_ENDED,
        // VOTING_ACCEPTED,
        // VOTING_REJECTED,
        FINAL
     }


    struct record {
        address creator;
        bytes32 name;
        bytes32 description;                // will change to hash pointer ( external storage )
        ProposalActionTypes actionType;
        States state;
        uint256 time;
        uint256 duration;
        bytes32 hash;                       // action name + args hash
        uint256 index;
    }

    bytes32 hash;

    mapping (address => record) public registry;
    mapping (uint256 => address) public reqById;
    mapping (bytes32 => address) public reqByHash;

    function getHash(int8 actionType, bytes32 args) public pure returns ( bytes32 ) {
        return keccak256(actionType, args);
    }

    function add() public view onlyOwner {
        // find out AppEntity delivery state and based on that decide if initiator has access to call this or not

    }




}