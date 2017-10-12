/*

 * @name        Funding Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Listing Contract
 - used by the platform to find child campaigns
 - used by mobile application to retrieve News Items

ropsten - 0x1ec6988a826c4236b3b07c5eed9059e3aa033fe2

*/

pragma solidity ^0.4.14;

contract ListingContract {

    // child items
    struct childItem {
        bytes32 name;
        bool status;
        uint256 index;
    }

    mapping ( uint256 => childItem ) public childItems;
    uint256 public childItemNum = 0;

    // news items
    mapping ( uint256 => bytes32 ) public newsItems;
    uint256 public newsItemNum = 0;

    event ListingContractNewChildItem(bytes32 childName, uint256 index);
    event ListingContractNewNewsItem(bytes32 itemHash, uint256 index);

    function ListingContract() public {

    }

    function addNewsItem(uint256 _childId, bytes32 _hash) public childExists(_childId) {
        newsItems[++newsItemNum] = _hash;
        ListingContractNewNewsItem(_hash, _childId);
    }

    function addChildItem(bytes32 _name) public {
        childItem storage child = childItems[++childItemNum];
        child.name = _name;
        child.status = true;
        child.index = childItemNum;
        ListingContractNewChildItem( _name, childItemNum);
    }

    modifier childExists(uint256 _childId) {
        childItem storage child = childItems[_childId];
        require(child.index != 0);
        _;
    }

}