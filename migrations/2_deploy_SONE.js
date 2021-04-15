const SoneToken = artifacts.require("SoneToken");

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const lockFromBlock = 1;
const lockToBlock = 10;

module.exports = async function (deployer) {
  await deployProxy(SoneToken, [lockFromBlock, lockToBlock], { 
    deployer, 
    initializer: '__SoneToken_init',
    gas: 2075175
  });
};
