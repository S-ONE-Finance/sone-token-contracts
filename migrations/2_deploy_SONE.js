const SoneToken = artifacts.require("SoneToken");

const lockFromBlock = 1;
const lockToBlock = 10;

module.exports = async function(deployer) {
    await deployer.deploy(SoneToken, lockFromBlock, lockToBlock);
};
