/*

 * @name        Test Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/Entity/Funding.sol";
import "./TestApplicationAsset.sol";

contract TestFunding is Funding, TestApplicationAsset {
    uint256 _mockTime = now;

    function getTimestamp() view public returns (uint256) {
        if(_mockTime > 0) {
            return _mockTime;
        } else {
            return now;
        }
    }

    function setTestTimestamp(uint256 i) external { _mockTime = i; }

    function insertPayment(uint256 amount) public {
        AmountRaised+= amount;
    }

    function moveTimestampBy7Days() public {
        _mockTime+= 7 days;
    }


    function setTestCurrentEntityState(uint8 _state) public {
        CurrentEntityState = _state;
    }

    function setTestCurrentFundingStageState(uint8 _state) public {
        FundingStage storage record = Collection[currentFundingStage];
        record.state = _state;
    }

    function setTestFundingInputDirect(address _addr) public {
        DirectInput = FundingInputDirect(_addr);
    }

}
