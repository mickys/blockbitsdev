/*

 * source       https://github.com/blockbitsio/

 * @name        Token Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Zeppelin ERC20 Standard Token

*/

pragma solidity ^0.4.17;

contract ABIToken {

    string public  symbol;
    string public  name;
    uint8 public   decimals;
    uint256 public totalSupply;
    string public  version;
    mapping (address => uint256) public balances;
    mapping (address => mapping (address => uint256)) allowed;
    address public manager;
    address public deployer;
    bool public mintingFinished = false;
    bool public initialized = false;

    function addSettings( uint256 _initialAmount, string _tokenName, uint8 _decimalUnits, string _tokenSymbol, string _version, address _newOwner ) public;
    function transfer(address _to, uint256 _value) public returns (bool);
    function balanceOf(address _owner) public view returns (uint256 balance);
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool);
    function approve(address _spender, uint256 _value) public returns (bool);
    function allowance(address _owner, address _spender) public view returns (uint256 remaining);
    function increaseApproval(address _spender, uint _addedValue) public returns (bool success);
    function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool success);
    function mint(address _to, uint256 _amount) public returns (bool);
    function finishMinting() public returns (bool);
}

