/*

 * @name        Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Used as a resolver to retrieve the latest deployed version of the Application

 ENS: gateway.main.blockbits.eth will point directly to this contract.

    ADD ENS domain ownership / transfer methods

*/

pragma solidity ^0.4.17;

import "./ApplicationEntity.sol";

contract GatewayInterface {

    event EventGatewayNewLinkRequest ( address indexed newAddress );
    event EventGatewayNewAddress ( address indexed newAddress );

    address public currentApplicationEntityAddress;     // currently linked ApplicationEntity address
    ApplicationEntity private currentApp;

    address public deployerAddress;

    // constructor
    function GatewayInterface() public {
        deployerAddress = msg.sender;
    }

    /*
    * Get current ApplicationEntity Contract address
    *
    * @return       address currentApplicationEntityAddress
    */
    function getApplicationAddress() external view returns (address) {
        return currentApplicationEntityAddress;
    }

    /*
    * ApplicationEntity Contract requests to be linked
    *
    * @param        address _newAddress
    * @param        bytes32 _sourceCodeUrl
    * @modifier     validCodeUpgradeInitiator
    */
    function requestCodeUpgrade( address _newAddress, bytes32 _sourceCodeUrl )
        external
        validCodeUpgradeInitiator
        returns (bool)
    {
        require(_newAddress != address(0));

        EventGatewayNewLinkRequest ( _newAddress );

        /*
            case 1 - Newly Deployed Gateway and Application

            gateway links to app and initializes
        */
        if(currentApplicationEntityAddress == address(0x0)) {

            if(!ApplicationEntity(_newAddress).initializeAssetsToThisApplication()) {
                revert();
            }
            link(_newAddress);
            return true;
        } else {
            /*
                case 2 - Actual Code Upgrade Request

                - Current app should exist already
                - Current app
                    - Create a proposal
                    - Vote on result
                    - Get Result
                    - Approve Result
            */
            currentApp.createCodeUpgradeProposal(_newAddress, _sourceCodeUrl);
        }
    }

    /*
    * ApplicationEntity Contract approves code Upgrade
    *
    * @param        address _newAddress
    * @modifier     onlyCurrentApplicationEntity
    */
    function approveCodeUpgrade( address _newAddress ) external returns (bool) {
        require(msg.sender == currentApplicationEntityAddress);

        lockCurrentApp();
        if(!currentApp.transferAssetsToNewApplication(_newAddress)) {
            revert();
        }
        link(_newAddress);
        return true;
    }

    /*
    * Locks current Application Entity
    */
    function lockCurrentApp() internal {
        if(!currentApp.lock()) {
            revert();
        }
    }

    /*
    * Link to new Application Entity
    *
    * @param        address _newAddress
    */
    function link( address _newAddress ) internal returns (bool) {

        currentApplicationEntityAddress = _newAddress;
        currentApp = ApplicationEntity(currentApplicationEntityAddress);
        if( !currentApp.initialize() ) {
            revert();
        }
        EventGatewayNewAddress(currentApplicationEntityAddress);
        return true;
    }

    /*
    * Get current News Contract address
    *
    * @return       address NewsContractEntity
    */
    function getNewsContractAddress() external view returns (address) {
        return currentApp.NewsContractEntity();
    }

    /*
    * Get current Listing Contract address
    *
    * @return       address ListingContractEntity
    */
    function getNewsContractAddress() external view returns (address) {
        return currentApp.ListingContractEntity();
    }

    /*
    * Validates if new application's deployer is allowed to upgrade current app
    */
    modifier validCodeUpgradeInitiator() {
        bool valid = false;

        ApplicationEntity newDeployedApp = ApplicationEntity(msg.sender);
        address newDeployer = newDeployedApp.deployerAddress();

        if(newDeployer == deployerAddress) {
            valid = true;
        } else {
            if(currentApplicationEntityAddress != address(0x0)) {
                currentApp = ApplicationEntity(currentApplicationEntityAddress);
                if(currentApp.canInitiateCodeUpgrade(newDeployer)) {
                    valid = true;
                }
            }
        }

        // ok if current app accepts newDeployer as a token holder that can do a code upgrade
        // ok if newDeployer is oldDeployer
        require( valid == true );
        _;
    }
}