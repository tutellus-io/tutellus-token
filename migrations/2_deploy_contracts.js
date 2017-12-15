const moment = require('moment');

const TutellusVault = artifacts.require("./TutellusVault.sol");
const TutellusCrowdsale = artifacts.require("./TutellusCrowdsale.sol");

module.exports = function(deployer, network, accounts) {
    if (network.indexOf('test') > -1) return; // dont deploy on tests
    const owner = accounts[0];
    const wallet = accounts[1];
    const team = accounts[2];

    deployer.deploy(TutellusVault, {from: owner})
    .then(() => {
        const startTime = moment(new Date(web3.eth.getBlock('latest').timestamp * 1000)).add(1, 'day').unix();
        const endTime = moment(new Date(startTime * 1000)).add(12, "weeks").unix();
        const rate = new web3.BigNumber(100);
        const cap = new web3.BigNumber(web3.toWei(2000, 'ether'));
        console.log('TutellusCrowdsale - params', startTime, endTime, rate, cap);

        deployer.deploy(TutellusCrowdsale, startTime, endTime, cap, wallet, team, TutellusVault.address);
    })
    .catch(error => console.log('Error', error));
};
