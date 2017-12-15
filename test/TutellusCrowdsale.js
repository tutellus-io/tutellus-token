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
const TutellusCrowdsale = artifacts.require("TutellusCrowdsale.sol");

contract('TutellusCrowdsale', ([owner, wallet, whitelisted, team]) => {
    let crowdsale;
    let token;
    let startTime, endTime;

    const MARGIN_TIME_GAP = 7200;

    const CAP_ETHER = 1000;
    const SPECIAL_ETHER = 500;
    const LO_SPECIAL_ETHER = 300;
    const NORMAL_ETHER = 200;
    const HI_LIMIT_ETHER = 700.1;
    const LO_LIMIT_ETHER = 299.9;
    const MIN_ICO = 0.5;
    const MIN_ICO_FAIL = 0.45;
    const MIN_PREICO = 10;
    const MIN_PREICO_FAIL = 9.95;

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
    };

    before(async() => {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async() => {
        startTime = moment(latestTime() * 1000).add('1', 'days').unix();
        endTime = moment(startTime * 1000).add('12', 'weeks').unix();

        const vault = await TutellusVault.new();
        crowdsale = await TutellusCrowdsale
        .new(startTime, endTime, amounts.cap, wallet, team, vault.address, {from: owner});
        token = TutellusToken.at(await crowdsale.token());
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
            it('should have TUTs on Timelock (+50% on first week)', async() => {
                const EXPECTED = 300000;
                const timelock = await crowdsale.getTimelock(whitelisted);
                await shouldHaveTokenBalance(token, timelock, EXPECTED);
            });
            it('should have NO TUTs on sender address', async() => {
                const EXPECTED = 0;
                await shouldHaveTokenBalance(token, whitelisted, EXPECTED);
            });
        });
        it('when send twice ether should reuse the timelock contract', async() => {
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            });
            const timelock = await crowdsale.getTimelock(whitelisted);
            await crowdsale.buyTokens(whitelisted, {
                value: amounts.normal,
                from: whitelisted,
            });
            const timelock_after = await crowdsale.getTimelock(whitelisted);
            timelock_after.should.equal(timelock);
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
                const EXPECTED = 5000000;
                const timelock = await crowdsale.getTimelock(whitelisted);
                await shouldHaveTokenBalance(token, timelock, EXPECTED);
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
                const startTimeICO = moment(startTime * 1000).add(8, 'weeks').unix(); //eslint-disable-line no-magic-numbers
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
        describe('the first two weeks', () => {
            it('should be +50% (1500)', async() => {
                const RATE_EXPECTED = 1500;
                await rateShouldBe(RATE_EXPECTED, {
                    from: startTime,
                    to: moment(startTime * 1000).add('2', 'weeks').unix(),
                });
            });
        });
        describe('the third and fourth week', () => {
            it('should be +45% (1450)', async() => {
                const RATE_EXPECTED = 1450;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add('2', 'weeks').unix(),
                    to: moment(startTime * 1000).add('4', 'weeks').unix(),
                });
            });
        });
        describe('the fifth and sixth week', () => {
            it('should be +40% (1400)', async() => {
                const RATE_EXPECTED = 1400;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add('4', 'weeks').unix(),
                    to: moment(startTime * 1000).add('6', 'weeks').unix(),
                });
            });
        });
        describe('the seventh and eighth week', () => {
            it('should be +35% (1350)', async() => {
                const RATE_EXPECTED = 1350;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add('6', 'weeks').unix(),
                    to: moment(startTime * 1000).add('8', 'weeks').unix(),
                });
            });
        });
        describe('the ninth week', () => {
            it('should be +20% (1200)', async() => {
                const RATE_EXPECTED = 1200;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add('8', 'weeks').unix(),
                    to: moment(startTime * 1000).add('9', 'weeks').unix(),
                });
            });
        });
        describe('the tenth week', () => {
            it('should be +10% (1100)', async() => {
                const RATE_EXPECTED = 1100;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add('9', 'weeks').unix(),
                    to: moment(startTime * 1000).add('10', 'weeks').unix(),
                });
            });
        });
        describe('the eleventh week', () => {
            it('should be +5% (1050)', async() => {
                const RATE_EXPECTED = 1050;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add('10', 'weeks').unix(),
                    to: moment(startTime * 1000).add('11', 'weeks').unix(),
                });
            });
        });
        describe('the last week', () => {
            it('should be +0% (1000)', async() => {
                const RATE_EXPECTED = 1000;
                await rateShouldBe(RATE_EXPECTED, {
                    from: moment(startTime * 1000).add('11', 'weeks').unix(),
                    to: moment(startTime * 1000).add('12', 'weeks').unix(),
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
            const EXPECTED = 150000;
            await shouldHaveTokenBalance(token, wallet, EXPECTED);
        });
        it('the team should have 10% minted', async() => {
            const EXPECTED = 50000;
            await shouldHaveTokenBalance(token, team, EXPECTED);
        });
    });
});
