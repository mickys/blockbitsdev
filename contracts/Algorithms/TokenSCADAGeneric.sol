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
import "./../Entity/FundingVault.sol";

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

    function getBoughtTokens( address _vaultAddress ) public view returns (uint256) {

        // first stage
        uint256 myPRETokens = getMyTokensInFirstStage( _vaultAddress );

        // second stage
        uint256 myIcoTokens = getMyTokensInSecondStage( _vaultAddress );

        // distribute unsold
        uint256 myUnsoldTokenShare = getUnsoldTokenFraction(
            getUnsoldTokenAmount(), (myPRETokens + myIcoTokens)
        );
//        return myPRETokens + myIcoTokens + myUnsoldTokenShare;
        return myPRETokens + myIcoTokens + myUnsoldTokenShare;
    }

    /*
    function getTokensForEther(uint8 _fundingStage, uint256 _ether_amount) public view returns (uint256) {


        if(_fundingStage == 1) {
            percentInStage = FundingEntity.getStageTokenSharePercentage(_fundingStage);
            raisedAmount = FundingEntity.getStageAmountRaised(_fundingStage);
            return getTokenFraction( percentInStage, raisedAmount, _ether_amount );
        } else {

            percentInStage = FundingEntity.getStageTokenSharePercentage(1);
            raisedAmount = FundingEntity.getStageAmountRaised(1);
            uint256 myPRETokens = getTokenFraction( percentInStage, raisedAmount, _ether_amount );
            uint256 myIcoTokens = getMyTokensInSecondStage(_ether_amount);

            uint256 totalUnsoldAmount = getUnsoldTokenAmount();
            uint256 myUnsoldTokenShare = getUnsoldTokenFraction(totalUnsoldAmount, (myPRETokens + myIcoTokens)) ;

            return myPRETokens;
        }
    }
    */

    function getMyTokensInFirstStage(address _vaultAddress) public view returns(uint256) {
        FundingVault vault = FundingVault(_vaultAddress);
        uint8 PREpercentInStage = FundingEntity.getStageTokenSharePercentage(1);
        uint256 PREraisedAmount = FundingEntity.getStageAmountRaised(1);
        return getTokenFraction( PREpercentInStage, PREraisedAmount, vault.stageAmounts(1) );
    }

    function getMyTokensInSecondStage(address _vaultAddress) public view returns(uint256) {
        FundingVault vault = FundingVault(_vaultAddress);
        return vault.stageAmounts(2) * getStageTwoParity();
    }

    function getStageTwoParity() public view returns(uint256) {
        uint256 parityPRE = getTokenParity(1);
        uint256 parityICO = getTokenParity(2);
        if(parityPRE < parityICO) {
            return parityPRE;
        } else {
            return parityICO;
        }
    }



    function getTokenFraction(uint8 _percentInStage, uint256 _raisedAmount, uint256 _my_ether_amount )
        public view returns(uint256)
    {
        return ((tokenSupply * _percentInStage / 100) * _my_ether_amount) / _raisedAmount;
    }

    function getUnsoldTokenFraction(uint256 _unsold_supply, uint256 my_amount )
        public view returns(uint256)
    {
        uint256 precision = 18;
        uint256 fraction = getFraction(my_amount, getSoldTokenAmount(), precision);
        return (_unsold_supply * fraction) / ( 10 ** precision );
    }

    function getFraction(uint256 numerator, uint256 denominator, uint256 precision) public view returns(uint256) {
        // caution, check safe-to-multiply here
        uint _numerator  = numerator * 10 ** (precision+1);
        // with rounding of last digit
        uint _quotient =  ((_numerator / denominator) + 5) / 10;
        return _quotient;
    }

    function getSoldTokenAmount() public view returns(uint256) {
        uint8 TokenSellPercentage = FundingEntity.TokenSellPercentage();
        uint256 TokensForSale = tokenSupply * TokenSellPercentage / 100;
        return TokensForSale - getUnsoldTokenAmount();
    }

    function getUnsoldTokenAmount() public view returns(uint256) {
        uint256 parity = getStageTwoParity();
        uint256 parityPRE = getTokenParity(1);
        if(parity == parityPRE) {
            // case 1, we receive a lot in pre, we need to sell ico tokens at partiy + added price,
            // and redistribute the ones left
            uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(2);
            uint256 raisedAmount = FundingEntity.getStageAmountRaised(2);
            uint256 tokensInStage = tokenSupply * percentInStage / 100;
            uint256 tokensSold = raisedAmount * parity;
            return tokensInStage - tokensSold ;
        } else {
            // case 2, pre ico sold some tokens but did not reach 10% parity fraction of total,
            // this means pre ico 1 distribution is OK and has a pretty large discount
            // also that ICO sold all remaining tokens allocated to it... this means we should have 0 unsold tokens
            // parity = parityICO;
            return 0;
        }
    }


    function getTokenParity(uint8 stageId) public view returns (uint256) {

        uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(stageId);
        uint256 raisedAmount = FundingEntity.getStageAmountRaised(stageId);
        uint256 tokensInStage = tokenSupply * percentInStage / 100;
        uint256 parity = tokensInStage / raisedAmount;

        if(stageId == 1) {
            uint8 priceAdd = FundingEntity.getStagePriceAdd(2);
            if(priceAdd > 0) {
                parity = parity - ( parity * priceAdd / 100 );
            }
        }
        return parity;
    }

    /*
    function getTokensInSecondStage(uint256 _ether_amount) public view returns(uint256) {

        uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(2);
        uint256 raisedAmount = FundingEntity.getStageAmountRaised(2);

        uint256 parityPRE = getTokenParity(1);
        uint256 parityICO = getTokenParity(2);
        uint256 parity = 0;
        uint256 unsoldTokens = 0;

        if(parityPRE < parityICO) {
            // case 1, we receive a lot in pre, we need to sell ico tokens at partiy + added price,
            // and redistribute the ones left
            parity = parityPRE;


            uint256 tokensInStage = tokenSupply * percentInStage / 100;
            uint256 tokensSold = raisedAmount * parity;
            uint256 myTokensInIco = _ether_amount * parity;


            unsoldTokens = tokensInStage - tokensSold ;

        } else {
            // case 2, pre ico sold some tokens but did not reach 10% parity fraction of total,
            // this means pre ico 1 distribution is OK and has a pretty large discount
            // also that ICO sold all remaining tokens allocated to it... this means we should have 0 unsold tokens
            // parity = parityICO;
        }

        // uint256 myTokensInPRE = _ether_amount * parityPRE;
        // calculate token fraction based on current owned balance.
        // uint256 myTokensInICO = 99; // unsoldTokens;
        // myTokensInStage = _ether_amount * parity;
        // return myTokensInPRE + myTokensInICO;
        return unsoldTokens;
    }
    */





}