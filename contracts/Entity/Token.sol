/*

 * @name        Token Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Zeppelin ERC20 Standard Token

*/

pragma solidity ^0.4.17;

import "../zeppelin/token/StandardToken.sol";

contract Token is StandardToken {
    string public symbol;
    string public name;
    uint8 public decimals;
    uint256 public totalSupply;

    event TransferAndCall(address indexed from, address indexed to, uint256 value, bytes data);

    function Token(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol
    )
    public
    {
        balances[msg.sender] = _initialAmount;               // Give the creator all initial tokens
        totalSupply = _initialAmount;                        // Update total supply
        name = _tokenName;                                   // Set the name for display purposes
        decimals = _decimalUnits;                            // Amount of decimals for display purposes
        symbol = _tokenSymbol;                               // Set the symbol for display purposes
    }

    function transferAndCall(address receiver, uint256 amount) public returns (bool success) {
        if(transfer(receiver, amount)) {
            if(receiver.call(bytes4(bytes32(keccak256("tokenCallback(address,uint256)"))), msg.sender, amount)) {
                return true;
            } else {
                revert();
            }
        } else {
            revert();
        }
    }
}