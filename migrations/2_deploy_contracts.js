const moment = require('moment');

const MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
const TutellusToken = artifacts.require("./TutellusToken.sol");
const TutellusCrowdsale = artifacts.require("./TutellusCrowdsale.sol");

module.exports = function(deployer, network, accounts) {
    if (network.indexOf('test') > -1) return; // dont deploy on tests
    if (network.indexOf('dev') > -1) {
        const owner = accounts[0];
        const founders = [accounts[1], accounts[2]];
        const team = accounts[3];

        deployer.deploy(TutellusToken, {from: owner});
        deployer.deploy(MultiSigWallet, founders, 1, {from: owner})
        .then(() => {
            const startTime = moment(new Date(web3.eth.getBlock('latest').timestamp * 1000)).add(1, 'day').unix();
            const endTime = moment(new Date(startTime * 1000)).add(12, "weeks").unix();
            const rate = new web3.BigNumber(100);
            const cap = new web3.BigNumber(web3.toWei(2000, 'ether'));
            console.log('TutellusCrowdsale - params', startTime, endTime, rate, cap);

            deployer.deploy(TutellusCrowdsale, startTime, endTime, cap, MultiSigWallet.address, team, TutellusToken.address);
        })
        .catch(error => console.log('Error', error));
    }
};
