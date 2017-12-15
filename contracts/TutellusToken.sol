pragma solidity 0.4.15;

import "zeppelin-solidity/contracts/token/MintableToken.sol";

/**
 * @title Tutellus Token
 * @author Javier Ortiz
 *
 * @dev ERC20 Tutellus Token (TUT)
 */
contract TutellusToken is MintableToken {
   string public name = "Tutellus";
   string public symbol = "TUT";
   uint8 public decimals = 18;
}