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
const TokenTimelock = artifacts.require('TokenTimelock.sol');

contract('TokenTimelock', ([owner, investor]) => {
    let endTime;
    let token;
    let timelock;

    const MINTED_TOKENS = 20000;

    before(async() => {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async() => {
        endTime = moment(latestTime() * 1000).add('3', 'weeks').unix();
        token = await TutellusToken.new({from: owner});
        timelock = await TokenTimelock.new(token.address, investor, endTime, {from: owner});
        await token.mint(timelock.address, etherToWei(MINTED_TOKENS));
    });

    describe('initially', () => {
        it('investor don`t have any tokens', async() => {
            const balance = await token.balanceOf(investor);
            balance.should.bignumber.equals(0);
        });

        it('timelock should have all tokens', async() => {
            const TOKENS_EXPECTED = etherToWei(MINTED_TOKENS);
            const balance = await token.balanceOf(timelock.address);
            balance.should.bignumber.equals(TOKENS_EXPECTED);
        });

        it('tokens can`t be released', async() => {
            await timelock.release()
            .should.be.rejectedWith(EVMThrow);
        });
    });

    describe('finally', () => {
        beforeEach(async() => {
            await increaseTimeTo(endTime);
        });
        it('release should be rejected when kyc is not valid', async() => {
            await timelock.release()
            .should.be.rejectedWith(EVMThrow);
        });
        it('release should be accepted when kyc is valid', async() => {
            await timelock.setValidKYC(true, {from: owner});
            await timelock.release()
            .should.be.fulfilled;
        });
        describe('after release', () =>{
            beforeEach(async() => {
                await timelock.setValidKYC(true, {from: owner});
                await timelock.release();
            });
            it('investor should have all tokens', async() => {
                const TOKENS_EXPECTED = etherToWei(MINTED_TOKENS);
                const balance = await token.balanceOf(investor);
                balance.should.bignumber.equals(TOKENS_EXPECTED);
            });
            it('timelock should have 0 tokens', async() => {
                const balance = await token.balanceOf(timelock.address);
                balance.should.bignumber.equals(0);
            });
        });
    });
});
