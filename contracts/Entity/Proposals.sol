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

    ApplicationEntityABI public Application;
    ListingContract public ListingContractEntity;
    Funding public FundingEntity;
    FundingManager public FundingManagerEntity;
    TokenManager public TokenManagerEntity;
    Token public TokenEntity;
    Milestones public MilestonesEntity;

    function getRecordState(bytes32 name) public view returns (uint8) {
        return RecordStates[name];
    }

    function getActionType(bytes32 name) public view returns (uint8) {
        return ActionTypes[name];
    }

    function getProposalState(uint256 _proposalId) public view returns (uint8) {
        return ProposalsById[_proposalId].state;
    }

    mapping (bytes32 => uint8) public ActionTypes;

    function setActionTypes() internal {
        // owner initiated
        ActionTypes["MILESTONE_DEADLINE"] = 1;
        ActionTypes["MILESTONE_POSTPONING"] = 2;
        ActionTypes["EMERGENCY_FUND_RELEASE"] = 60;
        ActionTypes["IN_DEVELOPMENT_CODE_UPGRADE"] = 50;

        // shareholder initiated
        ActionTypes["AFTER_COMPLETE_CODE_UPGRADE"] = 51;
        ActionTypes["PROJECT_DELISTING"] = 75;
    }


    function setAssetStates() internal {

        setActionTypes();

        RecordStates["NEW"]                 = 1;
        RecordStates["ACCEPTING_VOTES"]     = 2;
        RecordStates["VOTING_ENDED"]        = 3;
        RecordStates["VOTING_RESULT_YES"]   = 10;
        RecordStates["VOTING_RESULT_NO"]    = 20;
    }

    event EventNewProposalCreated ( bytes32 indexed _hash, uint256 indexed _proposalId );

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

        address MilestonesContractAddress = getApplicationAssetAddressByName('Milestones');
        MilestonesEntity = Milestones(MilestonesContractAddress);
    }

    function getBylawsProposalVotingDuration() public view returns (uint256) {
        return getAppBylawUint256("proposal_voting_duration");
    }

    function getBylawsMilestoneMinPostponing() public view returns (uint256) {
        return getAppBylawUint256("min_postponing");
    }

    function getBylawsMilestoneMaxPostponing() public view returns (uint256) {
        return getAppBylawUint256("max_postponing");
    }

    function getHash(uint8 actionType, bytes32 arg1, bytes32 arg2) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1, arg2);
    }


    // need to implement a way to just iterate through active proposals, and remove the ones we already processed
    // otherwise someone with malicious intent could add a ton of proposals, just to make our contract cost a ton of gas.

    // to that end, we allow individual proposal processing. so that we don't get affected by people with too much
    // money and time on their hands.

    // whenever the system created a proposal, it will store the id, and process it when required.

    // not that much of an issue at this stage because:
    // NOW:
    // - only the system can create - MILESTONE_DEADLINE
    // - only the deployer can create - MILESTONE_POSTPONING / EMERGENCY_FUND_RELEASE / IN_DEVELOPMENT_CODE_UPGRADE

    // FUTURE:
    // - PROJECT_DELISTING is tied into an existing "listing id" which will be created by the system ( if requested by
    // someone, but at quite a significant cost )
    // - AFTER_COMPLETE_CODE_UPGRADE

    mapping (uint8 => uint256) public ActiveProposalIds;
    uint8 public ActiveProposalNum = 0;

    function process() public {
        for(uint8 i = 0; i < ActiveProposalNum; i++) {
            tryEndVoting( ActiveProposalIds[i] );
        }
    }

    function hasRequiredStateChanges() public view returns (bool) {
        for(uint8 i = 0; i < ActiveProposalNum; i++) {
            if( canEndVoting( ActiveProposalIds[i] ) ) {
                return true;
            }
        }
        return false;
    }

    function getRequiredStateChanges() public view returns (uint8) {
        if(hasRequiredStateChanges()) {
            return ActiveProposalNum;
        }
        return 0;
    }

    function addCodeUpgradeProposal(address _addr, bytes32 _sourceCodeUrl)
        external
        onlyApplicationEntity   // shareholder check is done directly in Gateway by calling applicationEntity to confirm
        returns (uint256)
    {

        // hash enforces only 1 possible voting of this type per record.
        // basically if a vote failed, you need to deploy it with changes to a new address. that simple.

        // depending on the application overall state, we have 2 different voting implementations.

        uint8 thisAction;

        if(getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {
            thisAction = getActionType("IN_DEVELOPMENT_CODE_UPGRADE");

        } else if(getApplicationState() == getApplicationEntityState("DEVELOPMENT_COMPLETE") ) {
            thisAction = getActionType("AFTER_COMPLETE_CODE_UPGRADE");
        }

        return createProposal(
            msg.sender,
            "CODE_UPGRADE",
            getHash( thisAction, bytes32(_addr), 0 ),
            thisAction,
            _addr,
            _sourceCodeUrl,
            0
        );
    }


    function createMilestoneAcceptanceProposal()
        external
        onlyAsset("Milestones")
        returns (uint256)
    {

        uint8 recordId = MilestonesEntity.currentRecord();
        return createProposal(
            msg.sender,
            "MILESTONE_DEADLINE",
            getHash( getActionType("MILESTONE_DEADLINE"), bytes32( recordId ), 0 ),
            getActionType("MILESTONE_DEADLINE"),
            0,
            0,
            uint256(recordId)
        );
    }

    function createMilestonePostponingProposal(uint256 _duration)
        external
        onlyDeployer
        returns (uint256)
    {
        if(_duration >= getBylawsMilestoneMinPostponing() && _duration <= getBylawsMilestoneMaxPostponing() ) {

            uint8 recordId = MilestonesEntity.currentRecord();
            return createProposal(
                msg.sender,
                "MILESTONE_POSTPONING",
                getHash( getActionType("MILESTONE_POSTPONING"), bytes32( recordId ), 0 ),
                getActionType("MILESTONE_POSTPONING"),
                0,
                0,
                _duration
            );
        } else {
            revert();
        }
    }

    function createEmergencyFundReleaseProposal()
        external
        onlyDeployer
        returns (uint256)
    {
        return createProposal(
            msg.sender,
            "EMERGENCY_FUND_RELEASE",
            getHash( getActionType("EMERGENCY_FUND_RELEASE"), 0, 0 ),
            getActionType("EMERGENCY_FUND_RELEASE"),
            0,
            0,
            0
        );
    }

    function createDelistingProposal(uint256 _projectId)
        external
        onlyTokenHolder
        returns (uint256)
    {
        // let's validate the project is actually listed first in order to remove any spamming ability.
        if( ListingContractEntity.getItemStatus(_projectId) == true) {
            return createProposal(
                msg.sender,
                "PROJECT_DELISTING",
                getHash( getActionType("PROJECT_DELISTING"), bytes32(_projectId), 0 ),
                getActionType("PROJECT_DELISTING"),
                0,
                0,
                _projectId
            );
        } else {
            revert();
        }
    }

    modifier onlyTokenHolder() {
        require( TokenEntity.balanceOf(msg.sender) > 0 );
        _;
    }

    struct ProposalRecord {
        address creator;
        bytes32 name;
        uint8 actionType;
        uint8 state;
        bytes32 hash;                       // action name + args hash
        address addr;
        bytes32 sourceCodeUrl;
        uint256 extra;
        uint256 time_start;
        uint256 time_end;
        uint256 index;
    }

    mapping (uint256 => ProposalRecord) public ProposalsById;
    mapping (bytes32 => uint256) public ProposalIdByHash;

    function createProposal(
        address _creator,
        bytes32 _name,
        bytes32 _hash,
        uint8   _action,
        address _addr,
        bytes32 _sourceCodeUrl,
        uint256 _extra
    )
        internal
        returns (uint256)
    {

        // if(_action > 0) {

        if(ProposalIdByHash[_hash] == 0) {

            ProposalRecord storage proposal = ProposalsById[++RecordNum];
            proposal.creator        = _creator;
            proposal.name           = _name;
            proposal.actionType     = _action;
            proposal.addr           = _addr;
            proposal.sourceCodeUrl  = _sourceCodeUrl;
            proposal.extra          = _extra;
            proposal.hash           = _hash;
            proposal.state          = getRecordState("NEW");
            proposal.time_start     = getTimestamp();
            proposal.time_end       = getTimestamp() + getBylawsProposalVotingDuration();
            proposal.index          = RecordNum;

            ProposalIdByHash[_hash] = RecordNum;

        } else {
            // already exists!
            revert();
        }

        initProposalVoting(RecordNum);
        EventNewProposalCreated ( _hash, RecordNum );
        return RecordNum;

        /*
        } else {
            // no action?!
            revert();
        }
        */
    }

    function acceptCodeUpgrade(uint256 _proposalId) internal {
        ProposalRecord storage proposal = ProposalsById[_proposalId];
        // reinitialize this each time, because we rely on "owner" as the address, and it will change
        Application = ApplicationEntityABI(owner);
        Application.acceptCodeUpgradeProposal(proposal.addr);
    }


    function initProposalVoting(uint256 _proposalId) internal {

        ResultRecord storage result = ResultsByProposalId[_proposalId];
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        if(getApplicationState() == getApplicationEntityState("IN_DEVELOPMENT") ) {

            if(proposal.actionType == getActionType("PROJECT_DELISTING") ) {
                // while in development project delisting can be voted by all available tokens, except owner
                uint256 ownerLockedTokens = TokenEntity.balanceOf(TokenManagerEntity);
                result.totalAvailable = TokenEntity.totalSupply() - ownerLockedTokens;

                // since we're counting unlocked tokens, we need to recount votes each time we want to end the voting period
                result.requiresCounting = true;

            } else {
                // any other proposal is only voted by "locked ether", thus we use locked tokens
                result.totalAvailable = FundingManagerEntity.LockedVotingTokens();

                // locked tokens do not require recounting.
                result.requiresCounting = false;
            }

        } else if(getApplicationState() == getApplicationEntityState("DEVELOPMENT_COMPLETE") ) {
            // we also count owner tokens, as they're unlocked now.
            result.totalAvailable = TokenEntity.totalSupply();

            // since we're counting unlocked tokens, we need to recount votes each time we want to end the voting period
            result.requiresCounting = true;
        }
        result.requiredForResult = result.totalAvailable / 2;   // 50%

        proposal.state = getRecordState("ACCEPTING_VOTES");
        addActiveProposal(_proposalId);
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

    struct ResultRecord {
        uint256 totalAvailable;
        uint256 requiredForResult;
        uint256 totalSoFar;
        uint256 yes;
        uint256 no;
        bool    requiresCounting;
    }


    mapping (uint256 => mapping (uint256 => VoteStruct) ) public VotesByProposalId;
    mapping (uint256 => mapping (address => VoteStruct) ) public VotesByCaster;
    mapping (uint256 => uint256 ) public VotesNumByProposalId;
    mapping (uint256 => ResultRecord ) public ResultsByProposalId;

    function RegisterVote(uint256 _proposalId, bool _myVote) public {
        address Voter = msg.sender;

        // get voting power
        uint256 VoterPower = getVotingPower(_proposalId, Voter);

        // get proposal for state
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        // make sure voting power is greater than 0
        // make sure proposal.state allows receiving votes
        // make sure proposal.time_end has not passed.

        if(VoterPower > 0 && proposal.state == getRecordState("ACCEPTING_VOTES")) {

            // first check if this Voter has a record registered,
            // and if they did, annul initial vote, update results, and add new one
            if( hasPreviousVote(_proposalId, Voter) ) {
                undoPreviousVote(_proposalId, Voter);
            }

            registerNewVote(_proposalId, Voter, _myVote, VoterPower);

            // this is where we can end voting before time if result.yes or result.no > totalSoFar
            tryEndVoting(_proposalId);

        } else {
            revert();
        }
    }

    function hasPreviousVote(uint256 _proposalId, address _voter) public view returns (bool) {
        VoteStruct storage previousVoteByCaster = VotesByCaster[_proposalId][_voter];
        if( previousVoteByCaster.power > 0 ) {
            return true;
        }
        return false;
    }

    function undoPreviousVote(uint256 _proposalId, address _voter) internal {

        VoteStruct storage previousVoteByCaster = VotesByCaster[_proposalId][_voter];

        // if( previousVoteByCaster.power > 0 ) {
            previousVoteByCaster.annulled = true;

            VoteStruct storage previousVoteByProposalId = VotesByProposalId[_proposalId][previousVoteByCaster.index];
            previousVoteByProposalId.annulled = true;

            ResultRecord storage result = ResultsByProposalId[_proposalId];

            // update total so far as well
            result.totalSoFar-= previousVoteByProposalId.power;

            if(previousVoteByProposalId.vote == true) {
                result.yes-= previousVoteByProposalId.power;
            // } else if(previousVoteByProposalId.vote == false) {
            } else {
                result.no-= previousVoteByProposalId.power;
            }
        // }

    }

    function registerNewVote(uint256 _proposalId, address _voter, bool _myVote, uint256 _power) internal {

        // handle new vote
        uint256 currentVoteId = VotesNumByProposalId[_proposalId]++;
        VoteStruct storage vote = VotesByProposalId[_proposalId][currentVoteId];
            vote.voter = _voter;
            vote.time = getTimestamp();
            vote.vote = _myVote;
            vote.power = _power;
            vote.index = currentVoteId;

        VotesByCaster[_proposalId][_voter] = VotesByProposalId[_proposalId][currentVoteId];

        addVoteIntoResult(_proposalId, _myVote, _power );
    }

    function addVoteIntoResult(uint256 _proposalId, bool _type, uint256 _power ) internal {
        ResultRecord storage newResult = ResultsByProposalId[_proposalId];
        newResult.totalSoFar+= _power;
        if(_type == true) {
            newResult.yes+= _power;
        } else {
            newResult.no+= _power;
        }
    }


    function getVotingPower(uint256 _proposalId, address _voter) public view returns ( uint256 ) {
        uint256 VotingPower = 0;
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        if(proposal.actionType == getActionType("AFTER_COMPLETE_CODE_UPGRADE")) {

            return TokenEntity.balanceOf(_voter);

        } else {

            address VaultAddress = FundingManagerEntity.getMyVaultAddress(_voter);
            if(VaultAddress != address(0x0)) {
                VotingPower = TokenEntity.balanceOf(VaultAddress);

                if( proposal.actionType == getActionType("PROJECT_DELISTING") ) {
                    // for project delisting, we want to also include tokens in the voter's wallet.
                    VotingPower+= TokenEntity.balanceOf(_voter);
                }
            }
        }
        return VotingPower;
    }


    uint256 public VoteCountPerProcess = 256;
    mapping( uint256 => uint256 ) public lastProcessedVoteIdByProposal;
    mapping( uint256 => uint256 ) public ProcessedVotesByProposal;

    mapping( uint256 => uint256 ) public VoteCountAtProcessingStartByProposal;

    function ProcessVoteTotals(uint256 _proposalId, uint256 length) public {


        uint256 start = lastProcessedVoteIdByProposal[_proposalId] + 1;
        uint256 end = start + length - 1;
        if(end > VotesNumByProposalId[_proposalId]) {
            end = VotesNumByProposalId[_proposalId];
        }
        
        // first run
        if(start == 1) {
            // save vote count at start, so we can reset if it changes
            VoteCountAtProcessingStartByProposal[_proposalId] = VotesNumByProposalId[_proposalId];

            // reset vote totals to 0
            ResultRecord storage result = ResultsByProposalId[_proposalId];
            result.yes = 0;
            result.no = 0;
            result.totalSoFar = 0;
        }

        // reset to start if vote count has changed in the middle of processing run
        if(VoteCountAtProcessingStartByProposal[_proposalId] != VotesNumByProposalId[_proposalId]) {
            // we received votes while counting
            // reset from start
            lastProcessedVoteIdByProposal[_proposalId] = 0;
            // exit
            return;
        }

        for(uint256 i = start; i <= end; i++) {

            VoteStruct storage vote = VotesByProposalId[_proposalId][i];
            // process vote into totals.
            if(vote.annulled != true) {
                addVoteIntoResult(_proposalId, vote.vote, vote.power );
            }

            lastProcessedVoteIdByProposal[_proposalId]++;
        }

        // reset iterator so we can call it again.
        if(lastProcessedVoteIdByProposal[_proposalId] >= VotesNumByProposalId[_proposalId] ) {

            ProcessedVotesByProposal[_proposalId] = lastProcessedVoteIdByProposal[_proposalId];
            lastProcessedVoteIdByProposal[_proposalId] = 0;
            tryEndVoting(_proposalId);
        }
    }

    function canEndVoting(uint256 _proposalId) public view returns (bool) {

        ResultRecord storage result = ResultsByProposalId[_proposalId];
        if(result.requiresCounting == false) {
            if(result.yes > result.requiredForResult || result.no > result.requiredForResult) {
                return true;
            }
        }
        else {

            if(ProcessedVotesByProposal[_proposalId] == VotesNumByProposalId[_proposalId]) {
                if(result.yes > result.requiredForResult || result.no > result.requiredForResult) {
                    return true;
                }
            }

        }
        return false;
    }

    function tryEndVoting(uint256 _proposalId) internal {
        if(canEndVoting(_proposalId)) {
            finaliseProposal(_proposalId);
        }
    }

    function finaliseProposal(uint256 _proposalId) internal {

        ResultRecord storage result = ResultsByProposalId[_proposalId];
        ProposalRecord storage proposal = ProposalsById[_proposalId];

        // read results,
        if(result.yes > result.requiredForResult) {
            // voting resulted in YES
            proposal.state = getRecordState("VOTING_RESULT_YES");
        } else if (result.no >= result.requiredForResult) {
            // voting resulted in NO
            proposal.state = getRecordState("VOTING_RESULT_NO");
        }

        runActionAfterResult(_proposalId);

    }

    function addActiveProposal(uint256 _proposalId) internal {
        ActiveProposalIds[++ActiveProposalNum]= _proposalId;
    }

    function removeAndReindexActive(uint256 _proposalId) internal {

        bool found = false;
        for (uint8 i = 0; i < ActiveProposalNum; i++) {
            if(ActiveProposalIds[i] == _proposalId) {
                found = true;
            }
            if(found) {
                ActiveProposalIds[i] = ActiveProposalIds[i+1];
            }
        }

        ActiveProposalNum--;
    }


    bool public EmergencyFundingReleaseApproved = false;

    function runActionAfterResult(uint256 _proposalId) internal {

        ProposalRecord storage proposal = ProposalsById[_proposalId];

        if(proposal.state == getRecordState("VOTING_RESULT_YES")) {

            if(proposal.actionType == getActionType("MILESTONE_DEADLINE")) {


            } else if (proposal.actionType == getActionType("MILESTONE_POSTPONING")) {

                // MilestonesEntity.updateMilestoneRecord();

            } else if (proposal.actionType == getActionType("EMERGENCY_FUND_RELEASE")) {
                EmergencyFundingReleaseApproved = true;

            } else if (proposal.actionType == getActionType("PROJECT_DELISTING")) {

                // ListingContractEntity.delistChild( proposal.extra );


            } else if (
                proposal.actionType == getActionType("IN_DEVELOPMENT_CODE_UPGRADE") ||
                proposal.actionType == getActionType("AFTER_COMPLETE_CODE_UPGRADE")
            ) {

                // initiate code upgrade
                acceptCodeUpgrade(_proposalId);
            }

            removeAndReindexActive(_proposalId);

        } else if(proposal.state == getRecordState("VOTING_RESULT_NO")) {

            //
            if(proposal.actionType == getActionType("MILESTONE_DEADLINE")) {

            } else {

                removeAndReindexActive(_proposalId);
            }
        }
    }

    // used by vault cash back
    function getMyVote(uint256 _proposalId, address _voter) public view returns (bool) {
        VoteStruct storage vote = VotesByCaster[_proposalId][_voter];
        return vote.vote;
    }

}