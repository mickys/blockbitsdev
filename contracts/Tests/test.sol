pragma solidity ^0.4.17;

import "./../Inputs/FundingDirect.sol";
import "./../Inputs/FundingMilestone.sol";
import "./../Entity/PurchaseVaultFactory.sol";

contract test {

    event LogPaymentReceived(address sender, uint amount);

    PurchaseVaultFactory public VaultFactory;
    FundingDirect public direct;
    FundingMilestone public milestone;
    
    
    function test () public {
        // deploy Vault Factory
        VaultFactory = new PurchaseVaultFactory();
        
        // deploy test funding contracts
        direct = new FundingDirect(VaultFactory);
        milestone = new FundingMilestone(VaultFactory);
        
    }
    
    function () public payable {
        if(!direct.call.value(msg.value)()) {
            revert();
        }
    }
    
    function sendDirectFunding() public payable returns(bool){
        require(msg.value>0);
        if(!direct.call.value(msg.value)()) {
            revert();
        }
        LogPaymentReceived(msg.sender, msg.value);
    }

    function sendMilestoneFunding() public payable returns(bool){
        require(msg.value>0);
        if(!milestone.call.value(msg.value)()) {
            revert();
        }
        LogPaymentReceived(msg.sender, msg.value);
        return true;
    }

}
