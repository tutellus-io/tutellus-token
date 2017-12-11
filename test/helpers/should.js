import {
    etherToWei,
    balanceAddress,
} from './';

export const shouldHaveBalance = async(address, ether_expected) => {
    const EXPECTED = etherToWei(ether_expected);
    const balance = await balanceAddress(address);
    balance.should.bignumber.equals(EXPECTED);
};
export const shouldHaveTokenBalance = async(token, address, ether_expected) => {
    const EXPECTED = etherToWei(ether_expected);
    const balance = await token.balanceOf(address);
    balance.should.bignumber.equals(EXPECTED);
};
