const SoneTokenV2 = artifacts.require("SoneTokenV2");

const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const addressAdminUpgradable = '0x7b6f9B472123DB1B38b18a713F3FCD6d4fcf90d7';

module.exports = async function (deployer) {
  const adminUpgradable = await upgradeProxy(addressAdminUpgradable, SoneTokenV2, { deployer });
  console.log('adminUpgradable', adminUpgradable);
};