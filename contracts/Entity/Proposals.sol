/*

 * @name        Proposals Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Proposals Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.17;

import "./Token.sol";
import "./TokenManager.sol";

import "./../ApplicationAsset.sol";
import "./../ApplicationEntityABI.sol";
import "./ListingContract.sol";
import "./FundingVault.sol";

contract Proposals is ApplicationAsset {

    ApplicationEntityABI Application;
    ListingContract ListingContractEntity;
    Funding FundingEntity;
    FundingManager FundingManagerEntity;
    TokenManager TokenManagerEntity;
    Token TokenEntity;

    function getRecordState(bytes32 name) public view returns (uint8) {
        return RecordStates[name];
    }

    function getProposalState(uint256 _proposalId) public view returns (uint8) {
        return registry[_proposalId].state;
    }

    function getActionType(bytes32 name) public view returns (uint8) {
        return ActionTypes[name];
    }

    mapping (bytes32 => uint8) public ActionTypes;

    function setActionTypes() internal {
        ActionTypes["MILESTONE_DEADLINE"] = 1;
        ActionTypes["MILESTONE_POSTPONING"] = 2;
        ActionTypes["PROJECT_DELISTING"] = 75;
        ActionTypes["CODE_UPGRADE"] = 50;
        ActionTypes["EMERGENCY_FUND_RELEASE"] = 60;
    }


    function setEntityStates() internal {

        setActionTypes();

        // ApplicationEntity States
        RecordStates["NEW"]                 = 1;
        RecordStates["WAITING"]             = 2;

        RecordStates["WAITING_FOR_MEETING"] = 3;
        RecordStates["MEETING_VOTE_STARTED"]= 5;
        RecordStates["MEETING_VOTE_ENDED"]  = 50;
        RecordStates["MEETING_ACCEPTED"]    = 150;
        RecordStates["MEETING_REJECTED"]    = 200;

        RecordStates["VOTING_STARTED"]      = 250;
        RecordStates["VOTING_ENDED"]        = 250;
        RecordStates["VOTING_ACCEPTED"]     = 250;
        RecordStates["VOTING_REJECTED"]     = 250;
        RecordStates["FINAL"]               = 250;
    }


    struct record {
        address creator;
        bytes32 name;
        bytes32 description;                // will change to hash pointer ( external storage )
        uint8 actionType;
        uint8 state;
        uint256 time;
        uint256 duration;
        bytes32 hash;                       // action name + args hash
        uint256 index;
    }

    mapping (uint256 => record) public registry;
    mapping (uint256 => address) public reqById;
    mapping (bytes32 => address) public reqByHash;


    struct codeUpgradeRecord {
        address _address;
        bytes32 _sourceCodeUrl;
    }

    mapping (uint256 => codeUpgradeRecord) public codeUpgradeRegistry;

    event EventProposalsCodeUpgradeNew ( bytes32 indexed _hash, uint256 indexed _requestId );

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);

        address FundingManagerAddress = getApplicationAssetAddressByName('FundingManager');
        FundingManagerEntity = FundingManager(FundingManagerAddress);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        TokenManagerEntity = TokenManager(TokenManagerAddress);

        TokenEntity = Token(TokenManagerEntity.TokenEntity());

        address ListingContractAddress = getApplicationAssetAddressByName('ListingContract');
        ListingContractEntity = ListingContract(ListingContractAddress);
    }



    function getHash(uint8 actionType, bytes32 arg1, bytes32 arg2) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1, arg2);
    }

    function add() internal view onlyOwner {
        // find out AppEntity delivery state and based on that decide if initiator has access to call this or not

    }

    // need to implement a way to just iterate through active proposals, and remove the ones we already processed
    // otherwise someone with malicious intent could add a ton of proposals, just to make our contract cost a ton of gas.

    // to that end, we allow individual proposal processing. so that we don't get affected by people with too much
    // money and time on their hands.

    // whenever the system created a proposal, it will store the id, and process it when required.



    function addCodeUpgradeProposal(address _addr, bytes32 _sourceCodeUrl) external onlyOwner returns (uint256) {


        bytes32 thisHash = getHash( getActionType("CODE_UPGRADE"), bytes32(_addr), _sourceCodeUrl );
        // bytes32 thisHash = getHash( uint8(ProposalActionTypes.CODE_UPGRADE), bytes32(_addr), _sourceCodeUrl );

        if(reqByHash[thisHash] == 0x0) {

            record storage proposal = registry[++RecordNum];
                proposal.creator = owner;
                proposal.name = "Code Upgrade";
                proposal.description = _sourceCodeUrl;
                proposal.actionType = getActionType("CODE_UPGRADE");
                proposal.state = getRecordState("NEW");
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

    function CreateProposal(bytes32 _name, bytes32 _hash, uint8 _action) internal {

        /*
        if(reqByHash[_hash] == 0x0) {

            record storage proposal = registry[++RecordNum];
            proposal.creator = owner;
            proposal.name = "Code Upgrade";
            proposal.description = "";
            proposal.actionType = getActionType("CODE_UPGRADE");
            proposal.state = getRecordState("NEW");
            proposal.hash = _hash;
            proposal.index = RecordNum;

            codeUpgradeRecord storage cur = codeUpgradeRegistry[RecordNum];
            cur._address = _addr;
            cur._sourceCodeUrl = _sourceCodeUrl;

        } else {
            // already exists!
            revert();
        }



        if(_action == getActionType("CODE_UPGRADE")) {

        }
        */
    }


    function runActionAfterAcceptance() internal {

        // delistChild
    }



    function acceptCodeUpgrade(uint256 recordId) internal {
        // reinitialize this each time, because we reply on "owner" as the address, and it could change
        Application = ApplicationEntityABI(owner);

        codeUpgradeRecord storage cur = codeUpgradeRegistry[recordId];
        Application.acceptCodeUpgradeProposal(cur._address);
    }


    function startProposalVoting(uint256 _proposalId) internal {

        ResultStruct storage result = ResultsByProposalId[_proposalId];

        if(getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {
            result.totalAvailable = FundingManagerEntity.LockedVotingTokens();

        } else if(getApplicationState() == getApplicationEntityState("DEVELOPMENT_COMPLETE") ) {
            // we also count owner tokens, as they're unlocked now.
            result.totalAvailable = TokenEntity.totalSupply();
        }
        result.requiredForResult = result.totalAvailable / 2;   // 50%
    }



    function finaliseProposal(uint256 _proposalId, bool result) internal {



    }

    /*

    Voting

    */

    struct VoteStruct {
        address voter;
        uint256 time;
        bool    vote;
        uint256 power;
        bool    annulled;
        uint256 index;
    }

    struct ResultStruct {
        uint256 totalAvailable;
        uint256 requiredForResult;
        uint256 totalSoFar;
        uint256 yes;
        uint256 no;
    }


    mapping (uint256 => mapping (uint256 => VoteStruct) ) public VotesByProposalId;
    mapping (uint256 => mapping (address => VoteStruct) ) public VotesByCaster;
    mapping (uint256 => uint256 ) public VotesNumByProposalId;
    mapping (uint256 => ResultStruct ) public ResultsByProposalId;

    function RegisterVote(uint256 _proposalId, bool _myVote) public {
        address Voter = msg.sender;

        // get voting power
        uint256 VoterPower = getMyVotingPower(_proposalId, Voter);

        if(VoterPower > 0) {



            // first check if this Voter has a record registered,
            // and if they did, annul initial vote, update results, and add new one

            VoteStruct storage previousVoteByCaster = VotesByCaster[_proposalId][Voter];
            if( previousVoteByCaster.power > 0 ) {
                previousVoteByCaster.annulled = true;

                VoteStruct storage previousVoteByProposalId = VotesByProposalId[_proposalId][previousVoteByCaster.index];
                previousVoteByProposalId.annulled = true;

                ResultStruct storage result = ResultsByProposalId[_proposalId];

                if(previousVoteByProposalId.vote == true) {
                    result.yes-= previousVoteByProposalId.power;
                } else if(previousVoteByProposalId.vote == false) {
                    result.no-= previousVoteByProposalId.power;
                }
            }

            // handle new vote
            uint256 currentVoteId = VotesNumByProposalId[_proposalId]++;
            VoteStruct storage vote = VotesByProposalId[_proposalId][currentVoteId];
                vote.voter = Voter;
                vote.time = getTimestamp();
                vote.vote = _myVote;
                vote.power = VoterPower;
                vote.index = currentVoteId;

            VotesByCaster[_proposalId][Voter] = VotesByProposalId[_proposalId][currentVoteId];

            ResultStruct storage newResult = ResultsByProposalId[_proposalId];
                newResult.totalSoFar+= VoterPower;

            if(_myVote == true) {
                newResult.yes+= VoterPower;
            } else if(_myVote == false) {
                newResult.no+= VoterPower;
            }

            // this is where we can end voting before time if totalSoFar > 50% of totalAvailable
            // endVoteBeforeTimeExpiry(_proposalId);

        } else {
            revert();
        }
    }


    function getMyVotingPower(uint256 _proposalId, address _voter) public view returns ( uint256 ) {

        uint256 VotingPower = 0;
        record storage proposal = registry[_proposalId];
        address VaultAddress = FundingManagerEntity.getMyVaultAddress(_voter);

        if(VaultAddress != address(0x0)) {

            uint256 myVotingPower = TokenEntity.balanceOf(VaultAddress);

            if(proposal.actionType == getActionType("PROJECT_DELISTING")) {

                // for project delisting, we want to also include tokens in the voter's wallet.

                myVotingPower+= TokenEntity.balanceOf(_voter);
            }
        }

        return VotingPower;
    }


    uint256 public VoteCountPerProcess = 256;
    mapping( uint256 => uint256 ) public lastProcessedVaultIdByProposal;

    function ProcessVoteTotals(uint256 _proposalId, uint256 length) public {

        uint256 start = lastProcessedVaultIdByProposal[_proposalId] + 1;
        uint256 end = start + length - 1;

        if(end > VotesNumByProposalId[_proposalId]) {
            end = VotesNumByProposalId[_proposalId];
        }

        for(uint256 i = start; i <= end; i++) {

            VoteStruct storage vote = VotesByProposalId[_proposalId][i];
            // process vote into totals.

            lastProcessedVaultIdByProposal[_proposalId]++;
        }

        // reset iterator so we can call it again.
        if(lastProcessedVaultIdByProposal[_proposalId] >= VotesNumByProposalId[_proposalId] ) {
            lastProcessedVaultIdByProposal[_proposalId] = 0;
        }
    }

    function endVoteBeforeTimeExpiry(uint256 _proposalId) internal {
        ResultStruct storage result = ResultsByProposalId[_proposalId];
        uint256 requiredVotesForResult = result.requiredForResult;
        if(result.yes >= result.requiredForResult) {
            // voting resulted in YES
            finaliseProposal(_proposalId, true);

        } else if (result.no >= result.requiredForResult) {
            // voting resulted in NO
            finaliseProposal(_proposalId, false);
        }
    }

    function CalculateVotingResult(uint256 _proposalId) internal {
        // we end up here due to time expiration.. we only take into account cast votes.

        ResultStruct storage result = ResultsByProposalId[_proposalId];

        if(result.yes > result.no ) {
            // voting resulted in YES
            finaliseProposal(_proposalId, true);
        } else if (result.yes < result.no) {
            // voting resulted in NO
            finaliseProposal(_proposalId, false);
        } else {
            // tie ? .. well we default to no then.
            finaliseProposal(_proposalId, false);
        }
    }

}