/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Funding Contract code deployed and linked to the Application Entity


    !!! Links directly to Milestones

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./FundingVault.sol";
import "./TokenManager.sol";
import "./Funding.sol";
import "./Token.sol";
import "./../Algorithms/TokenSCADA1Market.sol";

contract FundingManager is ApplicationAsset {

    Funding FundingEntity;
    TokenManager TokenManagerEntity;
    Token TokenEntity;
    TokenSCADAGeneric TokenSCADAEntity;

    uint256 LockedVotingTokens = 0;

    event EventFundingManagerReceivedPayment(address indexed _vault, uint8 indexed _payment_method, uint256 indexed _amount );
    event EventFundingManagerProcessedVault(address _vault, uint256 id );

    mapping  (address => address) public vaultList;
    mapping  (uint256 => address) public vaultById;
    uint256 public vaultNum = 0;

    function setAssetStates() internal {
        // Asset States
        EntityStates["__IGNORED__"]                 = 0;
        EntityStates["NEW"]                         = 1;
        EntityStates["WAITING"]                     = 2;

        EntityStates["FUNDING_FAILED_START"]        = 10;
        EntityStates["FUNDING_FAILED_PROGRESS"]     = 11;
        EntityStates["FUNDING_FAILED_DONE"]         = 12;

        EntityStates["FUNDING_SUCCESSFUL_START"]    = 20;
        EntityStates["FUNDING_SUCCESSFUL_PROGRESS"] = 21;
        EntityStates["FUNDING_SUCCESSFUL_DONE"]     = 22;

        EntityStates["MILESTONE_PROCESS_START"]     = 30;
        EntityStates["MILESTONE_PROCESS_PROGRESS"]  = 31;
        EntityStates["MILESTONE_PROCESS_DONE"]      = 32;

        EntityStates["COMPLETE_PROCESS_START"]     = 100;
        EntityStates["COMPLETE_PROCESS_PROGRESS"]  = 101;
        EntityStates["COMPLETE_PROCESS_DONE"]      = 102;

        // Funding Stage States
        RecordStates["__IGNORED__"]     = 0;

    }

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);
        EventRunBeforeApplyingSettings(assetName);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        TokenManagerEntity = TokenManager(TokenManagerAddress);
        TokenEntity = Token(TokenManagerEntity.TokenEntity());

        address TokenSCADAAddress = TokenManagerEntity.TokenSCADAEntity();
        TokenSCADAEntity = TokenSCADAGeneric(TokenSCADAAddress) ;
    }



    function receivePayment(address _sender, uint8 _payment_method, uint8 _funding_stage)
        payable
        public
        requireInitialised
        onlyAsset('Funding')
        returns(bool)
    {
        // check that msg.value is higher than 0, don't really want to have to deal with minus in case the network breaks this somehow
        if(msg.value > 0) {
            FundingVault vault;

            // no vault present
            if(!hasVault(_sender)) {
                // create and initialize a new one
                vault = new FundingVault();
                if(vault.initialize(
                    _sender,
                    FundingEntity.multiSigOutputAddress(),
                    address(FundingEntity),
                    address(getApplicationAssetAddressByName('Milestones'))
                )) {
                    // store new vault address.
                    vaultList[_sender] = vault;
                    // increase internal vault number
                    vaultNum++;
                    // assign vault to by int registry
                    vaultById[vaultNum] = vault;

                } else {
                    revert();
                }
            } else {
                // use existing vault
                vault = FundingVault(vaultList[_sender]);
            }

            EventFundingManagerReceivedPayment(vault, _payment_method, msg.value);

            if( vault.addPayment.value(msg.value)( _payment_method, _funding_stage ) ) {
                return true;
            } else {
                revert();
            }
        } else {
            revert();
        }
    }


    function getMyVaultAddress(address _sender) public view returns (address) {
        return vaultList[_sender];
    }

    function hasVault(address _sender) internal view returns(bool) {
        if(vaultList[_sender] != address(0x0)) {
            return true;
        } else {
            return false;
        }
    }

    /*
    function doProcessVaultOne() public {
        address currentVault = vaultById[1];
        EventFundingManagerProcessedVault(currentVault, 1);
        FundingVault vault = FundingVault(currentVault);
        if(!vault.ReleaseFundsToOutputAddress()) {
            revert();
        }
    }
    */

    bool public fundingProcessed = false;
    uint256 public lastProcessedVaultId = 0;
    uint8 public VaultCountPerProcess = 10;
    bytes32 public currentTask = "";

    mapping (bytes32 => bool) public taskByHash;

    /*
    function addTask(bytes32 actionType, bytes32 arg1) {
        bytes32 thisHash = getHash( actionType, arg1 );
        taskByHash[thisHash] = false;
    }

    function initTasks() {
        // add original tasks, excluding milestones for now
        currentTask = getHash("FUNDING_FAILED_START", "");
        getHash("FUNDING_SUCCESSFUL_START", "");
        getHash("MILESTONE_PROCESS_START", "");
        getHash("COMPLETE_PROCESS_START", "");
    }

    */

    function getHash(bytes32 actionType, bytes32 arg1) public pure returns ( bytes32 ) {
        return keccak256(actionType, arg1);
    }

    function ProcessVaultList(uint8 length) public {

        if(taskByHash[currentTask] == false) {
            if(
                CurrentEntityState == getEntityState("FUNDING_FAILED_PROGRESS") ||
                CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ||
                CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS") ||
                CurrentEntityState == getEntityState("COMPLETE_PROCESS_PROGRESS")
            ) {

                uint256 start = lastProcessedVaultId + 1;
                uint256 end = start + length - 1;

                if(end > vaultNum) {
                    end = vaultNum;
                }

                for(uint256 i = start; i <= end; i++) {
                    address currentVault = vaultById[i];
                    EventFundingManagerProcessedVault(currentVault, i);
                    ProcessFundingVault(currentVault);
                    lastProcessedVaultId++;
                }
                if(lastProcessedVaultId >= vaultNum ) {
                    // reset iterator and set task state to true so we can't call it again.
                    lastProcessedVaultId = 0;
                    taskByHash[currentTask] = true;
                }
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    function processFundingFailedFinished() public view returns (bool) {
        bytes32 thisHash = getHash("FUNDING_FAILED_START", "");
        return taskByHash[thisHash];
    }

    function processFundingSuccessfulFinished() public view returns (bool) {
        bytes32 thisHash = getHash("FUNDING_SUCCESSFUL_START", "");
        return taskByHash[thisHash];
    }

    function processCompleteFinished() public view returns (bool) {
        bytes32 thisHash = getHash("COMPLETE_PROCESS_START", "");
        return taskByHash[thisHash];
    }

    uint8 currentMilestoneId = 0;

    function getCurrentMilestoneId() internal view returns (bytes32) {
        return bytes32(currentMilestoneId);
    }

    function processMilestoneFinished() public view returns (bool) {
        bytes32 thisHash = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneId());
        return taskByHash[thisHash];
    }


    function ProcessFundingVault(address vaultAddress ) internal {
        FundingVault vault = FundingVault(vaultAddress);

        if(CurrentEntityState == getEntityState("FUNDING_FAILED_PROGRESS")) {

            /*
            // release tokens back to owner
            if(!vault.ReleaseFundsToOutputAddress()) {
                revert();
            }
            */

        } else if(CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS")) {

            // step 1 -  transfer bought token share from "manager" to "vault"
            TokenEntity.transfer( vaultAddress, vault.getBoughtTokens() );
            // vault should now hold as many tokens as the investor bought using direct and milestone funding,
            // as well as the ether they sent

            // step 2
            // - ask vault to transfer "direct funding" tokens to investor
            // - ask vault to release the direct funding eth to platform

            /*
            // release funds to owner / tokens to investor
            if(!vault.ReleaseFundsToOutputAddress()) {
                revert();
            }
            */


        } else if(CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS")) {
            /*
            // release funds to owner / tokens to investor
            if(!vault.ReleaseFundsToOutputAddress()) {
                revert();
            }
            */
        } else if(CurrentEntityState == getEntityState("COMPLETE_PROCESS_PROGRESS")) {
            /*
                not much to do here, except get vault to transfer black hole tokens to investors, or output address
            */
        }

        // For proposal voting, we need to know how many investor locked tokens remain.
        LockedVotingTokens+= TokenEntity.balanceOf(vaultAddress);

    }

    function doStateChanges() public {

        var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
        bool callAgain = false;

        DebugEntityRequiredChanges( assetName, returnedCurrentEntityState, EntityStateRequired );

        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            EntityProcessor(EntityStateRequired);
            callAgain = true;
        }

        /*
        if(recursive && callAgain) {
            if(hasRequiredStateChanges()) {
                doStateChanges(recursive);
            }
        }
        */
    }

    function hasRequiredStateChanges() public view returns (bool) {
        bool hasChanges = false;
        var (returnedCurrentEntityState, EntityStateRequired) = getRequiredStateChanges();
        // suppress unused local variable warning
        returnedCurrentEntityState = 0;
        if(EntityStateRequired != getEntityState("__IGNORED__") ) {
            hasChanges = true;
        }
        return hasChanges;
    }

    function EntityProcessor(uint8 EntityStateRequired) internal {

        EventEntityProcessor( assetName, CurrentEntityState, EntityStateRequired );

        // Update our Entity State
        CurrentEntityState = EntityStateRequired;
        // Do State Specific Updates

// Funding Failed
        if ( EntityStateRequired == getEntityState("FUNDING_FAILED_START") ) {
            // set ProcessVaultList Task
            currentTask = getHash("FUNDING_FAILED_START", "");
            CurrentEntityState = getEntityState("FUNDING_FAILED_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("FUNDING_FAILED_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

// Funding Successful
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_START") ) {

            // init SCADA variable cache.
            if(TokenSCADAEntity.initCacheForVariables()) {
                // start processing vaults
                currentTask = getHash("FUNDING_SUCCESSFUL_START", "");
                CurrentEntityState = getEntityState("FUNDING_SUCCESSFUL_PROGRESS");
            } else {
                // something went really wrong, just bail out for now
                CurrentEntityState = getEntityState("FUNDING_FAILED_START");
            }
        } else if ( EntityStateRequired == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);
// Milestones
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_START") ) {
            currentTask = getHash("MILESTONE_PROCESS_START", getCurrentMilestoneId() );
            CurrentEntityState = getEntityState("MILESTONE_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);

// Completion
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_START") ) {
            currentTask = getHash("COMPLETE_PROCESS_START", "");
            CurrentEntityState = getEntityState("COMPLETE_PROCESS_PROGRESS");
        } else if ( EntityStateRequired == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
            ProcessVaultList(VaultCountPerProcess);
        }

    }

    /*
     * Method: Get Entity Required State Changes
     *
     * @access       public
     * @type         method
     *
     * @return       ( uint8 CurrentEntityState, uint8 EntityStateRequired )
     */
    function getRequiredStateChanges() public view returns (uint8, uint8) {

        uint8 EntityStateRequired = getEntityState("__IGNORED__");

        if(ApplicationInFundingOrDevelopment()) {

            if ( CurrentEntityState == getEntityState("WAITING") ) {
                /*
                    This is where we decide if we should process something
                */

                // For funding
                if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FAILED")) {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_START");
                }
                else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL")) {
                    // make sure we haven't processed this yet
                    if(taskByHash[ getHash("FUNDING_SUCCESSFUL_START", "") ] == false) {
                        EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_START");
                    }
                }
                else if(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL")) {

                    // We can only process milestones, if Funding is successful, and has been processed.

                    // for milestones
                    // if we have a milestone that meets requirements, then we need to process it.
                    // EntityStateRequired = getEntityState("MILESTONE_PROCESS_START");

                    // else, check if all milestones have been processed and try finalising development process
                    // EntityStateRequired = getEntityState("COMPLETE_PROCESS_START");
                }

            } else if ( CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_PROGRESS") ) {
                // still in progress? check if we should move to done
                if ( processFundingSuccessfulFinished() ) {
                    EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_DONE");
                } else {
                    EntityStateRequired = getEntityState("FUNDING_SUCCESSFUL_PROGRESS");
                }

            } else if ( CurrentEntityState == getEntityState("FUNDING_SUCCESSFUL_DONE") ) {
                EntityStateRequired = getEntityState("WAITING");

    // Funding Failed
            } else if ( CurrentEntityState == getEntityState("FUNDING_FAILED_PROGRESS") ) {
                // still in progress? check if we should move to done
                if ( processFundingFailedFinished() ) {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_DONE");
                } else {
                    EntityStateRequired = getEntityState("FUNDING_FAILED_PROGRESS");
                }

    // Milestone process
            } else if ( CurrentEntityState == getEntityState("MILESTONE_PROCESS_PROGRESS") ) {
                // still in progress? check if we should move to done

                /*
                if ( processMilestoneFinished() ) {
                    EntityStateRequired = getEntityState("MILESTONE_PROCESS_DONE");
                } else {
                    EntityStateRequired = getEntityState("MILESTONE_PROCESS_PROGRESS");
                }
                */

    // Completion
            } else if ( CurrentEntityState == getEntityState("COMPLETE_PROCESS_PROGRESS") ) {
                // still in progress? check if we should move to done
                if ( processCompleteFinished() ) {
                    EntityStateRequired = getEntityState("COMPLETE_PROCESS_DONE");
                } else {
                    EntityStateRequired = getEntityState("COMPLETE_PROCESS_PROGRESS");
                }
            }
        } else {

            if( CurrentEntityState == getEntityState("NEW") ) {
                // general so we know we initialized
                EntityStateRequired = getEntityState("WAITING");
            }
        }

        return (CurrentEntityState, EntityStateRequired);
    }

    function ApplicationInFundingOrDevelopment() public view returns(bool) {
        uint8 AppState = getApplicationState();
        if(
            AppState == getApplicationEntityState("IN_FUNDING") ||
            AppState == getApplicationEntityState("IN_DEVELOPMENT")
        ) {
            return true;
        }
        return false;
    }
}
