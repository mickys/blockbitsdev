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


contract FundingManager is ApplicationAsset {

    Funding FundingEntity;

    event EventFundingManagerReceivedPayment(address indexed _vault, uint8 indexed _payment_method, uint256 indexed _amount );

    event EventFundingManagerProcessedVault(address indexed _vault, uint256 indexed id );

    mapping  (address => address) public vaultList;
    mapping  (uint256 => address) public vaultById;
    uint256 public vaultNum = 0;

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);
        EventRunBeforeApplyingSettings(assetName);
    }


    function receivePayment(address _sender, uint8 _payment_method)
        payable
        public
        requireInitialised
        onlyFundingAsset
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

            if( vault.addPayment.value(msg.value)( _payment_method ) ) {
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
    function getFundingEntityState() public returns(uint8) {
        return FundingEntity.CurrentEntityState();
    }
    */


    function doProcessVaultOne() public {
        address currentVault = vaultById[1];
        EventFundingManagerProcessedVault(currentVault, 1);
        FundingVault vault = FundingVault(currentVault);
        if(!vault.ReleaseFundsToOutputAddress()) {
            revert();
        }
    }

    uint256 public lastProcessedVaultId = 0;

    function FundingEndedProcessVaultList(uint8 length) public {
        require(FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("FUNDING_ENDED"));

        uint256 start = lastProcessedVaultId + 1;
        uint256 end = start + length - 1;

        if(end > vaultNum) {
            end = vaultNum;
        }

        for(uint256 i = start; i <= end; i++) {
            address currentVault = vaultById[i];

            EventFundingManagerProcessedVault(currentVault, i);
            FundingVault vault = FundingVault(currentVault);

            /*
            if(!vault.ReleaseFundsToOutputAddress()) {
                revert();
            }
            */

            lastProcessedVaultId++;
        }

        if(lastProcessedVaultId  == vaultNum + 1) {
            // we finished
            lastProcessedVaultId = 0;
            // reset and change state
            // change funding state to FINAL
        }

    }


    modifier onlyFundingAsset() {
        require( msg.sender == address(FundingEntity));
        _;
    }

}