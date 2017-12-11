pragma solidity ^0.4.15;

import "zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol";
import "zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "./TokenTimelock.sol";
import "./TutellusToken.sol";

/**
 * @title TutellusCrowdsale
 *
 * @dev Crowdsale for the Tutellus.io ICO.
 *
 * Upon finalization the pool and the team's wallet are mined. It must be
 * finalized once all the backers (including the vesting ones) have made
 * their contributions.
 */
contract TutellusCrowdsale is CappedCrowdsale, FinalizableCrowdsale, Pausable {
    event ConditionsAdded(address indexed beneficiary, uint256 rate);
    
    mapping(address => uint256) public conditions;

    mapping(address => address) public timelocksContracts;

    uint256 salePercent = 60;   // Percent of TUTs for sale
    uint256 poolPercent = 30;   // Percent of TUTs for pool
    uint256 teamPercent = 10;   // Percent of TUTs for team

    uint256 vestingLimit = 700 ether;
    uint256 specialLimit = 300 ether;

    uint256 minPreICO = 10 ether;
    uint256 minICO = 0.5 ether;

    address teamTimelock;   //Team TokenTimelock.

    function TutellusCrowdsale(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _cap,
        address _wallet,
        address _teamTimelock,
        address _tokenAddress
    )
        CappedCrowdsale(_cap)
        Crowdsale(_startTime, _endTime, 1000, _wallet)
    {
        require(_teamTimelock != address(0));
        teamTimelock = _teamTimelock;

        if (_tokenAddress != address(0)) {
            token = TutellusToken(_tokenAddress);
        }
    }

    function addSpecialRateConditions(address _address, uint256 _rate) public onlyOwner {
        require(_address != address(0));
        require(_rate > 0);

        conditions[_address] = _rate;
        ConditionsAdded(_address, _rate);
    }

    // Returns TUTs rate per 1 ETH depending on current time
    function getRateByTime() public constant returns (uint256) {
        uint256 timeNow = now;
        if (timeNow > (startTime + 11 weeks)) {
            return 1000;
        } else if (timeNow > (startTime + 10 weeks)) {
            return 1050; // + 5%
        } else if (timeNow > (startTime + 9 weeks)) {
            return 1100; // + 10%
        } else if (timeNow > (startTime + 8 weeks)) {
            return 1200; // + 20%
        } else if (timeNow > (startTime + 6 weeks)) {
            return 1350; // + 35%
        } else if (timeNow > (startTime + 4 weeks)) {
            return 1400; // + 40%
        } else if (timeNow > (startTime + 2 weeks)) {
            return 1450; // + 45%
        } else {
            return 1500; // + 50%
        }
    }

    function getTimelock(address _address) public constant returns(address) {
        return timelocksContracts[_address];
    }

    function getValidTimelock(address _address) internal returns(address) {
        address timelockAddress = getTimelock(_address);
        // check, if not have already one
        if (timelockAddress == address(0)) {
            timelockAddress = new TokenTimelock(token, _address, endTime);
            timelocksContracts[_address] = timelockAddress;
        }
        return timelockAddress;
    }

    function buyTokens(address beneficiary) whenNotPaused public payable {
        require(beneficiary != address(0));
        require(msg.value >= minICO && msg.value <= vestingLimit);
        require(validPurchase());

        uint256 rate;
        address contractAddress;

        if (conditions[beneficiary] != 0) {
            require(msg.value >= specialLimit);
            rate = conditions[beneficiary];
        } else {
            rate = getRateByTime();
            if (rate > 1200) {
                require(msg.value >= minPreICO);
            }
        }

        contractAddress = getValidTimelock(beneficiary);

        mintTokens(rate, contractAddress, beneficiary);
    }

    function mintTokens(uint _rate, address _address, address beneficiary) internal {
        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 tokens = weiAmount.mul(_rate);

        // update state
        weiRaised = weiRaised.add(weiAmount);

        token.mint(_address, tokens);
        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    // Calculate the Tokens in percent over de tokens generated
    function poolTokensByPercent(uint256 _percent) internal returns(uint256) {
        return token.totalSupply().mul(_percent).div(salePercent);
    }

    // Method to mint the team and pool tokens
    function finalization() internal {
        uint256 tokensPool = poolTokensByPercent(poolPercent);
        uint256 tokensTeam = poolTokensByPercent(teamPercent);

        token.mint(wallet, tokensPool);
        token.mint(teamTimelock, tokensTeam);
    }

    function createTokenContract() internal returns (MintableToken) {
        return new TutellusToken();
    }
}
