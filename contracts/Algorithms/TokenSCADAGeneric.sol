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

    function TokenSCADAGeneric(address _tokenContract, address _fundingContract ) public {
        TokenEntity = Token(_tokenContract);
        FundingEntity = Funding(_fundingContract);

        // these never change once initialized!
        tokenSupply = TokenEntity.totalSupply();
    }

    function requiresHardCap() public view returns (bool) {
        return SCADA_requires_hard_cap;
    }

    // since division on integers is not a possibility
    // we work with fractions
    function getTokenAmountByEtherForFundingStage(uint8 _fundingStage, uint256 _ether_amount) public view returns (uint256) {
        var (percentInStage, raisedAmount) = FundingEntity.getFundingStageVariablesRequiredBySCADA(_fundingStage);

        // make sure raisedAmount is higher than 0
        if(raisedAmount > 0) {
            uint256 tokensInStage = tokenSupply * percentInStage / 100;
            uint256 myTokens = (tokensInStage * _ether_amount) / raisedAmount;
            return myTokens;
        } else {
            return 0;
        }
    }
}