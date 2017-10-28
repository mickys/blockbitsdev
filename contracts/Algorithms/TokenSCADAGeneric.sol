/*

 * @name        Token Stake Calculation And Distribution Algorithm Generic Interface
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    this interface allows the funding asset to enforce the requirement of hard and soft caps on funding phases.
    as some token SCADA's require them, and some require them to not be present.
*/

pragma solidity 0.4.17;

import "./../Entity/Funding.sol";
import "./../Entity/Token.sol";

contract TokenSCADAGeneric {

    uint256 tokenSupply;
    Funding FundingEntity;
    Token TokenEntity;

    bool public SCADA_requires_hard_cap = true;

    function requiresHardCap() public view returns (bool) {
        return SCADA_requires_hard_cap;
    }

    function TokenSCADAGeneric(address _tokenContract, address _fundingContract ) public {
        TokenEntity = Token(_tokenContract);
        FundingEntity = Funding(_fundingContract);

        // these never change once initialized!
        tokenSupply = TokenEntity.totalSupply();
    }

}