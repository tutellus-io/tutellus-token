pragma solidity 0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract Authorizable is Ownable {
    event LogAccess(address authAddress);
    event Grant(address authAddress, bool grant);

    mapping(address => bool) public auth;

    modifier authorized() {
        LogAccess(msg.sender);
        require(auth[msg.sender]);
        _;
    }

    function authorize(address _address) onlyOwner public {
        Grant(_address, true);
        auth[_address] = true;
    }

    function unauthorize(address _address) onlyOwner public {
        Grant(_address, false);
        auth[_address] = false;
    }
}