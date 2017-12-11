pragma solidity ^0.4.15;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./TokenVesting.sol";
import "./TutellusToken.sol";

/**
 * @title TutellusPartnerCrowdsale
 *
 */
contract TutellusPartnerCrowdsale is CappedCrowdsale, Pausable {
    event Withdrawal(address indexed beneficiary, uint256 amount);

    // Vestings defined
    mapping(address => address) public vestingsContracts;

    address partner;   //Partner Address.
    uint256 cliff;
    uint256 duration;
    uint256 percent;

    function TutellusPartnerCrowdsale(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _cap, 
        uint256 _cliff,
        uint256 _duration,
        uint256 _rate,
        address _wallet,
        address _partner,
        uint256 _percent,
        address _tokenAddress
    )
        CappedCrowdsale(_cap)
        Crowdsale(_startTime, _endTime, _rate, _wallet)
    {
        require(_partner != address(0));
        require(_cliff <= _duration);
        require(_percent >= 0 && _percent <= 100);

        partner = _partner;
        cliff = _cliff;
        duration = _duration;
        percent = _percent;

        if (_tokenAddress != address(0)) {
            token = TutellusToken(_tokenAddress);
        }
    }

    function getVesting(address _address) public constant returns(address) {
        return vestingsContracts[_address];
    }

    function getValidVesting(address _address) internal returns(address) {
        address vestingAddress = getVesting(_address);
        // check, if not have already one
        if (vestingAddress == address(0)) {
            // generate the vesting contract
            vestingAddress = new TokenVesting(_address, now, cliff, duration, true);
            // saving for reuse
            vestingsContracts[_address] = vestingAddress;
        }
        return vestingAddress;
    }

    function buyTokens(address beneficiary) whenNotPaused public payable {
        require(beneficiary != address(0));
        require(validPurchase());

        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 tokens = weiAmount.mul(rate);

        // update state
        weiRaised = weiRaised.add(weiAmount);

        address vestingAddress = getValidVesting(beneficiary);

        token.mint(vestingAddress, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    function forwardFunds() internal {
        //We transfer the corresponding part, the rest remains in the contract
        uint256 walletAmount = msg.value.mul(100 - percent).div(100);
        wallet.transfer(walletAmount);
    }

    function createTokenContract() internal returns (MintableToken) {
        return new TutellusToken();
    }

    function withdraw() public {
        require(hasEnded());
        uint256 amount = this.balance;
        if (amount > 0) {
            partner.transfer(amount);
            Withdrawal(msg.sender, amount);
        }
    }
}
