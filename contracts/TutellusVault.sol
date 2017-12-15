pragma solidity 0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import "./TutellusToken.sol";

contract TutellusVault is Ownable {
    event Authorized(address authAddress);
    event Minted(address authAddress);
    
    mapping(address => bool) auth;

    modifier authorized() {
        // require(auth[msg.sender]);
        Authorized(msg.sender);
        _;
    }

    TutellusToken public token;

    function TutellusVault() public {
        token = new TutellusToken();
    }

    function mint(address _to, uint256 _amount) authorized public returns (bool) {
        Minted(msg.sender);
        return token.mint(_to, _amount);
    }
}