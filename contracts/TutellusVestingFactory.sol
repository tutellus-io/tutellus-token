pragma solidity 0.4.15;

import "./Authorizable.sol";
import "./TokenVesting.sol";
import "./TutellusToken.sol";

contract TutellusVestingFactory is Authorizable {
    event VestingCreated(address indexed contractAddress, address indexed vestingAddress, address indexed wallet, uint256 startTime, uint256 cliff, uint256 duration);
    event VestingKYCSetted(address indexed wallet, uint256 count);
    event VestingReleased(address indexed wallet, uint256 count);

    mapping(address => mapping(address => address)) vestingsContracts;
    address[] contracts;

    TutellusToken token;

    function TutellusVestingFactory(
        address _token
    ) public 
    {
        require(_token != address(0));
        
        token = TutellusToken(_token);
    }

    function authorize(address _address) onlyOwner public {
        super.authorize(_address);
        contracts.push(_address);
    }

    function getVesting(address _address) authorized public constant returns(address) {
        require(_address != address(0));
        return vestingsContracts[msg.sender][_address];
    }

    function getVestingFromContract(address _contract, address _address) authorized public constant returns(address) {
        require(_address != address(0));
        require(_contract != address(0));
        return vestingsContracts[_contract][_address];
    }

    function createVesting(address _address, uint256 startTime, uint256 cliff, uint256 duration) authorized public {
        address vestingAddress = getVesting(_address);
        // check, if not have already one
        if (vestingAddress == address(0)) {
            // generate the vesting contract
            vestingAddress = new TokenVesting(_address, startTime, cliff, duration, true);
            VestingCreated(msg.sender, vestingAddress, _address, startTime, cliff, duration);
            // saving for reuse
            vestingsContracts[msg.sender][_address] = vestingAddress;
        }
    }

    function setValidKYC(address _address) authorized public returns(uint256) {
        uint256 count = 0;
        for (uint256 c = 0; c < contracts.length; c ++) {
            address contractAddress = contracts[c];
            address vestingAddress = vestingsContracts[contractAddress][_address];
            if (vestingAddress != address(0)) {
                TokenVesting(vestingAddress).setValidKYC();
                count += 1;
            }
        }
        VestingKYCSetted(_address, count);
        return count;
    }

    function release(address _address) authorized public returns(uint256) {
        uint256 count = 0;
        for (uint256 c = 0; c < contracts.length; c ++) {
            address contractAddress = contracts[c];
            address vestingAddress = vestingsContracts[contractAddress][_address];
            if (vestingAddress != address(0)) {
                TokenVesting(vestingAddress).release(token);
                count += 1;
            }
        }
        VestingReleased(_address, count);
        return count;
    }
} 