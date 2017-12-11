import './environment';
import {expectThrow} from './helpers';

const TutellusToken = artifacts.require('TutellusToken.sol');

contract('TutellusToken', accounts => {
    let token;

    beforeEach(async() => {
        token = await TutellusToken.new();
    });

    it('should start with a totalSupply of 0', async() => {
        const totalSupply = await token.totalSupply();

        totalSupply.should.bignumber.equal(0);
    });

    it('should return mintingFinished false after construction', async() => {
        const mintingFinished = await token.mintingFinished();
        mintingFinished.should.equal(false);
    });

    it('should mint a given amount of tokens to a given address', async() => {
        const result = await token.mint(accounts[0], 100);

        assert.equal(result.logs[0].event, 'Mint');
        assert.equal(result.logs[0].args.to.valueOf(), accounts[0]);
        assert.equal(result.logs[0].args.amount.valueOf(), 100);
        assert.equal(result.logs[1].event, 'Transfer');
        assert.equal(result.logs[1].args.from.valueOf(), 0x0);

        const balance0 = await token.balanceOf(accounts[0]);
        balance0.should.bignumber.equal(100);

        const totalSupply = await token.totalSupply();
        totalSupply.should.bignumber.equal(100);
    });

    it('should fail to mint after call to finishMinting', async() => {
        await token.finishMinting();
        const mintingFinished = await token.mintingFinished();
        mintingFinished.should.equal(true);
        await expectThrow(token.mint(accounts[0], 100));
    });
});
