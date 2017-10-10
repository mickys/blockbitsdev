pragma solidity ^0.4.17;

import "../../contracts/Entity/Proposals.sol";

contract ProposalsMock is Proposals {

    function testAcceptCodeUpgrade(uint256 recordId) internal {
        acceptCodeUpgrade(recordId);
    }
}
