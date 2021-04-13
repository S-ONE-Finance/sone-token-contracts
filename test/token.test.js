const SoneToken = artifacts.require('SoneToken')
const BigNumber = require('bn.js')
var BN = (s) => new BigNumber(s.toString(), 10)
const tryCatch = require("../helpers/exceptions.js").tryCatch;
const errTypes = require("../helpers/exceptions.js").errTypes;

contract('token sale', ([owner, alice, bob]) => {
  beforeEach(async () => {
    // deploy token
    this.soneToken = await SoneToken.new(1, 1000, { from: owner })
  })
  describe('#mint', async () => {
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
        100000000**18,
        { from: owner }  
      ), errTypes.mintOverCap)
    })
  })

  describe('#burn', async () => {
    it('mint 1000 & burn 200', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await this.soneToken.burn(200, {from: alice})
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 800)
    })
    it('mint 1000 & burn 200 when not access', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await tryCatch(this.soneToken.burn(
        alice,
        { from: owner }  
      ), errTypes.accessBurn)
    })
    it('mint 1000 & burn 200 when owner burn', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await this.soneToken.approve(owner, 1000, {from: alice})
      await this.soneToken.burnFrom(alice, 200, {from: owner})
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 800)
    })
  })

  describe('#lock', async () => {
    it('lock fail when allow transfer on not yet', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await tryCatch(this.soneToken.lock(
        alice,
        750,
        { from: alice }  
      ), errTypes.cantTransfer)
    })
    it('lock fail when lock over balance', async () => {
      // set allow transfer on
      await this.soneToken.setAllowTransferOn(1, {from: owner})
      await this.soneToken.mint(alice, 1000, {from: owner})
      await tryCatch(this.soneToken.lock(
        alice,
        1200,
        { from: alice }  
      ), errTypes.lockOverBalance)
    })
    it('mint 1000 & lock 750 sone token by owner', async () => {
      // set allow transfer on
      await this.soneToken.setAllowTransferOn(1, {from: owner})
      //
      await this.soneToken.mint(alice, 1000, {from: owner})
      await this.soneToken.lock(alice, 750, {from: owner})
      // balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
    })

    it('mint 1000 & lock 750 sone token not by owner', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await tryCatch(this.soneToken.lock(
        alice,
        750,
        { from: alice }  
      ), errTypes.onlyOwner)
    })
  })

  describe('#white list', async () => {
    it('lock fail when user not in white list and allow transfer on not yet', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await tryCatch(this.soneToken.lock(
        alice,
        750,
        { from: alice }  
      ), errTypes.cantTransfer)
    })
    it('lock ok when user in white list and allow transfer on not yet', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await this.soneToken.addWhitelist(alice)
      await this.soneToken.lock(alice, 750, {from: owner})
      // balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
    })
    it('lock fail when user was removed from whitelist by admin', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await this.soneToken.addWhitelist(alice, {from: owner})
      await this.soneToken.lock(alice, 750, {from: owner})
      // balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
      await this.soneToken.revokeWhitelist(alice, { from: owner })
      await tryCatch(this.soneToken.lock(
        alice,
        100,
        { from: alice }  
      ), errTypes.cantTransfer)
    })
    it('lock fail when user was removed from whitelist by self', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await this.soneToken.addWhitelist(alice, {from: owner})
      await this.soneToken.lock(alice, 750, {from: owner})
      // balance available
      assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 250)
      // balance lock
      assert.equal((await this.soneToken.lockOf(alice)).valueOf(), 750)
      // balance total balance
      assert.equal((await this.soneToken.totalBalanceOf(alice)).valueOf(), 1000)
      await this.soneToken.renounceWhitelist({ from: alice })
      await tryCatch(this.soneToken.lock(
        alice,
        100,
        { from: alice }  
      ), errTypes.cantTransfer)
    })
    it('renounce whitelist fail when user was not in whitelist renounce whitelist', async () => {
      await tryCatch(this.soneToken.renounceWhitelist({ from: alice }), errTypes.accessWhitelist)
    })
  })
  describe('#allow transfer on', async () => {
    it('not transfer', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await tryCatch(this.soneToken.transfer(
        bob,
        250,
        { from: alice }  
      ), errTypes.cantTransfer)
    })
    it('can transfer', async () => {
      await this.soneToken.mint(alice, 1000, {from: owner})
      await this.soneToken.setAllowTransferOn(1, {from: owner})
      await this.soneToken.transfer(bob, 250, { from: alice })
       // balance alice
       assert.equal((await this.soneToken.balanceOf(alice)).valueOf(), 750)
       // balance bob
       assert.equal((await this.soneToken.balanceOf(bob)).valueOf(), 250)
    })
  })

})