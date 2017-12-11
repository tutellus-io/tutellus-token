// This code was based on: https://github.com/OpenZeppelin/zeppelin-solidity.
// Change the releaseTime type from uint64 to uint265 and add the valid KYC flag
pragma solidity ^0.4.15;

import "zeppelin-solidity/contracts/token/ERC20Basic.sol";
import "zeppelin-solidity/contracts/token/SafeERC20.sol";
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title TokenTimelock
 * @dev TokenTimelock is a token holder contract that will allow a
 * beneficiary to extract the tokens after a given release time and KYC valid.
 */
contract TokenTimelock is Ownable {
  using SafeERC20 for ERC20Basic;

  // ERC20 basic token contract being held
  ERC20Basic public token;

  // beneficiary of tokens after they are released
  address public beneficiary;

  // timestamp when token release is enabled
  uint256 public releaseTime;

  // KYC valid
  bool public kycValid = false;

  function TokenTimelock(ERC20Basic _token, address _beneficiary, uint256 _releaseTime) public {
    require(_releaseTime > now);
    token = _token;
    beneficiary = _beneficiary;
    releaseTime = _releaseTime;
  }

  /**
    * @notice Transfers tokens held by timelock to beneficiary.
    */
  function release() public {
    require(now >= releaseTime);
    require(kycValid);

    uint256 amount = token.balanceOf(this);
    require(amount > 0);

    token.safeTransfer(beneficiary, amount);
  }

  function setValidKYC(bool _valid) public onlyOwner {
    kycValid = _valid;
  }
}