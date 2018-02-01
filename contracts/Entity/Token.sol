/*

 * source       https://github.com/blockbitsio/

 * @name        Token Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

  Mintable ERC20 Standard Token

*/

pragma solidity ^0.4.17;

import '../zeppelin/math/SafeMath.sol';

contract Token {
    using SafeMath for uint256;

    string public  symbol;
    string public  name;
    uint8 public   decimals;
    uint256 public totalSupply;
    string public  version = 'v1';

    mapping (address => uint256) public balances;
    mapping (address => mapping (address => uint256)) allowed;

    address public manager;
    address public deployer;

    bool public mintingFinished = false;
    bool public initialized = false;

    event Transfer(address indexed from, address indexed to, uint256 indexed value);
    event Approval(address indexed owner, address indexed spender, uint256 indexed value);
    event Mint(address indexed to, uint256 amount);
    event MintFinished();

    function Token() public {
        deployer = msg.sender;
    }

    function addSettings(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol,
        string _version,
        address _manager
    )
        onlyDeployer
        public
    {
        // can only set these once.
        require(initialized == false);

        decimals = _decimalUnits;                               // Amount of decimals for display purposes
        totalSupply = _initialAmount;                           // Set initial supply.. should be 0 if we're minting
        name = _tokenName;                                      // Set the name for display purposes
        symbol = _tokenSymbol;                                  // Set the symbol for display purposes
        version = _version;                                     // Set token version string

        // set internal owner that can mint tokens.
        manager = _manager;
        initialized = true;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_to != address(0));
        uint256 _allowance = allowed[_from][msg.sender];
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        allowed[_from][msg.sender] = _allowance.sub(_value);
        Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    function increaseApproval(address _spender, uint _addedValue) public returns (bool success) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool success) {
        uint oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        }
        else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

    function mint(address _to, uint256 _amount) onlyManager canMint public returns (bool) {
        totalSupply = totalSupply.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        Mint(_to, _amount);
        Transfer(address(0), _to, _amount);
        return true;
    }

    function finishMinting() onlyManager canMint public returns (bool) {
        mintingFinished = true;
        MintFinished();
        return true;
    }

    modifier canMint() {
        require(!mintingFinished);
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager);
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer);
        _;
    }
}

