/*

 * @name        Funding Vault
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    each purchase creates a separate funding vault contract
*/

// add Token / Ether Black Hole prevention

pragma solidity ^0.4.17;

import "./Token.sol";
import "./Funding.sol";
import "./Milestones.sol";
import "./TokenManager.sol";
import "./../Algorithms/TokenSCADAGeneric.sol";
import "./../ApplicationEntityABI.sol";

library FundingVaultLib {


    struct PurchaseStruct {
        uint256 unix_time;
        uint8 payment_method;
        uint256 amount;
        uint8 funding_stage;
        uint16 index;
    }

    struct VaultStorage {

        address vaultOwner ;
        address outputAddress;
        address managerAddress;

        bool _initialized;
        bool allFundingProcessed;
        bool DirectFundingProcessed;

        uint256 amount_direct;
        uint256 amount_milestone;

        bool emergencyFundReleased;

        uint8 emergencyFundPercentage;
        uint256 BylawsCashBackOwnerMiaDuration;
        uint256 BylawsCashBackVoteRejectedDuration;
        uint256 BylawsProposalVotingDuration;


        mapping(uint16 => PurchaseStruct) purchaseRecords;
        uint16 purchaseRecordsNum;



        // ApplicationEntityABI ApplicationEntity;
        Funding FundingEntity;
        FundingManager FundingManagerEntity;
        Milestones MilestonesEntity;
        Proposals ProposalsEntity;
        // TokenManager TokenManagerEntity;

        // TokenSCADAGeneric TokenSCADAEntity;
        address TokenSCADAAddress;
        Token TokenEntity ;

        mapping (uint8 => uint256) etherBalances;
        mapping (uint8 => uint256) tokenBalances;
        uint8 BalanceNum;
        bool BalancesInitialised;

        mapping (uint8 => uint256) stageAmounts;
        mapping (uint8 => uint256) stageAmountsDirect;
    }


    event EventPaymentReceived(uint8 indexed _payment_method, uint256 indexed _amount, uint16 indexed _index );
    event VaultInitialized(address indexed _owner);


    function getPurchaseRecords_unix_time(VaultStorage storage self, uint16 record ) public view returns (uint256) {
        return self.purchaseRecords[record].unix_time;
    }

    function getPurchaseRecords_payment_method(VaultStorage storage self, uint16 record ) public view returns (uint8) {
        return self.purchaseRecords[record].payment_method;
    }

    function getPurchaseRecords_amount(VaultStorage storage self, uint16 record ) public view returns (uint256) {
        return self.purchaseRecords[record].amount;
    }

    function getPurchaseRecords_funding_stage(VaultStorage storage self, uint16 record ) public view returns (uint8) {
        return self.purchaseRecords[record].funding_stage;
    }

    function getPurchaseRecords_index(VaultStorage storage self, uint16 record ) public view returns (uint16) {
        return self.purchaseRecords[record].index;
    }



    function initialize(
        VaultStorage storage self,
        address _owner,
        address _output,
        address _fundingAddress,
        address _milestoneAddress,
        address _proposalsAddress
    )
        public
//        requireNotInitialised
        returns(bool)
    {

        self.outputAddress = _output;
        self.vaultOwner = _owner;

        // whomever creates this contract is the manager.
        self.managerAddress = msg.sender;

        // assets
        self.FundingEntity = Funding(_fundingAddress);
        self.FundingManagerEntity = FundingManager( self.managerAddress );
        self.MilestonesEntity = Milestones(_milestoneAddress);
        self.ProposalsEntity = Proposals(_proposalsAddress);

        address TokenManagerAddress = self.FundingEntity.getApplicationAssetAddressByName("TokenManager");
        TokenManager TokenManagerEntity = TokenManager(TokenManagerAddress);

        address TokenAddress = TokenManagerEntity.TokenEntity();
        self.TokenEntity = Token(TokenAddress);

        // address TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();
        // self.TokenSCADAEntity = TokenSCADAGeneric(TokenSCADAAddress);
        self.TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();

        // set Emergency Fund Percentage if available.
        address ApplicationEntityAddress = TokenManagerEntity.owner();
        ApplicationEntityABI ApplicationEntity = ApplicationEntityABI(ApplicationEntityAddress);

        // get Application Bylaws
        self.emergencyFundPercentage             = uint8( ApplicationEntity.getBylawUint256("emergency_fund_percentage") );
        self.BylawsCashBackOwnerMiaDuration      = ApplicationEntity.getBylawUint256("cashback_owner_mia_dur") ;
        self.BylawsCashBackVoteRejectedDuration  = ApplicationEntity.getBylawUint256("cashback_investor_no") ;
        self.BylawsProposalVotingDuration        = ApplicationEntity.getBylawUint256("proposal_voting_duration") ;

        // init
        self._initialized = true;
        VaultInitialized(_owner);
        return true;
    }



    /*
        The funding contract decides if a vault should receive payments or not, since it's the one that creates them,
        no point in creating one if you can't accept payments.
    */



    function addPayment(
        VaultStorage storage self,
        uint8 _payment_method,
        uint8 _funding_stage
    )
        public
//        payable
//        requireInitialised
//        onlyManager
        returns (bool)
    {
        if(msg.value > 0 && self.FundingEntity.allowedPaymentMethod(_payment_method)) {

            // store payment
            PurchaseStruct storage purchase = self.purchaseRecords[++self.purchaseRecordsNum];
                purchase.unix_time = now;
                purchase.payment_method = _payment_method;
                purchase.amount = msg.value;
                purchase.funding_stage = _funding_stage;
                purchase.index = self.purchaseRecordsNum;

            // assign payment to direct or milestone
            if(_payment_method == 1) {
                self.amount_direct+= purchase.amount;
                self.stageAmountsDirect[_funding_stage]+=purchase.amount;
            }

            if(_payment_method == 2) {
                self.amount_milestone+= purchase.amount;
            }

            // in order to not iterate through purchase records, we just increase funding stage amount.
            // issue with iterating over them, while processing vaults, would be that someone could create a large
            // number of payments, which would result in an "out of gas" / stack overflow issue, that would lock
            // our contract, so we don't really want to do that.
            // doing it this way also saves some gas
            self.stageAmounts[_funding_stage]+=purchase.amount;

            EventPaymentReceived( purchase.payment_method, purchase.amount, purchase.index );
            return true;
        } else {
            revert();
        }
    }


    function getBoughtTokens(VaultStorage storage self) public view returns (uint256) {
        return TokenSCADAGeneric(self.TokenSCADAAddress).getBoughtTokens( address(this), false );
    }

    function getDirectBoughtTokens(VaultStorage storage self) public view returns (uint256) {
        return TokenSCADAGeneric(self.TokenSCADAAddress).getBoughtTokens( address(this), true );
    }

    function initMilestoneTokenAndEtherBalances(VaultStorage storage self) internal
    {
        if(self.BalancesInitialised == false) {

            uint256 milestoneTokenBalance = self.TokenEntity.balanceOf(address(this));
            uint256 milestoneEtherBalance = this.balance;

            // no need to worry about fractions because at the last milestone, we send everything that's left.

            // emergency fund takes it's percentage from initial balances.
            if(self.emergencyFundPercentage > 0) {
                self.tokenBalances[0] = milestoneTokenBalance / 100 * self.emergencyFundPercentage;
                self.etherBalances[0] = milestoneEtherBalance / 100 * self.emergencyFundPercentage;

                milestoneTokenBalance-=self.tokenBalances[0];
                milestoneEtherBalance-=self.etherBalances[0];
            }

            // milestones percentages are then taken from what's left.
            for(uint8 i = 1; i <= self.MilestonesEntity.RecordNum(); i++) {

                uint8 perc = self.MilestonesEntity.getMilestoneFundingPercentage(i);
                self.tokenBalances[i] = milestoneTokenBalance / 100 * perc;
                self.etherBalances[i] = milestoneEtherBalance / 100 * perc;
            }

            self.BalanceNum = i;
            self.BalancesInitialised = true;
        }
    }

    function ReleaseFundsAndTokens(VaultStorage storage self)
        public
//        requireInitialised
//        onlyManager
        returns (bool)
    {
        // first make sure cashback is not possible, and that we've not processed everything in this vault
        if(!canCashBack(self) && self.allFundingProcessed == false) {

            if(self.FundingManagerEntity.CurrentEntityState() == self.FundingManagerEntity.getEntityState("FUNDING_SUCCESSFUL_PROGRESS")) {

                // case 1, direct funding only
                if(self.amount_direct > 0 && self.amount_milestone == 0) {

                    // if we have direct funding and no milestone balance, transfer everything and lock vault
                    // to save gas in future processing runs.

                    // transfer tokens to the investor
                    self.TokenEntity.transfer(self.vaultOwner, self.TokenEntity.balanceOf(address(this)) );

                    // transfer ether to the owner's wallet
                    self.outputAddress.transfer(this.balance);

                    // lock vault.. and enable black hole methods
                    self.allFundingProcessed = true;

                } else {
                // case 2 and 3, direct funding only

                    if(self.amount_direct > 0 && self.DirectFundingProcessed == false ) {
                        self.TokenEntity.transfer(self.vaultOwner, getDirectBoughtTokens(self) );
                        // transfer "direct funding" ether to the owner's wallet
                        self.outputAddress.transfer(self.amount_direct);
                        self.DirectFundingProcessed = true;
                    }

                    // process and initialize milestone balances, emergency fund, etc, once
                    initMilestoneTokenAndEtherBalances(self);
                }
                return true;

            } else if(self.FundingManagerEntity.CurrentEntityState() == self.FundingManagerEntity.getEntityState("MILESTONE_PROCESS_PROGRESS")) {

                // get current milestone so we know which one we need to release funds for.
                uint8 milestoneId = self.MilestonesEntity.currentRecord();

                uint256 transferTokens = self.tokenBalances[milestoneId];
                uint256 transferEther = self.etherBalances[milestoneId];

                if(milestoneId == self.BalanceNum - 1) {
                    // we're processing the last milestone and balance, this means we're transferring everything left.
                    // this is done to make sure we've transferred everything, even "ether that got mistakenly sent to this address"
                    // as well as the emergency fund if it has not been used.
                    transferTokens = self.TokenEntity.balanceOf(address(this));
                    transferEther = this.balance;
                }

                // set balances to 0 so we can't transfer multiple times.
                // tokenBalances[milestoneId] = 0;
                // etherBalances[milestoneId] = 0;

                // transfer tokens to the investor
                self.TokenEntity.transfer(self.vaultOwner, transferTokens );

                // transfer ether to the owner's wallet
                self.outputAddress.transfer(transferEther);

                if(milestoneId == self.BalanceNum - 1) {
                    // lock vault.. and enable black hole methods
                    self.allFundingProcessed = true;
                }

                return true;
            }
        }

        return false;
    }


    function releaseTokensAndEtherForEmergencyFund(VaultStorage storage self)
        public
//        requireInitialised
//        onlyManager
        returns (bool)
    {
        if( self.emergencyFundReleased == false && self.emergencyFundPercentage > 0) {

            // transfer tokens to the investor
            self.TokenEntity.transfer(self.vaultOwner, self.tokenBalances[0] );

            // transfer ether to the owner's wallet
            self.outputAddress.transfer(self.etherBalances[0]);

            self.emergencyFundReleased = true;
            return true;
        }
        return false;
    }

    function ReleaseFundsToInvestor(VaultStorage storage self)
        public
//        requireInitialised
//        isOwner
    {
        if(canCashBack(self)) {

            // IF we're doing a cashback
            // transfer vault tokens back to owner address
            // send all ether to wallet owner

            // get token balance
            uint256 myBalance = self.TokenEntity.balanceOf(address(this));
            // transfer all vault tokens to owner
            if(myBalance > 0) {
                self.TokenEntity.transfer(self.outputAddress, myBalance );
            }

            // now transfer all remaining ether back to investor address
            self.vaultOwner.transfer(this.balance);

            // update FundingManager Locked Token Amount, so we don't break voting
            self.FundingManagerEntity.VaultRequestedUpdateForLockedVotingTokens( self.vaultOwner );

            // disallow further processing, so we don't break Funding Manager.
            // this method can still be called to collect future black hole ether to this vault.
            self.allFundingProcessed = true;
        }
    }

    /*
        1 - if the funding of the project Failed, allows investors to claim their locked ether back.
        2 - if the Investor votes NO to a Development Milestone Completion Proposal, where the majority
            also votes NO allows investors to claim their locked ether back.
        3 - project owner misses to set the time for a Development Milestone Completion Meeting allows investors
        to claim their locked ether back.
    */
    function canCashBack(VaultStorage storage self)
        public
        view
    //    requireInitialised
        returns (bool)
    {

        // case 1
        if(checkFundingStateFailed(self)) {
            return true;
        }
        // case 2
        if(checkMilestoneStateInvestorVotedNoVotingEndedNo(self)) {
            return true;
        }
        // case 3
        if(checkOwnerFailedToSetTimeOnMeeting(self)) {
            return true;
        }

        return false;
    }

    function checkFundingStateFailed(VaultStorage storage self) public view returns (bool) {
        if(self.FundingEntity.CurrentEntityState() == self.FundingEntity.getEntityState("FAILED_FINAL") ) {
            return true;
        }
        return false;
    }

    function checkMilestoneStateInvestorVotedNoVotingEndedNo(VaultStorage storage self) public view returns (bool) {
        if(self.MilestonesEntity.CurrentEntityState() == self.MilestonesEntity.getEntityState("VOTING_ENDED_NO") ) {
            // first we need to make sure we actually voted.
            if( self.ProposalsEntity.getHasVoteForCurrentMilestoneRelease( self.vaultOwner ) == true) {
                // now make sure we voted NO, and if so return true
                if( self.ProposalsEntity.getMyVoteForCurrentMilestoneRelease( self.vaultOwner ) == false) {
                    return true;
                }
            }
        }
        return false;
    }

    function checkOwnerFailedToSetTimeOnMeeting(VaultStorage storage self) public view returns (bool) {
        // Looks like the project owner is missing in action
        // they only have to do 1 thing, which is set the meeting time 7 days before the end of the milestone so that
        // investors know when they need to show up for a progress report meeting

        // as they did not, we consider them missing in action and allow investors to retrieve their locked ether back
        if( self.MilestonesEntity.CurrentEntityState() == self.MilestonesEntity.getEntityState("DEADLINE_MEETING_TIME_FAILED") ) {
            return true;
        }
        return false;
    }

    /*
    modifier isOwner() {
        require(msg.sender == vaultOwner);
        _;
    }

    modifier onlyManager() {
        require(msg.sender == managerAddress);
        _;
    }

    modifier requireInitialised() {
        require(_initialized == true);
        _;
    }

    modifier requireNotInitialised() {
        require(_initialized == false);
        _;
    }
    */
}