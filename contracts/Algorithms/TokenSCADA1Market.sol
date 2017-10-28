/*

 * @name        Token Stake Calculation And Distribution Algorithm - Type 1 - Market decides token value
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


**Inputs:**

- Defined Total Supply of tokens available in Current Funding Phase
- Received amount of ETH
- Minimum parity `( optional )`

**Provides:**

- Parity with [ETH](#) `( calculated by amount divided by total supply => 1 Token = X ETH )`


**Observations:**

- Will sell the whole supply of Tokens available to Current Funding Phase
- If minimum parity is provided and not reached, token allocation is done using provided parity parameter and
remaining tokens are distributed to all participants in all Completed Funding Phases in order to maintain
stake sharing `( as a result excludes Project Owner )`.


**Use cases:**
- Minimum parity not present - usable only in the First Funding Phase, where you want the market to determine
your token price.
- Minimum parity used from previous Funding Phase - enabled for usage only after at least 1 Funding Phase where
parity was determined.





	Our offering has 2 Funding Phases, a PRE ICO Phase, and an ICO Phase. These
Phases are only limited by time and the hard cap.

    Pre ICO token allocation is 10%, non guaranteed discount starts at 25%
    ICO token allocation is 40%
    Global Token Sale allocation totals: 50% (PRE ICO + ICO)

	There are no guaranteed discounts and token amounts, they are decided by
actual participation into the sale.
    This means Hard cap can be reached in the PRE ICO if demand is as such.

    This can be quite hard to grasp, so here are the details:

    Once Hard Cap, or Funding Phase Time is reached we have 2 cases:
	Case 1:
	- Hard cap is reached in PRE ICO, the whole token allocation ( Global Token
Sale allocation ) is distributed to investors and Funding is complete. No other
Funding Phases will take place.

	Case 2:
	- Hard cap is not reached.
	Based on raised amount of ether, and the token allocated to PRE ICO Funding
Phase, we calculate the Parity ( raised amount divided by token supply ) of the
next Funding Phase ( ICO ). We call this PRE ICO - TOKEN PRICE.

    Said parity plus non guaranteed discount is used as the starting floor price
for selling tokens in the next Funding Phase (ICO Phase).
    We call this ICO START PRICE.

    Once Hard Cap, or Funding Phase Time is reached we have 2 new cases:

    Case 2.1: Global Funding reached Soft Cap:
    - Buy orders in PRE ICO Phase, will be awarded tokens using PRE ICO - TOKEN
PRICE.

    - We calculate ICO Phase parity. ( raised amount divided by token supply )
    - If resulting parity is lower than ICO START PRICE then ICO - TOKEN PRICE
is ICO START PRICE.
    - If resulting parity is higher than ICO START PRICE then ICO - TOKEN PRICE
is Resulting Parity.

    - For buy orders in ICO Phase, Tokens will be allocated using ICO - TOKEN
PRICE.

    - After ICO Token allocation, if any tokens remain unsold, they are
distributed to ALL Funding Participants. This excludes the Project's Team in order
to maintain the token share balances to 50% team / 50% investors.



*/

pragma solidity 0.4.17;

import "./TokenSCADAGeneric.sol";



contract TokenSCADA1Market is TokenSCADAGeneric {

    // __constructor, passes arguments to parent constructor
    function
        TokenSCADA1Market (address _tokenContract, address _fundingContract )
        TokenSCADAGeneric( _tokenContract,  _fundingContract )
        public
    {

        // this needs hard cap on funding phases to not exist!
        SCADA_requires_hard_cap = false;
    }

    // since division on integers is not a possibility
    // we work with fractions
    function getTokenAmountByEtherForFundingStage(uint8 _fundingStage, uint256 _ether_amount) public view returns (uint256) {
        var (percentInStage, raisedAmount) = FundingEntity.getFundingStageVariablesRequiredBySCADA(_fundingStage);
        uint256 tokensInStage = tokenSupply * percentInStage / 100;
        uint256 myTokens = (tokensInStage * _ether_amount) / raisedAmount;
        return myTokens;
    }

/*

        if( gtokenSupply == 0) {}

        // FundingEntity.
        _fundingStage = 0;
        // _ether_amount = 0;
        // token_supply
        //received_amount

        // get funding stage raised amounts
        //

        decimals = 18;
        precision = 33; // precision decimals

        // 2* 10^6 * 10^10
        uint256 tokenSupply = 5*(10**6)*(10**decimals); // 2 mil tokens, with 18 decimals.

        uint256 percentInStage = 50; // 50 percent
        uint256 tokensInStage = tokenSupply * percentInStage / 100;
        uint256 raisedAmount = 60000 ether;

        // uint256 weiToMinTokenDivision = 10**(decimals + precision) / raisedAmount;
        // uint256 parity = ( raisedAmount / tokensInStage );
        // uint256 stake = parity * _ether_amount;

        // return weiToTokenDivision;
        // return percent(50, 100, 2);
        // return total;
        // uint256 tokenSubdiv = subDivision(1, tokensInStage, precision);   // 25 => 7 chars + 18 for decimals
        // percision.. 100k => 7 chars + 18 for decimal places
        // precision = 25; //

        //uint256 tokenSubDiv = subDivision(1, tokens, precision);
        //uint256 weiStake = subDivision(mine, total, precision);
        // return  ( weiStake * tokenSubDiv ) / (10 ** ( precision ) );


        // divide total

        // uint256 tokenSubDiv = subDivision(1, tokensInStage, precision);

        // return tokenSubDiv;

        // uint256 MyStakeInPrecision = subDivision(_ether_amount, raisedAmount, precision);
        // uint256 MyStake = MyStakeInPrecision / ( 10 ** ( precision -2 ) );


        //uint256 MyStakeInTokens = (MyStakeInPrecision / tokensInStage ) * ( 10 ** 5 ) ;


        // uint256 myTokenStake = myTokens
        // return myTokenStake;


        // return  tokenSubDiv;

        // uint256 MyStakeInTokens = Math.round(kBytesLoaded / kBytesTotal * 100);

        // uint256 myStake = ( weiStake * tokenSubDiv ) / (10 ** ( precision ) );
        // uint256


        // return tokenSupply;
        // return raisedAmount.lenght;
        // return stake;


        // If you want to multiply a value by a fraction (eg, 2/3), first multiply by the numerator, then divide by the denominator:
        //             val * numerator / denominator
        uint256 myTokens = (tokensInStage * _ether_amount) / raisedAmount;
        return myTokens;

    }
    */

    /*
    function getParity(uint256 tokenSupply ) pure internal {

    }
    function subDivision(uint256 numerator, uint256 denominator, uint256 _precision) public view returns(uint256 quotient) {

        // caution, check safe-to-multiply here
        uint _numerator  = numerator * 10 ** (_precision +1 );
        // with rounding of last digit
        uint _quotient =  ((_numerator / denominator) + 5) / 10;
        return (_quotient);
    }



    function toSmallestDivision (uint256 total, uint256 part) view internal returns (uint256) {
        return (part*(10**decimals))/total;
    }

    function fromSmallestDivision(uint256 value, uint256 division) view internal returns (uint256) {
        return (value*division)/(10**decimals);
    }

    function toPercentage (uint256 total, uint256 part) internal returns (uint256) {
        return (part*100)/total;
    }

    function fromPercentage(uint256 value, uint256 percentage) internal returns (uint256) {
        return (value*percentage)/100;
    }
    */
}