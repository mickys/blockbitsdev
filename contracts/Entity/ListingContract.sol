/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Listing Contract
 - used by the platform to find child campaigns
 - used by mobile application to retrieve News Items

ropsten - 0x1ec6988a826c4236b3b07c5eed9059e3aa033fe2

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./../ApplicationEntityABI.sol";

contract ListingContract is ApplicationAsset {

    // child items
    struct item {
        bytes32 name;
        address itemAddress;
        bool    status;
        uint256 index;
    }

    mapping ( uint256 => item ) public items;
    uint256 public itemNum = 0;

    event EventNewChildItem(bytes32 _name, address _address, uint256 _index);

    function ListingContract() ApplicationAsset() public {

    }

    function addItem(bytes32 _name, address _address) public requireInitialised {
        require(msg.sender == owner); // only application

        item storage child = items[++itemNum];
        child.name = _name;
        child.itemAddress = _address;
        child.status = true;
        child.index = itemNum;

        EventNewChildItem( _name, _address, itemNum);
    }

    /*
    * Get current News Contract address
    *
    * @return       address NewsContractEntity
    */
    function getNewsContractAddress(uint256 _childId) external view returns (address) {
        item storage child = items[_childId];
        if(child.itemAddress != address(0x0)) {
            ApplicationEntityABI ChildApp = ApplicationEntityABI(child.itemAddress);
            return ChildApp.NewsContractEntity();
        } else {
            revert();
        }
    }

    function getItemStatus(uint256 _childId) public view returns (bool) {
        return items[_childId].status;
    }

    function delistChild( uint256 _childId ) public onlyAsset("Proposals") requireInitialised {
        item storage child = items[_childId];
            child.status = false;
    }

}