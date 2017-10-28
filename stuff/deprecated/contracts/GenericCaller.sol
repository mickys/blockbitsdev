/*

 * @name        Application Entity Generic Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

Used for the ABI interface when assets need to call Application Entity.

*/

pragma solidity ^0.4.17;

contract GenericCaller {

    /*
//    function getAddress('AssetCollection', 'bytes32', _name );

    function getAddress(bytes32 _sigInPlain, bytes32 _argumentData) view returns (address) {

    }

    function getBytes32(bytes32 _sigInPlain, bytes32 _argumentData) view returns (bytes32) {

    }

    function getData(bytes32 _sigInPlain, bytes32 _argumentData) public view returns (address) {

        address addr = address(owner);  //Place the test1 address on the stack
        bytes4 sig = bytes4(bytes32(keccak256(_sigInPlain))); //Function signature
        bytes32 argument = _argumentData;
        address c;

        assembly {
            let x := mload(0x40)  // Find empty storage location using "free memory pointer"
            mstore(x,sig)         // Place signature at begining of empty storage
            mstore(add(x,0x04),a) // Place first argument directly next to signature
            // mstore(add(x,0x24),b) //Place second argument next to first, padded to 32 bytes

            let success := call(      //This is the critical change (Pop the top stack value)
                5000, //5k gas
                address(this), //To addr
                0,    //No value
                x,    //Inputs are stored at location x
                0x44, //Inputs are 68 bits long
                x,    //Store output over input (saves space)
                0x20) //Outputs are 32 bytes long

            c := mload(x) //Assign output value to c
            mstore(0x40,add(x,0x44)) // Set storage pointer to empty space
        }
        return c;
    }
    */
}