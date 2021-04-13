const SoneToken = artifacts.require('SoneToken')
const BigNumber = require('bn.js')
var BN = (s) => new BigNumber(s.toString(), 10)
const tryCatch = require("../helpers/exceptions.js").tryCatch;
const errTypes = require("../helpers/exceptions.js").errTypes;

contract('SoneToken', ([owner, alice, bob]) => {
  beforeEach(async () => {
    // Deploy SONE token
    this.soneToken = await SoneToken.new(1, 1000, { from: owner })
  })

  describe('# mint', async () => {
    it('mint 1000 sone token by owner', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 1000)
    })

    it('mint 1000 sone token not by owner', async () => {
      await tryCatch(this.soneToken.mint(
        alice,
        1000,
        { from: alice }
      ), errTypes.onlyOwner)
    })
    
    it('mint over cap', async () => {
      await tryCatch(this.soneToken.mint(
        alice,
        BN(100000000).mul(BN(Math.pow(10,19))).toString(),
        { from: owner }  
      ), errTypes.mintOverCap)
    })
  })

  describe('# burn', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneToken.mint(alice, 1000, {from: owner})
    })

    it('mint 1000 & burn 200', async () => {
      await this.soneToken.burn(200, {from: alice})
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 800)
    })

    it('mint 1000 & burn 200 when not access', async () => {
      await tryCatch(this.soneToken.burnFrom(
        alice,
        200,
        { from: owner }  
      ), errTypes.accessBurn)
    })

    it('mint 1000 & burn 200 when owner burn', async () => {
      await this.soneToken.approve(owner, 1000, {from: alice})
      await this.soneToken.burnFrom(alice, 200, {from: owner})
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 800)
    })
  })

  describe('# lock', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneToken.mint(alice, 1000, {from: owner})
    })

    it('lock fail when allow transfer on not yet', async () => {
      await tryCatch(this.soneToken.lock(
        alice,
        750,
        { from: owner }  
      ), errTypes.cantTransfer)
    })

    it('lock fail when lock over balance', async () => {
      // Set allow transfer on
      await tryCatch(this.soneToken.lock(
        alice,
        1200,
        { from: owner }  
      ), errTypes.lockOverBalance)
    })

    it('mint 1000 & lock 750 sone token by owner', async () => {
      // Set allow transfer on
      await this.soneToken.setAllowTransferOn(1, {from: owner})
      // Lock 750 SONE tokens of alice
      await this.soneToken.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // Balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // Balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
    })

    it('mint 1000 & lock 750 sone token not by owner', async () => {
      await tryCatch(this.soneToken.lock(
        alice,
        750,
        { from: alice }  
      ), errTypes.onlyOwner)
    })
  })

  describe('# white list', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneToken.mint(alice, 1000, {from: owner})
    })

    it('lock fail when user not in white list and allow transfer on not yet', async () => {
      await tryCatch(this.soneToken.lock(
        alice,
        750,
        { from: owner }  
      ), errTypes.cantTransfer)
    })

    it('lock ok when user in white list and allow transfer on not yet', async () => {
      await this.soneToken.addWhitelist(alice)
      await this.soneToken.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // Balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // Balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
    })

    it('lock fail when user was removed from whitelist by admin', async () => {
      await this.soneToken.addWhitelist(alice, {from: owner})
      await this.soneToken.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // Balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // Balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
      await this.soneToken.revokeWhitelist(alice, { from: owner })
      await tryCatch(this.soneToken.lock(
        alice,
        100,
        { from: owner }  
      ), errTypes.cantTransfer)
    })

    it('lock fail when user was removed from whitelist by self', async () => {
      await this.soneToken.addWhitelist(alice, {from: owner})
      await this.soneToken.lock(alice, 750, {from: owner})
      // Balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // Balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // Balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
      await this.soneToken.renounceWhitelist({ from: alice })
      await tryCatch(this.soneToken.lock(
        alice,
        100,
        { from: owner }  
      ), errTypes.cantTransfer)
    })

    it('renounce whitelist fail when user was not in whitelist renounce whitelist', async () => {
      await tryCatch(this.soneToken.renounceWhitelist({ from: alice }), errTypes.accessWhitelist)
    })
  })

  describe('# allow transfer on', async () => {
    beforeEach(async () => {
      // Mint 1000 SONE tokens
      await this.soneToken.mint(alice, 1000, {from: owner})
    })

    it('not transfer', async () => {
      await tryCatch(this.soneToken.transfer(
        bob,
        250,
        { from: alice }  
      ), errTypes.cantTransfer)
    })

    it('can transfer', async () => {
      await this.soneToken.setAllowTransferOn(1, {from: owner})
      await this.soneToken.transfer(bob, 250, { from: alice })
       // Balance alice
       assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 750)
       // Balance bob
       assert.equal((await this.soneToken.balanceOf(bob)).valueOf(), 250)
    })
  })

})