const Migrations = artifacts.require("./Migrations.sol");

module.exports = (deployer, network) => {
    if (network.indexOf('live') > -1) {
        return;
    }
    deployer.deploy(Migrations);
};
