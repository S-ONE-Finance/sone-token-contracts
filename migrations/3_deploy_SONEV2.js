const SoneTokenV2 = artifacts.require("SoneTokenV2");

const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const addressAdminUpgradable = '0x1970c7cF311F22F9d90e15CdEaf2E6Fd0536CACC';

module.exports = async function (deployer) {
  // const adminUpgradable = await upgradeProxy(addressAdminUpgradable, SoneTokenV2, { deployer });
  // console.log('adminUpgradable', adminUpgradable);
};