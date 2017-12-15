pragma solidity 0.4.15;

import './Authorizable.sol';
import "./TutellusToken.sol";

contract TutellusLockerVault is Authorizable {
    event Deposit(address indexed _address, uint256 _amount);
    event Verify(address indexed _address);
    event Release(address indexed _address);

    uint256 releaseTime;
    TutellusToken token;

    mapping(address => uint256) public amounts;
    mapping(address => bool) public verified;

    function TutellusLockerVault(
        uint256 _releaseTime, 
        address _token
    ) public 
    {
        require(_releaseTime > now);
        require(_token != address(0));
        
        releaseTime = _releaseTime;
        token = TutellusToken(_token);
    }

    function verify(address _address) authorized public {
        require(_address != address(0));
        
        verified[_address] = true;
        Verify(_address);
    }

    function deposit(address _address, uint256 _amount) authorized public {
        require(_address != address(0));
        require(_amount > 0);

        amounts[_address] += _amount;
        Deposit(_address, _amount);
    }

    function release() public returns(bool) {
        require(now >= releaseTime);
        require(verified[msg.sender]);

        uint256 amount = amounts[msg.sender];
        if (amount > 0) {
            amounts[msg.sender] = 0;
            if (!token.transfer(msg.sender, amount)) {
                amounts[msg.sender] = amount;
                return false;
            }
            Release(msg.sender);
        }
        return true;
    }
}