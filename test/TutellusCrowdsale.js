/* eslint-disable id-length,max-statements*/
import './environment';
import moment from 'moment';

import {
    advanceBlock,
    latestTime,
    increaseTimeTo,
    EVMThrow,
    etherToWei,
    shouldHaveTokenBalance,
} from './helpers';

const TutellusToken = artifacts.require("TutellusToken.sol");
const TutellusVault = artifacts.require("TutellusVault.sol");
const TutellusLockerVault = artifacts.require("TutellusLockerVault.sol");
const TutellusCrowdsale = artifacts.require("TutellusCrowdsale.sol");

contract('TutellusCrowdsale', ([owner, wallet, whitelisted, team]) => {
    let crowdsale;
    let token, locker;
    let startTime, endTime;

    const MARGIN_TIME_GAP = 7200;

    const CAP_ETHER = 800;
    const SPECIAL_ETHER = 400;
    const LO_SPECIAL_ETHER = 200;
    const NORMAL_ETHER = 200;
    const HI_LIMIT_ETHER = 500.1;
    const LO_LIMIT_ETHER = 199.9;
    const MIN_ICO = 0.05;
    const MIN_ICO_FAIL = 0.045;
    const MIN_PREICO = 5;
    const MIN_PREICO_FAIL = 4.95;

    const LIMIT_VESTING = 400;
    const LIMIT_SPECIAL = 200;

    const DAY_SECONDS = 86400;
    const calcSeconds = times => times * DAY_SECONDS;

    const amounts = {
        cap: etherToWei(CAP_ETHER),
        special: etherToWei(SPECIAL_ETHER),
        lo_special: etherToWei(LO_SPECIAL_ETHER),
        normal: etherToWei(NORMAL_ETHER),
        hi_limit: etherToWei(HI_LIMIT_ETHER),
        lo_limit: etherToWei(LO_LIMIT_ETHER),
        min_ico: etherToWei(MIN_ICO),
        min_ico_fail: etherToWei(MIN_ICO_FAIL),
        min_preico: etherToWei(MIN_PREICO),
        min_preico_fail: etherToWei(MIN_PREICO_FAIL),
        limit_vesting: etherToWei(LIMIT_VESTING),
        limit_special: etherToWei(LIMIT_SPECIAL),
    };

    before(async() => {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async() => {
        startTime = moment(latestTime() * 1000).add('1', 'days').unix();
        endTime = moment(startTime * 1000).add('12', 'weeks').unix();

        const vault = await TutellusVault.new();
        const token_address = await vault.token();

        locker = await TutellusLockerVault.new(endTime, token_address, {from: owner});

        const params = [
            startTime,
            endTime,
            amounts.cap,
            wallet,
            team,
            vault.address,
            locker.address,
            amounts.limit_vesting,
            amounts.limit_special,
            amounts.min_preico,
            amounts.min_ico,
            DAY_SECONDS,
            {from: owner},
        ];

        crowdsale = await TutellusCrowdsale
        .new(...params);
        token = TutellusToken.at(token_address);

        await vault.authorize(crowdsale.address, {from: owner});
        await locker.authorize(crowdsale.address, {from: owner});
        await locker.authorize(owner, {from: owner});
    });

    describe('A normal backer, without special conditions', () => {
        beforeEach(async() => {
            await increaseTimeTo(startTime);
        });
        it('should reject transactions over upper eth limit', async() =>{
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.hi_limit,
                from: whitelisted,
            })
            .should.be.rejectedWith(EVMThrow);
        });
        describe('when send ether', () => {
            beforeEach(async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.normal,
                    from: whitelisted,
                });
            });
            it('should have TUTs on Locker (+50% on first week)', async() => {
                const EXPECTED = 450000;
                await shouldHaveTokenBalance(token, locker.address, EXPECTED);
            });
            it('should have NO TUTs on sender address', async() => {
                const EXPECTED = 0;
                await shouldHaveTokenBalance(token, whitelisted, EXPECTED);
            });
        });
        it('when send twice ether should have all on locker ', async() => {
            const EXPECTED = 450000 * 2; //eslint-disable-line no-magic-numbers
            const espected_wei = etherToWei(EXPECTED);
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            });
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            });
            const balance = await locker.amounts(whitelisted);
            balance.should.bignumber.equal(espected_wei);
        });

        describe('when try to release', () => {
            beforeEach(async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.normal,
                    from: whitelisted,
                });
            });
            it('fail if not ended and verified', async() => {
                await locker.release({from: whitelisted})
                .should.be.rejectedWith(EVMThrow);
            });
            it('not fail if ended and verified', async() => {
                await increaseTimeTo(endTime);
                await locker.verify(whitelisted, {from: owner});
                await locker.release({from: whitelisted})
                .should.be.fulfilled;
            });
        });
        describe('after release', () => {
            beforeEach(async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.normal,
                    from: whitelisted,
                });
                await increaseTimeTo(endTime);
                await locker.verify(whitelisted, {from: owner});
                await locker.release({from: whitelisted})
                .should.be.fulfilled;
            });
            it('Locker should have CERO TUTS', async() => {
                const EXPECTED = 0;
                await shouldHaveTokenBalance(token, locker.address, EXPECTED);
            });
            it('investor should have ALL TUTs', async() => {
                const EXPECTED = 450000;
                await shouldHaveTokenBalance(token, whitelisted, EXPECTED);
            });
            it('should can`t release twice', async() => {
                await locker.release({from: whitelisted});
                const EXPECTED = 450000;
                await shouldHaveTokenBalance(token, whitelisted, EXPECTED);
            });
        });
    });

    describe('A special backer', () => {
        const SUPER_RATE = 10000;
        beforeEach(async() => {
            await crowdsale.addSpecialRateConditions(whitelisted, SUPER_RATE, {from: owner});
            await increaseTimeTo(startTime);
        });
        it('should accept transactions between lower and upper limit', async() =>{
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.special,
                from: whitelisted,
            })
            .should.be.fulfilled;
        });
        it('should reject transactions over upper eth limit', async() =>{
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.hi_limit,
                from: whitelisted,
            })
            .should.be.rejectedWith(EVMThrow);
        });
        it('should reject transactions under lower eth limit', async() =>{
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.lo_limit,
                from: whitelisted,
            })
            .should.be.rejectedWith(EVMThrow);
        });

        describe('when send ether', () => {
            beforeEach(async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.special,
                    from: whitelisted,
                });
            });
            it('should have TUTs on Timelock', async() => {
                const EXPECTED = 4000000;
                await shouldHaveTokenBalance(token, locker.address, EXPECTED);
            });
            it('should have NO TUTs on sender address', async() => {
                const EXPECTED = 0;
                await shouldHaveTokenBalance(token, whitelisted, EXPECTED);
            });
        });
        it('adding special conditions should not be allowed to any address except owner', async() => {
            await crowdsale.addSpecialRateConditions(whitelisted, SUPER_RATE, {from: whitelisted})
            .should.be.rejectedWith(EVMThrow);
        });
    });

    describe('Capped crowdsale', () => {
        beforeEach(async() => {
            const SUPER_RATE = 1500;
            await crowdsale.addSpecialRateConditions(whitelisted, SUPER_RATE, {from: owner});
            await increaseTimeTo(startTime);
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.special,
                from: whitelisted,
            });
        });
        it('should accept payments within cap', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.special,
                from: whitelisted,
            })
            .should.be.fulfilled;
        });

        it('should reject payments that exceed cap', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.special,
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
                value: amounts.lo_special,
                from: whitelisted,
            });
            const hasEnded = await crowdsale.hasEnded();
            hasEnded.should.equal(false);
        });

        it('should be ended if cap reached', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.special,
                from: whitelisted,
            });
            const hasEnded = await crowdsale.hasEnded();
            hasEnded.should.equal(true);
        });
    });

    describe('checking minimum contributions', () => {
        describe('on preICO', () => {
            beforeEach(async() => {
                await increaseTimeTo(startTime);
            });
            it('should accept transactions avobe limit', async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.min_preico,
                    from: whitelisted,
                })
                .should.be.fulfilled;
            });
            it('should reject transactions below limit', async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.min_preico_fail,
                    from: whitelisted,
                })
                .should.be.rejectedWith(EVMThrow);
            });
        });

        describe('on ICO', () => {
            beforeEach(async() => {
                const startTimeICO = moment(startTime * 1000).add(calcSeconds(73), 'seconds').unix(); //eslint-disable-line no-magic-numbers
                await increaseTimeTo(startTimeICO + MARGIN_TIME_GAP);
            });
            it('should accept transactions avobe limit', async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.min_ico,
                    from: whitelisted,
                })
                .should.be.fulfilled;
            });
            it('should reject transactions below limit', async() => {
                await crowdsale.buyTokens(whitelisted, {
                    value: amounts.min_ico_fail,
                    from: whitelisted,
                })
                .should.be.rejectedWith(EVMThrow);
            });
        });
    });

    describe('has a rate', () => {
        const rateShouldBe = async(rate_expected, {from, to}) => {
            const rateShouldBeOnDate = async(rate, time) => {
                await increaseTimeTo(time);
                const result = await crowdsale.getRateByTime();
                result.should.bignumber.equal(rate_expected);
            };
            await rateShouldBeOnDate(rate_expected, from + MARGIN_TIME_GAP);
            await rateShouldBeOnDate(rate_expected, to - MARGIN_TIME_GAP);
        };
        describe('the first round pre-ico', () => {
            it('should be +50% (2250)', async() => {
                const RATE_EXPECTED = 2250;
                await rateShouldBe(RATE_EXPECTED, {
                    from: startTime,
                    to: moment(startTime * 1000).add(calcSeconds(28), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
        });
        describe('the second round pre-ico', () => {
            it('should be +45% (2175)', async() => {
                const RATE_EXPECTED = 2175;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add(calcSeconds(28), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                    to: moment(startTime * 1000).add(calcSeconds(42), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
        });
        describe('the third round pre-ico', () => {
            it('should be +40% (2100)', async() => {
                const RATE_EXPECTED = 2100;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add(calcSeconds(42), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                    to: moment(startTime * 1000).add(calcSeconds(56), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
        });
        describe('the fourth round pre-ico', () => {
            it('should be +35% (2025)', async() => {
                const RATE_EXPECTED = 2025;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add(calcSeconds(56), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                    to: moment(startTime * 1000).add(calcSeconds(73), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
        });
        describe('the first round ico', () => {
            it('should be +20% (1800)', async() => {
                const RATE_EXPECTED = 1800;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add(calcSeconds(73), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                    to: moment(startTime * 1000).add(calcSeconds(80), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
        });
        describe('the second round ico', () => {
            it('should be +10% (1650)', async() => {
                const RATE_EXPECTED = 1650;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add(calcSeconds(80), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                    to: moment(startTime * 1000).add(calcSeconds(87), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
        });
        describe('the third round ico', () => {
            it('should be +5% (1575)', async() => {
                const RATE_EXPECTED = 1575;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add(calcSeconds(87), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                    to: moment(startTime * 1000).add(calcSeconds(94), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
        });
        describe('the fourth round ico', () => {
            it('should be +0% (1500)', async() => {
                const RATE_EXPECTED = 1500;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add(calcSeconds(94), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                    to: moment(startTime * 1000).add(calcSeconds(103), 'seconds').unix(), //eslint-disable-line no-magic-numbers
                });
            });
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

    describe('when the crowdsale ends', () => {
        beforeEach(async() => {
            await increaseTimeTo(startTime);
            // buying 200 ether at the maximum discount you will get 300000 TUTs
            // 60% of the total
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            });
            await increaseTimeTo(endTime + 1);
            await crowdsale.finalize({from: owner});
        });
        it('the pool should have 30% minted', async() => {
            const EXPECTED = 225000;
            await shouldHaveTokenBalance(token, wallet, EXPECTED);
        });
        it('the team should have 10% minted', async() => {
            const EXPECTED = 75000;
            await shouldHaveTokenBalance(token, team, EXPECTED);
        });
    });
});
