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


    struct TeamMember {
        uint8 id;
        address wallet;
        uint8 fraction;
    }

    mapping (uint8 => TeamMember) TeamMembers;
    uint8 TeamMembersNum = 0;

    function addTeamMember(address _wallet, uint8 _fraction) public requireNotInitialised {

        TeamMember storage member = TeamMembers[TeamMembersNum++];
            member.id = TeamMembersNum;
            member.wallet = _wallet;
            member.fraction = _fraction;
    }

    function AllocateTokensToTeamMembers() public requireNotInitialised {
        for(uint8 i = 0; i < TeamMembersNum; i++ ) {

            TeamMember storage member = TeamMembers[i];
            // member.id = TeamMembersNum;
            // member.wallet = _wallet;
            // member.fraction = _fraction;
            member.id = i;
        }
        // create token vault
        // allocate tokens
    }


}