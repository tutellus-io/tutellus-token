pragma solidity ^0.4.15;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./TutellusVestingFactory.sol";
import "./TutellusVault.sol";

/**
 * @title TutellusPartnerCrowdsale
 *
 */
contract TutellusPartnerCrowdsale is CappedCrowdsale, Pausable {
    event Withdrawal(address indexed beneficiary, uint256 amount);

    address public partner;   //Partner Address.
    uint256 cliff;
    uint256 duration;
    uint256 percent;

    TutellusVault vault;
    TutellusVestingFactory vestingFactory;

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
        address _tutellusVault,
        address _tutellusVestingFactory
    )
        CappedCrowdsale(_cap)
        Crowdsale(_startTime, _endTime, _rate, _wallet)
    {
        require(_partner != address(0));
        require(_tutellusVault != address(0));
        require(_tutellusVestingFactory != address(0));
        require(_cliff <= _duration);
        require(_percent >= 0 && _percent <= 100);

        vault = TutellusVault(_tutellusVault);
        token = MintableToken(vault.token());

        vestingFactory = TutellusVestingFactory(_tutellusVestingFactory);

        partner = _partner;
        cliff = _cliff;
        duration = _duration;
        percent = _percent;
    }

    function buyTokens(address beneficiary) whenNotPaused public payable {
        require(beneficiary != address(0));
        require(validPurchase());

        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 tokens = weiAmount.mul(rate);

        // update state
        weiRaised = weiRaised.add(weiAmount);

        vestingFactory.createVesting(beneficiary, endTime, cliff, duration);
        address vestingAddress = vestingFactory.getVesting(beneficiary);

        vault.mint(vestingAddress, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    function forwardFunds() internal {
        //We transfer the corresponding part, the rest remains in the contract
        uint256 walletAmount = msg.value.mul(100 - percent).div(100);
        wallet.transfer(walletAmount);
    }

    function createTokenContract() internal returns (MintableToken) {}

    function withdraw() public {
        require(hasEnded());
        uint256 amount = this.balance;
        if (amount > 0) {
            partner.transfer(amount);
            Withdrawal(msg.sender, amount);
        }
    }
}
