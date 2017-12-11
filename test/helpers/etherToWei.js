export function etherToWei(value) {
    return new web3.BigNumber(web3.toWei(value, 'ether'));
}

export function balanceAddress(address) {
    return web3.eth.getBalance(address);
}
