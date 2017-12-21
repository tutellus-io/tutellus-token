/*eslint-disable max-statements,complexity*/
const moment = require('moment');
const _ = require('lodash');

const TutellusVault = artifacts.require("TutellusVault.sol");
const TutellusLockerVault = artifacts.require("TutellusLockerVault.sol");
const MultiSigWallet = artifacts.require("MultiSigWallet.sol");
const TutellusCrowdsale = artifacts.require("TutellusCrowdsale.sol");
const TutellusPartnerCrowdsale = artifacts.require("TutellusPartnerCrowdsale.sol");
const TutellusVestingFactory = artifacts.require("TutellusVestingFactory.sol");

const deployMultiSig = async({deployer, owner, founders, required}) => {
    const valid_founders = _.uniq(founders);
    await deployer.deploy(MultiSigWallet, valid_founders, required, {from: owner});
    return MultiSigWallet.at(MultiSigWallet.address);
};

module.exports = async(deployer, network) => {
    if (network.indexOf('test') > -1) return; // dont deploy on tests

    let owner = '0x2797717da4b2d52c19dc3215139fb45df7338bf2';
    let founders = ['0x1234d3ea83d3dd6a9ef68a6acb751b788b8294a9', '0x46e061ec98770d488c89a2d438f8b62c9460b681'];

    if (network.indexOf('rinkeby') > -1) {
        owner = '0x8f6e232a3bbf0c4191aa6214742f271f343b0864';
        founders = ['0x24114495ecbf92396b3802877f584797b891164f', '0xffaf638443eb1135b9905d73588d44e680394edf'];
    }

    if (network.indexOf('live') > -1) {
        owner = '0x0345b940fab0db7c79ef1e0bc2e2cd58b460f551';
        founders = ["0xe32400C937F009ee71Fd96f55D5645343b200B97", "0x89680067dF55E613497b44828E0f67617eA47444", "0x943B71Dd451dAA8097bC2aD6d4afb7517cB4Cf3f"];
    }


    const etherToWei = value => new web3.BigNumber(web3.toWei(value, 'ether'));

    const unitTimeSecs = 86400;
    const startTime = 1513623600; // 18/12/2017
    const endTime = moment(new Date(startTime * 1000)).add(103 * unitTimeSecs, "seconds").unix();
    // await deployer.deploy(TutellusVault, {from: owner, overwrite: false});
    const vault_address = '0xB195028223Ec191b195125118D2EE90881a874Eb';
    const vault = TutellusVault.at(vault_address);
    const token_address = await vault.token();
    // await deployer.deploy(TutellusLockerVault, endTime, token_address, {from: owner, overwrite: false});
    const lock_address = '0xd2f346A4809D9A962ffDFa905F6FDb9A1EB79595';
    const locker = TutellusVault.at(lock_address);

    // // const wallet = await deployMultiSig({
    // //     deployer,
    // //     owner,
    // //     founders,
    // //     required: 2,
    // // });

    const wallet_address = '0xf70A4427C7c508c79Fb86d8508a8bd3fDB199f76';

    // // const team = await deployMultiSig({
    // //     deployer,
    // //     owner,
    // //     founders,
    // //     required: 2,
    // // });

    const team_address = '0xD5B04db9AAd7D8f453637b79b399a1da4A3D5c2c';

    // const params = [
    //     startTime,
    //     endTime,
    //     etherToWei(40000),
    //     wallet_address,
    //     team_address,
    //     vault_address,
    //     lock_address,
    //     etherToWei(400),
    //     etherToWei(200),
    //     etherToWei(5),
    //     etherToWei(0.05),
    //     unitTimeSecs,
    // ];
    // console.log('Params: ', params);
    // // await deployer.deploy(TutellusCrowdsale, ...params, {from: owner});

    const crowdsale_address = '0x0F3D5562cA6084F7d59CE10Dc5aB672257573dE6';


    // //Authorizations
    // // await vault.authorize(crowdsale_address, {from: owner});
    // // await locker.authorize(crowdsale_address, {from: owner});
    // // await locker.authorize(owner, {from: owner});
    // // console.log('Authorized!');

    // await deployer.deploy(TutellusVestingFactory, token_address, {from: owner, overwrite: false});
    const vesting_address = '0x08e4c274E6c9634202Ea52f63a8a9d329f7852Bc';
    const vestingFactory = TutellusVestingFactory.at(vesting_address);
    // await vestingFactory.authorize(owner, {from: owner});

    // const params_fintech = [
    //     moment().add(10, 'minutes').unix(), //10 min después de deployar
    //     endTime,
    //     etherToWei(200), //200 ETH CAP
    //     5184000, // 2 meses 2*30*24*3600
    //     15552000, // 6 meses 6*30*24*3600
    //     2400, // Rate
    //     wallet_address,
    //     '0xcE1C38525AB4E0CE292E983555F6FcA023211701', //Fintech Ventures
    //     10, //10%
    //     vault_address,
    //     vesting_address,
    // ];

    // console.log('Params Fintech: ', params_fintech);
    const fintech_crowdsale = '0xB334247f37f4D9dCbF480C4f28Fcc7376410a906';

    // const params_cryptoinvest = [
    //     moment().add(10, 'minutes').unix(), //10 min después de deployar
    //     endTime,
    //     etherToWei(200), //200 ETH CAP
    //     5184000, // 2 meses 2*30*24*3600
    //     15552000, // 6 meses 6*30*24*3600
    //     2400, // Rate
    //     wallet_address,
    //     '0xB86e0c6F44F10f573B01f5A75611C9f139187Ad1', //Crypto Invest
    //     10, //10%
    //     vault_address,
    //     vesting_address,
    // ];

    // console.log('Params Crypto Invest: ', params_cryptoinvest);


    const cryptoinvest_crowdsale = '0x65BCF8dE5c59EE18a69733759c3B8040416C8fa2';

    // const params_civeta = [
    //     moment().add(10, 'minutes').unix(), //10 min después de deployar
    //     endTime,
    //     etherToWei(200), //200 ETH CAP
    //     5184000, // 2 meses 2*30*24*3600
    //     15552000, // 6 meses 6*30*24*3600
    //     2400, // Rate
    //     wallet_address,
    //     '0x3735f3980A11970DB357224f4fb37e2C69ED177D', //Civeta
    //     10, //10%
    //     vault_address,
    //     vesting_address,
    // ];
    // console.log('Params Civeta: ', params_civeta);

    const civeta_crowdsale = '0x601991640662636093411f42A42CF862Ca1ece11';

    console.log(`
        owner: ${owner}
        founders: ${founders}
        startTime: ${startTime} s
        endTime: ${endTime} s
        Tutellus Vault: ${vault_address}
        Tutellus Token: ${token_address}
        Tutellus Locker Vault: ${lock_address}
        Wallet MultiSig: ${wallet_address}
        Team Multisig: ${team_address}
        Crowdsale Address: ${crowdsale_address}
        Tutellus Vesting Factory: ${vesting_address}
        Fintech Ventures Crowdsale: ${fintech_crowdsale}
        Crypto Invest Crowdsale: ${cryptoinvest_crowdsale}
        Civeta Crowdsale: ${civeta_crowdsale}
    `);

    // await deployer.deploy(TutellusPartnerCrowdsale, ...params_civeta, {from: owner});

    // await vault.authorize(civeta_crowdsale, {from: owner});
    await vestingFactory.authorize(civeta_crowdsale, {from: owner});
};
