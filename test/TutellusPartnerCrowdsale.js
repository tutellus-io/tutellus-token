/* eslint-disable max-statements*/
import './environment';
import moment from 'moment';

import {
    advanceBlock,
    EVMThrow,
    latestTime,
    increaseTimeTo,
    balanceAddress,
    etherToWei,
    shouldHaveBalance,
    shouldHaveTokenBalance,
} from './helpers';

const TutellusToken = artifacts.require("TutellusToken.sol");
const TutellusVault = artifacts.require("TutellusVault.sol");
const TutellusVestingFactory = artifacts.require("TutellusVestingFactory.sol");
const TutellusPartnerCrowdsale = artifacts.require("TutellusPartnerCrowdsale.sol");

contract('TutellusPartnerCrowdsale', ([owner, wallet, whitelisted, partner]) => {
    let crowdsale;
    let token, vestingFactory;
    let startTime, endTime;

    const CAP_ETHER = 1000;
    const BIG_ETHER = 500;
    const NORMAL_ETHER = 200;

    const amounts = {
        cap: etherToWei(CAP_ETHER),
        normal: etherToWei(NORMAL_ETHER),
        big: etherToWei(BIG_ETHER),
    };

    before(async() => {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async() => {
        startTime = moment(latestTime() * 1000).add('1', 'days').unix();
        endTime = moment(startTime * 1000).add('12', 'weeks').unix();

        const cliff = moment.duration(3, 'months').asSeconds(); //eslint-disable-line no-magic-numbers
        const duration = moment.duration(12, 'months').asSeconds(); //eslint-disable-line no-magic-numbers
        const rate = 1000;
        const percent = 10;

        const vault = await TutellusVault.new();
        const token_address = await vault.token();
        token = TutellusToken.at(token_address);

        vestingFactory = await TutellusVestingFactory.new(token_address, {from: owner});

        const params = [
            startTime,
            endTime,
            amounts.cap,
            cliff,
            duration,
            rate,
            wallet,
            partner,
            percent,
            vault.address,
            vestingFactory.address,
        ];

        crowdsale = await TutellusPartnerCrowdsale
        .new(...params, {from: owner});

        await vault.authorize(crowdsale.address, {from: owner});
        await vestingFactory.authorize(crowdsale.address, {from: owner});
    });

    describe('basically', () => {
        beforeEach(async() => {
            await increaseTimeTo(startTime);
        });
        it('should accept any value of transactions', async() =>{
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            })
            .should.be.fulfilled;
        });
        describe('when send ether', () => {
            beforeEach(async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.normal,
                    from: whitelisted,
                });
            });
            it('should have TUTs on Vesting contract', async() => {
                const EXPECTED = 200000;
                const vesting = await vestingFactory.getVesting(whitelisted, {from: crowdsale.address});
                await shouldHaveTokenBalance(token, vesting, EXPECTED);
            });
            it('should have NO TUTs on sender address', async() => {
                const EXPECTED = 0;
                await shouldHaveTokenBalance(token, whitelisted, EXPECTED);
            });
            it('and send twice should reuse the vesting contract', async() => {
                const vesting = await vestingFactory.getVesting(whitelisted, {from: crowdsale.address});
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.normal,
                    from: whitelisted,
                });
                const vesting_after = await vestingFactory.getVesting(whitelisted, {from: crowdsale.address});
                vesting_after.should.equal(vesting);
            });
            it('should retain a percentage of ether indicated in contract', async() => {
                const ETHER = 20;
                await shouldHaveBalance(crowdsale.address, ETHER);
            });
        });
    });

    describe('capped crowdsale', () => {
        beforeEach(async() => {
            await increaseTimeTo(startTime);
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.big,
                from: whitelisted,
            });
        });
        it('should accept payments within cap', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.big,
                from: whitelisted,
            })
            .should.be.fulfilled;
        });

        it('should reject payments that exceed cap', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.big,
                from: whitelisted,
            });
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            })
            .should.be.rejectedWith(EVMThrow);
        });

        it('should not be ended below cap', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            });
            const hasEnded = await crowdsale.hasEnded();
            hasEnded.should.equal(false);
        });

        it('should be ended if cap reached', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.big,
                from: whitelisted,
            });
            const hasEnded = await crowdsale.hasEnded();
            hasEnded.should.equal(true);
        });
    });

    describe('when the crowdsale is paused', () => {
        beforeEach(async() => {
            await crowdsale.pause({from: owner});
            await increaseTimeTo(startTime);
        });
        it('all transactions should be rejected', async()=>{
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            })
            .should.be.rejectedWith(EVMThrow);
        });
        it('and unpaused, all transactions should be accepted', async()=>{
            await crowdsale.unpause({from: owner});
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            })
            .should.be.fulfilled;
        });
    });

    describe('when the crowdsale ends, calling withdraw', () => {
        let partner_previous_balance;
        beforeEach(async() => {
            await increaseTimeTo(startTime);
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            });
            await increaseTimeTo(endTime + 1);
            partner_previous_balance = await balanceAddress(partner);
            await crowdsale.withdraw();
        });
        it('the partner should receive all ether', async() => {
            const ETHER = 20;
            const EXPECTED = etherToWei(ETHER);
            const balance = await balanceAddress(partner);
            balance.minus(partner_previous_balance).should.bignumber.equals(EXPECTED);
        });
        it('the balance of the contract should be zero', async() => {
            const EXPECTED = 0;
            await shouldHaveBalance(crowdsale.address, EXPECTED);
        });
    });
});
