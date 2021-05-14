const SoneTokenV2 = artifacts.require("SoneTokenV2");

const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const adminUpgradableAddress = '';

module.exports = async function (deployer, network) {
  if (network !== 'test') {
    await upgradeProxy(adminUpgradableAddress, SoneTokenV2, { deployer });
  }
}