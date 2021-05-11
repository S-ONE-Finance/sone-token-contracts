const SoneToken = artifacts.require('SoneToken')
const SoneTokenV2 = artifacts.require('SoneTokenV2')
const BigNumber = require('bn.js')
var BN = (s) => new BigNumber(s.toString(), 10)
const reasonRevert = require("../constants/exceptions.js").reasonRevert;
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const {
  expectRevert
} = require('@openzeppelin/test-helpers');

contract('SoneToken', ([owner, alice, bob]) => {
  beforeEach(async () => {
    console.log('owner', alice);
    // Deploy SONE v1 proxy token
    this.soneTokenV1 = await deployProxy(SoneToken, [1, 1000], {
      initializer: '__SoneToken_init',
    })
    this.soneTokenV2 = await upgradeProxy(this.soneTokenV1.address, SoneTokenV2);
  })

  describe('#v2 mint', async () => {
    it('mint 1000 sone token by owner', async () => {
      await this.soneTokenV2.mint(alice, 1000, {from: owner})
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 2000)
    })
    it('mint 1000 sone token not by owner', async () => {
      await expectRevert(this.soneTokenV2.mint(
        alice,
        1000,
        { from: alice }
      ), reasonRevert.onlyOwner)
    })
    it('mint over cap', async () => {
      await expectRevert(this.soneTokenV2.mint(
        alice,
        BN(100000000).mul(BN(Math.pow(10,19))).toString(),
        { from: owner }  
      ), reasonRevert.mintOverCap)
    })
  })

  describe('# burn', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneTokenV2.mint(alice, 1000, {from: owner})
    })

    it('mint 1000 & burn 200', async () => {
      await this.soneTokenV2.burn(200, {from: alice})
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 1800)
    })

    it('mint 1000 & burn 200 when not access', async () => {
      await expectRevert(this.soneTokenV2.burnFrom(
        alice,
        200,
        { from: owner }  
      ), reasonRevert.accessBurn)
    })

    it('mint 1000 & burn 200 when owner burn', async () => {
      await this.soneTokenV2.approve(owner, 1000, {from: alice})
      await this.soneTokenV2.burnFrom(alice, 200, {from: owner})
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 1800)
    })
  })


  describe('# lock', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneTokenV2.mint(alice, 1000, {from: owner})
    })

    it('lock fail when allow transfer on not yet', async () => {
      await expectRevert(this.soneTokenV2.lock(
        alice,
        750,
        { from: owner }  
      ), reasonRevert.cantTransfer)
    })

    it('lock fail when lock over balance', async () => {
      // Set allow transfer on
      await expectRevert(this.soneTokenV2.lock(
        alice,
        2200,
        { from: owner }  
      ), reasonRevert.lockOverBalance)
    })

    it('mint 1000 & lock 750 sone token by owner', async () => {
      // Set allow transfer on
      await this.soneTokenV2.setAllowTransferOn(1, {from: owner})
      // Lock 750 SONE tokens of alice
      await this.soneTokenV2.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 1150)
      // Balance lock
      assert.equal((await this.soneTokenV2.lockOf(alice)).valueOf(), 850)
      // Balance total balance
      assert.equal((await this.soneTokenV2.totalBalanceOf(alice)).valueOf(), 2000)
    })

    it('mint 1000 & lock 750 sone token not by owner', async () => {
      await expectRevert(this.soneTokenV2.lock(
        alice,
        750,
        { from: alice }  
      ), reasonRevert.onlyOwner)
    })
  })

  describe('# white list', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneTokenV2.mint(alice, 1000, {from: owner})
    })

    it('lock fail when user not in white list and allow transfer on not yet', async () => {
      await expectRevert(this.soneTokenV2.lock(
        alice,
        750,
        { from: owner }  
      ), reasonRevert.cantTransfer)
    })

    it('lock ok when user in white list and allow transfer on not yet', async () => {
      await this.soneTokenV2.addWhitelist(alice)
      await this.soneTokenV2.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 1150)
      // Balance lock
      assert.equal((await this.soneTokenV2.lockOf(alice)).valueOf(), 850)
      // Balance total balance
      assert.equal((await this.soneTokenV2.totalBalanceOf(alice)).valueOf(), 2000)
    })

    it('lock fail when user was removed from whitelist by admin', async () => {
      await this.soneTokenV2.addWhitelist(alice, {from: owner})
      await this.soneTokenV2.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 1150)
      // Balance lock
      assert.equal((await this.soneTokenV2.lockOf(alice)).valueOf(), 850)
      // Balance total balance
      assert.equal((await this.soneTokenV2.totalBalanceOf(alice)).valueOf(), 2000)
      await this.soneTokenV2.revokeWhitelist(alice, { from: owner })
      await expectRevert(this.soneTokenV2.lock(
        alice,
        100,
        { from: owner }  
      ), reasonRevert.cantTransfer)
    })

    it('lock fail when user was removed from whitelist by self', async () => {
      await this.soneTokenV2.addWhitelist(alice, {from: owner})
      await this.soneTokenV2.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 1150)
      // Balance lock
      assert.equal((await this.soneTokenV2.lockOf(alice)).valueOf(), 850)
      // Balance total balance
      assert.equal((await this.soneTokenV2.totalBalanceOf(alice)).valueOf(), 2000)
      await this.soneTokenV2.renounceWhitelist({ from: alice })
      await expectRevert(this.soneTokenV2.lock(
        alice,
        100,
        { from: owner }  
      ), reasonRevert.cantTransfer)
    })

    it('renounce whitelist fail when user was not in whitelist renounce whitelist', async () => {
      await expectRevert(this.soneTokenV2.renounceWhitelist({ from: alice }), reasonRevert.accessWhitelist)
    })
  })


  describe('# allow transfer on', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneTokenV2.mint(alice, 1000, {from: owner})
    })

    it('not transfer', async () => {
      await expectRevert(this.soneTokenV2.transfer(
        bob,
        250,
        { from: alice }  
      ), reasonRevert.cantTransfer)
    })

    it('not set allowTransferOn', async () => {
      await expectRevert(
        this.soneTokenV2.setAllowTransferOn(10270808, {from: owner}
      ), reasonRevert.setAllowTransferOn)
    })

    it('can transfer', async () => {
      await this.soneTokenV2.setAllowTransferOn(1, {from: owner})
      await this.soneTokenV2.transfer(bob, 250, { from: alice })
       // Balance alice
       assert.equal((await this.soneTokenV2.balanceOf(alice)).valueOf(), 1750)
       // Balance bob
       assert.equal((await this.soneTokenV2.balanceOf(bob)).valueOf(), 250)
    })
  })
  describe('# add fuction to V2', async () => {
    it('false white list', async () => {
      const result = await this.soneTokenV2.checkWhiteList(alice, {from: owner})
      assert.equal(result, false)
    })
    it('true white list', async () => {
      await this.soneTokenV2.addWhitelist(alice, {from: owner})
      const result = await this.soneTokenV2.checkWhiteList(alice, {from: owner})
      assert.equal(result, true)
    })
  })
})