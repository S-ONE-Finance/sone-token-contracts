const SoneTokenV2 = artifacts.require("SoneTokenV2");

const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const addressAdminUpgradable = '0x5970A03caDC82aF6a87CF09DBAC3a8a26D241f89';

module.exports = async function (deployer, network) {
  if (network !== 'test') {
    await upgradeProxy(addressAdminUpgradable, SoneTokenV2, { deployer });
  }
};