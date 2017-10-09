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

    event EventNewLinkRequest ( address indexed newAddress );
    event EventNewAddress ( address indexed newAddress );

    address public currentApplicationEntityAddress;     // currently linked ApplicationEntity address
    ApplicationEntity private currentApp;

    // constructor
    function GatewayInterface() public {

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
    */
    function requestCodeUpgrade( address _newAddress, bytes32 _sourceCodeUrl ) external returns (bool) {
        require(_newAddress != address(0));

        EventNewLinkRequest ( _newAddress );

        /*
            case 1 - Newly Deployed Gateway and Application

            gateway links to app and initializes
        */
        if(currentApplicationEntityAddress == address(0x0)) {
            return link(_newAddress);
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

        // lock old app
        // link new
        // unlock new
        // ?? needed ??

        return link(_newAddress);
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
        EventNewAddress(currentApplicationEntityAddress);
        return true;
    }

}