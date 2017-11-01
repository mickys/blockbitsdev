/*

 * @name        Token Manager Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>



*/

pragma solidity ^0.4.17;

import "./Token.sol";
import "./../ApplicationAsset.sol";
import "./../ApplicationEntity.sol";

import "./../Algorithms/TokenSCADA1Market.sol";

contract TokenManager is ApplicationAsset {

    TokenSCADA1Market public TokenSCADAEntity;
    Token public TokenEntity;

    function addTokenSettingsAndInit(
        uint256 _tokenSupply,
        uint8 _tokenDecimals,
        string _tokenName,
        string _tokenSymbol,
        string _version
    )
        public
        requireInitialised
        requireSettingsNotApplied
        onlyDeployer
    {
        TokenEntity = new Token(
            _tokenSupply,
            _tokenName,
            _tokenDecimals,
            _tokenSymbol,
            _version
        );
    }

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {

        // we need token address
        // we need funding contract address.. let's ask application entity ABI for it :D
        address fundingContractAddress = getApplicationAssetAddressByName('Funding');

        TokenSCADAEntity = new TokenSCADA1Market(address(TokenEntity),  fundingContractAddress);
        EventRunBeforeApplyingSettings(assetName);
    }

    function getTokenSCADARequiresHardCap() public view returns (bool) {
        return TokenSCADAEntity.requiresHardCap();
    }
}