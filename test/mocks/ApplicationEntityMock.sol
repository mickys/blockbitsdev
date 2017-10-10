pragma solidity ^0.4.17;

import "../../contracts/ApplicationEntity.sol";

contract ApplicationEntityMock is ApplicationEntity {

    function setProposalEntity(address _address) public {
         ProposalsEntity = Proposals(_address);
    }


}
