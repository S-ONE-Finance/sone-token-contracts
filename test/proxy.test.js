const SoneToken = artifacts.require('SoneToken')
const SoneTokenV2 = artifacts.require('SoneTokenV2')
const BigNumber = require('bn.js')
var BN = (s) => new BigNumber(s.toString(), 10)
const tryCatch = require("../helpers/exceptions.js").tryCatch;
const errTypes = require("../helpers/exceptions.js").errTypes;
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

contract('SoneToken', ([owner, alice, bob]) => {
  beforeEach(async () => {
    console.log('owner', alice);
    // Deploy SONE proxy token
    this.soneTokenV1 = await deployProxy(SoneToken, [1, 1000], {
      initializer: '__SoneToken_init',
    })
  })

  describe('#call v1', async () => {
    it('mint 1000 sone token by owner', async () => {
      await this.soneTokenV1.mint(alice, 1000, {from: owner})
      await this.soneTokenV1.setAllowTransferOn(1, {from: owner})
      await this.soneTokenV1.lock(alice, 300, {from: owner})
      console.log('111', (await this.soneTokenV1.balanceOf(alice)).valueOf())
      assert.equal((await this.soneTokenV1.balanceOf(alice)).valueOf(), 700)
      this.soneTokenV2 = await upgradeProxy(this.soneTokenV1.address, SoneTokenV2);
      await this.soneTokenV2.mint(alice, 1000, {from: owner})
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 2700)
      assert.equal((await this.soneTokenV2.lockOf(alice)).valueOf(), 300)
      console.log('11', (await this.soneTokenV2.owner().valueOf()))
    })
  })
})