pragma solidity 0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import "./TutellusToken.sol";

contract TutellusVault is Ownable {
    event LogAccess(address authAddress);
    event ProxyAction(address authAddress, bytes32 method);
    
    mapping(address => bool) auth;

    modifier authorized() {
        LogAccess(msg.sender);
        require(auth[msg.sender]);
        _;
    }

    TutellusToken public token;

    function TutellusVault() public {
        token = new TutellusToken();
    }

    function mint(address _to, uint256 _amount) authorized public returns (bool) {
        ProxyAction(msg.sender, ".mint");
        return token.mint(_to, _amount);
    }

    function authorize(address _address) onlyOwner public returns (bool) {
        auth[_address] = true;
        return true;
    }
    function unauthorize(address _address) onlyOwner public returns (bool) {
        auth[_address] = false;
        return false;
    }
}