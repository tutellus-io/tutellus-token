import './environment';
import moment from 'moment';
import {
    EVMThrow,
    advanceBlock,
    latestTime,
    etherToWei,
    increaseTimeTo,
} from './helpers';

const TutellusToken = artifacts.require('TutellusToken.sol');
const TokenVesting = artifacts.require('TokenVesting.sol');

contract('TokenVesting', ([owner, investor]) => {
    let startTime;
    let token;
    let vesting;
    let cliff, duration;

    const MINTED_TOKENS = 20000;

    before(async() => {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async() => {
        startTime = moment(latestTime() * 1000).add('1', 'days').unix();

        cliff = moment.duration(3, 'months').asSeconds(); //eslint-disable-line no-magic-numbers
        duration = moment.duration(12, 'months').asSeconds(); //eslint-disable-line no-magic-numbers

        token = await TutellusToken.new({from: owner});
        vesting = await TokenVesting.new(investor, startTime, cliff, duration, true, {from: owner});
        await token.mint(vesting.address, etherToWei(MINTED_TOKENS));
    });

    describe('initially', () => {
        beforeEach(async() => {
            await increaseTimeTo(startTime);
        });

        it('investor don`t have any tokens', async() => {
            const balance = await token.balanceOf(investor);
            balance.should.bignumber.equals(0);
        });

        it('vesting should have all tokens', async() => {
            const TOKENS_EXPECTED = etherToWei(MINTED_TOKENS);
            const balance = await token.balanceOf(vesting.address);
            balance.should.bignumber.equals(TOKENS_EXPECTED);
        });

        it('tokens can`t be released', async() => {
            await vesting.release(token.address)
            .should.be.rejectedWith(EVMThrow);
        });
    });

    describe('past the cliff date', () => {
        beforeEach(async() => {
            const cliffTime = moment(startTime).add(cliff, 'seconds');
            await increaseTimeTo(cliffTime);
        });
        it('release should be rejected when kyc is not valid', async() => {
            await vesting.release(token.address)
            .should.be.rejectedWith(EVMThrow);
        });
        it('release should be accepted when kyc is valid', async() => {
            await vesting.setValidKYC(true, {from: owner});
            await vesting.release(token.address)
            .should.be.fulfilled;
        });
    });
    describe('past the duration of the contract and released', () => {
        beforeEach(async() => {
            const endTime = moment(startTime).add(duration, 'seconds');
            await increaseTimeTo(endTime);
            await vesting.setValidKYC(true, {from: owner});
            await vesting.release(token.address);
        });
        it('investor should have all tokens', async() => {
            const TOKENS_EXPECTED = etherToWei(MINTED_TOKENS);
            const balance = await token.balanceOf(investor);
            balance.should.bignumber.equals(TOKENS_EXPECTED);
        });
        it('vesting should have 0 tokens', async() => {
            const balance = await token.balanceOf(vesting.address);
            balance.should.bignumber.equals(0);
        });
    });
});
