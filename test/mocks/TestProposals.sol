/*

 * @name        Test Proposals Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/Entity/Proposals.sol";
import "./TestApplicationAsset.sol";

contract TestProposals is Proposals, TestApplicationAsset {

    function tAcceptCodeUpgrade(uint256 recordId) external {
        acceptCodeUpgrade(recordId);
    }
}
