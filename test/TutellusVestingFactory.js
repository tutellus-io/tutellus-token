import './environment';
import moment from 'moment';
import _ from 'lodash';
import {
    EVMThrow,
    advanceBlock,
    latestTime,
    etherToWei,
    increaseTimeTo,
    shouldHaveTokenBalance,
} from './helpers';

const TutellusVault = artifacts.require('TutellusVault.sol');
const TutellusToken = artifacts.require('TutellusToken.sol');
const TokenVesting = artifacts.require('TokenVesting.sol');
const TutellusVestingFactory = artifacts.require('TutellusVestingFactory.sol');

contract('TutellusVestingFactory', ([owner, contractA, contractB, wallet]) => {
    let startTime;
    let token, vault;
    let vesting;
    let cliff, duration;

    const MINTED_TOKENS = 2000;
    const MINTED_TOKENS_2 = 1000;

    before(async() => {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async() => {
        startTime = moment(latestTime() * 1000).add('1', 'days').unix();

        cliff = moment.duration(3, 'months').asSeconds(); //eslint-disable-line no-magic-numbers
        duration = moment.duration(12, 'months').asSeconds(); //eslint-disable-line no-magic-numbers

        vault = await TutellusVault.new({from: owner});
        token = TutellusToken.at(await vault.token());
        vesting = await TutellusVestingFactory.new(token.address, {from: owner});
        await vault.authorize(owner, {from: owner});
        await vesting.authorize(owner, {from: owner});
    });


    describe('If not authorized', () => {
        it('should reject getVesting', async() => {
            await vesting.getVesting(wallet, {from: contractA})
            .should.be.rejectedWith(EVMThrow);
        });
        it('should reject createVesting', async() => {
            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractA})
            .should.be.rejectedWith(EVMThrow);
        });
        it('should reject setValidKYC', async() => {
            await vesting.setValidKYC(wallet, {from: contractA})
            .should.be.rejectedWith(EVMThrow);
        });
    });

    describe('If two contracts are authorized, ', () => {
        beforeEach(async() => {
            await vesting.authorize(contractA, {from: owner});
            await vesting.authorize(contractB, {from: owner});
        });
        it('the same wallet on diferent contracts should create diferent vesting address', async() => {
            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractA});
            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractB});

            const vestingA = await vesting.getVesting(wallet, {from: contractA});
            const vestingB = await vesting.getVesting(wallet, {from: contractB});
            vestingA.should.not.equal(vestingB);
        });
        it('the same wallet on the same contract should returns unique address', async() => {
            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractA});
            const vestingA = await vesting.getVesting(wallet, {from: contractA});

            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractA});
            const vestingB = await vesting.getVesting(wallet, {from: contractA});
            vestingA.should.equal(vestingB);
        });
    });

    describe('Minting TUTs in 2 vesting contracts, ', () => {
        let vestingA;
        let vestingB;
        beforeEach(async() => {
            await vesting.authorize(contractA, {from: owner});
            await vesting.authorize(contractB, {from: owner});

            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractA});
            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractB});
            vestingA = await vesting.getVesting(wallet, {from: contractA});
            vestingB = await vesting.getVesting(wallet, {from: contractB});

            await vault.mint(vestingA, etherToWei(MINTED_TOKENS), {from: owner});
            await vault.mint(vestingB, etherToWei(MINTED_TOKENS_2), {from: owner});
            // const endVesting = moment(startTime).add(duration, 'seconds').unix();

            // await increaseTimeTo(endVesting);
        });

        it('should have the correct TUTs on balance', async() => {
            let EXPECTED = MINTED_TOKENS;
            await shouldHaveTokenBalance(token, vestingA, EXPECTED);
            EXPECTED = MINTED_TOKENS_2;
            await shouldHaveTokenBalance(token, vestingB, EXPECTED);
        });

        it('should validate the kyc once (twice in this case)', async() => {
            const results = await vesting.setValidKYC(wallet, {from: owner});
            const kycEvent = _.find(results.logs, {event: 'VestingKYCSetted'});
            assert.equal(kycEvent.args.count.valueOf(), 2);
        });
    });
    describe('At the end of Vesting, ', () => {
        let vestingA;
        let vestingB;
        beforeEach(async() => {
            await vesting.authorize(contractA, {from: owner});
            await vesting.authorize(contractB, {from: owner});

            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractA});
            await vesting.createVesting(wallet, startTime, cliff, duration, {from: contractB});
            vestingA = await vesting.getVesting(wallet, {from: contractA});
            vestingB = await vesting.getVesting(wallet, {from: contractB});

            await vault.mint(vestingA, etherToWei(MINTED_TOKENS), {from: owner});
            await vault.mint(vestingB, etherToWei(MINTED_TOKENS_2), {from: owner});

            await vesting.setValidKYC(wallet, {from: owner});

            const endVesting = moment(startTime * 1000).add(duration, 'seconds').unix();
            await increaseTimeTo(endVesting);
        });
        it('should release once (twice in this case)', async() => {
            const results = await vesting.release(wallet, {from: owner});
            const kycEvent = _.find(results.logs, {event: 'VestingReleased'});
            assert.equal(kycEvent.args.count.valueOf(), 2);
        });
        it('when release TUTs should transfer to wallet', async() => {
            await vesting.release(wallet, {from: owner});
            const EXPECTED = MINTED_TOKENS + MINTED_TOKENS_2;
            await shouldHaveTokenBalance(token, wallet, EXPECTED);
        });
    });
});
