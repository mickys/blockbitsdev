pragma solidity ^0.4.17;

import '../../contracts/zeppelin/token/StandardToken.sol';

// mock class using StandardToken
contract StandardTokenMock is StandardToken {

    function StandardTokenMock(address initialAccount, uint256 initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply = initialBalance;
    }

}
