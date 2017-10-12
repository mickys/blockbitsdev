/*

 * @name        Test Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/Entity/Funding.sol";
import "./TestApplicationAsset.sol";

contract TestFunding is Funding, TestApplicationAsset {
    uint _mockTime = now;

    function getTimestamp() view internal returns (uint256) {
        return _mockTime;
    }

    function mock_setTimestamp(uint256 i) external { _mockTime = i; }

    function insertPayment() public {
        AmountRaised+= 50 ether;
    }

    function moveTimestampBy7Days() public {
        timeNow+= 7 days;
    }

}
