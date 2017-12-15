pragma solidity 0.4.15;

import './Authorizable.sol';
import "./TutellusToken.sol";

contract TutellusVault is Authorizable {
    event VaultMint(address authAddress, bytes32 method);

    TutellusToken public token;

    function TutellusVault() public {
        token = new TutellusToken();
    }

    function mint(address _to, uint256 _amount) authorized public returns (bool) {
        VaultMint(msg.sender, ".mint");
        return token.mint(_to, _amount);
    }
}