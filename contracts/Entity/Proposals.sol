/*

 * @name        Proposals Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Proposals Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.14;

import "./../ApplicationAsset.sol";
import "./../ApplicationEntity.sol";

contract Proposals is ApplicationAsset {

    ApplicationEntity Application;

    enum ProposalActionTypes  {
        MILESTONE_DEADLINE,
        MILESTONE_POSTPONING,
        EMERGENCY_FUND_RELEASE,
        PROJECT_DELISTING,
        CODE_UPGRADE
    }

    enum States {
        NEW,
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


    struct codeUpgradeRecord {
        address _address;
        bytes32 _sourceCodeUrl;
    }

    mapping (uint256 => codeUpgradeRecord) public codeUpgradeRegistry;


    event EventProposalsCodeUpgradeNew ( bytes32 indexed _hash, uint256 indexed _requestId );

    function getHash(uint8 actionType, bytes32 arg1, bytes32 arg2) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1, arg2);
    }

    function add() internal view onlyOwner {
        // find out AppEntity delivery state and based on that decide if initiator has access to call this or not

    }

    function addCodeUpgradeProposal(address _addr, bytes32 _sourceCodeUrl) external onlyOwner returns (uint256) {

        bytes32 thisHash = getHash( uint8(ProposalActionTypes.CODE_UPGRADE), bytes32(_addr), _sourceCodeUrl );

        if(reqByHash[thisHash] == 0x0) {

            record storage proposal = registry[++RecordNum];
                proposal.creator = owner;
                proposal.name = "Code Upgrade";
                proposal.description = _sourceCodeUrl;
                proposal.actionType = ProposalActionTypes.CODE_UPGRADE;
                proposal.state = States.NEW;
                proposal.hash = thisHash;
                proposal.index = RecordNum;

            codeUpgradeRecord storage cur = codeUpgradeRegistry[RecordNum];
                cur._address = _addr;
                cur._sourceCodeUrl = _sourceCodeUrl;

        } else {
            // already exists!
            revert();
        }

        EventProposalsCodeUpgradeNew ( thisHash, RecordNum );
        return RecordNum;
    }

    function acceptCodeUpgrade(uint256 recordId) internal {
        // reinitialize this each time, because we reply on "owner" as the address, and it could change
        Application = ApplicationEntity(owner);

        codeUpgradeRecord storage cur = codeUpgradeRegistry[recordId];
        Application.acceptCodeUpgradeProposal(cur._address);
    }

}