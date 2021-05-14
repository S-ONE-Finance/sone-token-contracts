const Migrations = artifacts.require("Migrations");

module.exports = function (deployer) {
  deployer.deploy(Migrations, {
    gas: Math.round(136112 * 1.1) // Used Gas = 90.1% Gas Limit
  });
}
