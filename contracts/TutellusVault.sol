pragma solidity 0.4.15;

import './Authorizable.sol';
import "./TutellusToken.sol";

contract TutellusVault is Authorizable {
    event VaultMint(address indexed authAddress);

    TutellusToken public token;

    function TutellusVault() public {
        token = new TutellusToken();
    }

    function mint(address _to, uint256 _amount) authorized public returns (bool) {
        require(_to != address(0));
        require(_amount >= 0);

        VaultMint(msg.sender);
        return token.mint(_to, _amount);
    }
}