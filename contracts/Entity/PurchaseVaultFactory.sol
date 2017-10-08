/*

 * @name        CustomerPurchaseVault Factory Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./../Entity/PurchaseVaultDirect.sol";
import "./../Entity/PurchaseVaultMilestone.sol";

contract PurchaseVaultFactory is ApplicationAsset {

    enum FundingTypes {
        DIRECT,
        MILESTONE
    }

    struct Vault {
        address _address;
        address _owner;
        uint8 _type;
    }

    mapping (uint256 => Vault) public vaultMap;
    uint256 public vaultNum = 0;


    mapping (address => address[]) public ownerToVaultsMap;

    event CreateVault(address owner, uint8 _type);

    function CreateDirectVault(address _owner) public returns (address) {

        // create the new vault
        PurchaseVaultDirect DirectVault = new PurchaseVaultDirect();

        // always first change the state, then call anything else!
        if(!addVault(DirectVault, _owner, uint8(FundingTypes.DIRECT))) {
            revert();
        }

        // initialize default values
        if(!DirectVault.InitializeVault()) {
            revert();
        }

        CreateVault(_owner, 1);

        // return address
        return DirectVault;
    } 

    function CreateMilestoneVault(address _owner) public returns (address) {

        // create the new vault
        PurchaseVaultMilestone MilestoneVault = new PurchaseVaultMilestone();

        // always first change the state, then call anything else!
        if(!addVault(MilestoneVault, _owner, uint8(FundingTypes.MILESTONE))) {
            revert();
        }
        
        // initialize default values
        
        if(!MilestoneVault.InitializeVault()) {
            revert();
        }

        CreateVault(_owner, 2);

        // return address
        return MilestoneVault;
    }
    

    
    function addVault(address _addr, address _owner, uint8 _type) internal returns (bool) {

        Vault storage v = vaultMap[++vaultNum];
        v._address  = _addr;
        v._owner    = _owner;
        v._type     = _type;
        
        /*
        
        address[] storage ownedVaults = ownerToVaultsMap[_owner];
        for(uint8 i = 0; i < ownedVaults.length; i++) {
            
        }
        */
        
        return true;
    }

    function getDirectTypeId() public pure returns (uint8) {
        return uint8(FundingTypes.DIRECT);
    }

    function getMilestoneTypeId() public pure returns (uint8) {
        return uint8(FundingTypes.MILESTONE);
    }
}