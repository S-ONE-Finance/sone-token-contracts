const SoneToken = artifacts.require("SoneToken");

const { prepareUpgrade } = require('@openzeppelin/truffle-upgrades');

const addressSoneV1 = '';

module.exports = async function (deployer) {
  await prepareUpgrade(addressSoneV1, SoneToken, { deployer });
};