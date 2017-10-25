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

*/

pragma solidity 0.4.17;

import "./../Entity/Funding.sol";
import "./../Entity/Token.sol";

contract TokenSCADA1Market {

    uint256 tokenSupply;
    uint256 tokenDecimals;
    Funding FundingEntity;
    Token TokenEntity;

    function assignInternals(address _tokenContract, address _fundingContract ) public {
        TokenEntity = Token(_tokenContract);
        FundingEntity = Funding(_fundingContract);

        // these never change once initialized!
        tokenSupply = TokenEntity.totalSupply();
        tokenDecimals = TokenEntity.decimals();
    }

    function calculateTokenStake(uint8 _fundingStage, uint256 _ether_amount) public view {

        if(tokenSupply > 0) {

        }
        // FundingEntity.
        _fundingStage = 0;
        _ether_amount = 0;
        // token_supply
        //received_amount
    }






}