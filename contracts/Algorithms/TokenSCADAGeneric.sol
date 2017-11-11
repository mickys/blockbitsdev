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

    function getTokensForEther(uint8 _fundingStage, uint256 _ether_amount) public view returns (uint256) {
        /*
        if(_fundingStage == 1) {
            uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(_fundingStage);
            uint256 raisedAmount = FundingEntity.getStageAmountRaised(_fundingStage);
            return getTokenFraction( percentInStage, raisedAmount, _ether_amount );
        } else {
            // return secondStage(percentInStage, raisedAmount, _ether_amount );
            return 69;
        }
        */
        return 55;
    }

    /*
    function secondStage(uint8 _percentInStage, uint256 _raisedAmount, uint256 _my_ether_amount) public view returns(uint256) {

        var (percentInStage, priceAdd, raisedAmount) = FundingEntity.getFundingStageVariablesRequiredBySCADA( 1 );


        uint256 parityPRE = getTokenParity(1);
        uint256 parityICO = getTokenParity(2);
        uint256 parity = 0;
        uint256 unsoldTokens = 0;

        if(parityPRE < parityICO) {
            // case 1, we receive a lot in pre, we need to sell ico tokens at partiy + added price,
            // and redistribute the ones left
            parity = parityPRE;
            uint256 tokensInStage = tokenSupply * _percentInStage / 100;
            uint256 tokensSold = raisedAmount * parity;
            unsoldTokens = tokensInStage - tokensSold;

        } else {
            // case 2, pre ico sold some tokens but did not reach 10% parity fraction of total,
            // this means pre ico 1 distribution is OK and has a pretty large discount
            // also that ICO sold all remaining tokens allocated to it... this means we should have 0 unsold tokens
            // parity = parityICO;
            unsoldTokens = 67;
        }

        // uint256 myTokensInPRE = _ether_amount * parityPRE;
        // calculate token fraction based on current owned balance.
        // uint256 myTokensInICO = 99; // unsoldTokens;
        // myTokensInStage = _ether_amount * parity;
        // return myTokensInPRE + myTokensInICO;
        return 69;
    }
    */

    /*

    function getTokenFraction(uint8 _percentInStage, uint256 _raisedAmount, uint256 _my_ether_amount )
        public view returns(uint256)
    {
        return ((tokenSupply * _percentInStage / 100) * _my_ether_amount) / _raisedAmount;
    }
    */


    /*

    function getTokenParity(uint8 stageId) public view returns (uint256) {

        uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(stageId);
        uint8 priceAdd = FundingEntity.getStagePriceAdd(stageId);
        uint256 raisedAmount = FundingEntity.getStageAmountRaised(stageId);

        uint256 tokensInStage = tokenSupply * percentInStage / 100;
        uint256 parity = tokensInStage / raisedAmount;
        if(priceAdd > 0) {
            parity = parity - ( parity * priceAdd / 100 );
        }
        return parity;
    }
    */



}