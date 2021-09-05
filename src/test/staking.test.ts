/*
----------------------------------------
NOTE: 
- DEPLOY SONE TOKEN IN NETWORK `DEV`
- COPY ADDRESS SONE TOKEN TO ENV
- RUN TEST IN NETWORK `DEV`
----------------------------------------
*/
import BN from 'bn.js'
import { ethers, artifacts, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
require('dotenv').config()
import { assert, expect } from 'chai'

import {
  WETH9,
  UniswapV2Factory,
  SoneSwapRouter,
  MockERC20,
  UniswapV2Pair,
  SoneToken,
  SoneMasterFarmer,
  UniswapV2Pair__factory,
} from '~/types'

const revertMsg = require('./constants/error-msg.js').revertMsg
const _BN = (str: string | number) => new BN(str)
const { deployContract } = waffle
describe('staking', function () {
  let [owner, alice, dev]: SignerWithAddress[] = []
  let _weth: WETH9
  let _factory: UniswapV2Factory
  let _router: SoneSwapRouter
  let _token0: MockERC20
  let _token1: MockERC20
  let _token2: MockERC20
  let _pair: UniswapV2Pair
  let _pair1: UniswapV2Pair
  let _soneToken: SoneToken
  let _soneMasterFarmer: SoneMasterFarmer

  beforeEach(async () => {
    // Initialize contract instances
    ;[owner, alice, dev] = await ethers.getSigners()
    _weth = (await deployContract(owner, await artifacts.readArtifact('WETH9'))) as WETH9
    _factory = (await deployContract(owner, await artifacts.readArtifact('UniswapV2Factory'), [
      owner.address,
    ])) as UniswapV2Factory
    _router = (await deployContract(owner, await artifacts.readArtifact('SoneSwapRouter'), [
      _factory.address,
      _weth.address,
    ])) as SoneSwapRouter
    _token0 = (await deployContract(alice, await artifacts.readArtifact('MockERC20'), [
      'TOKEN0',
      'TOKEN0',
      10000000,
    ])) as MockERC20
    _token1 = (await deployContract(alice, await artifacts.readArtifact('MockERC20'), [
      'TOKEN1',
      'TOKEN1',
      10000000,
    ])) as MockERC20

    await _factory.createPair(_token0.address, _token1.address)
    const pairAddress = await _factory.getPair(_token0.address, _token1.address)
    _pair = UniswapV2Pair__factory.connect(pairAddress, owner)
    _soneToken = (await deployContract(owner, await artifacts.readArtifact('SoneToken'))) as SoneToken
    await _soneToken.connect(owner).__SoneToken_init(1, 1000)

    _soneMasterFarmer = (await deployContract(owner, await artifacts.readArtifact('SoneMasterFarmer'), [
      _soneToken.address,
      dev.address,
      5,
      1,
      720,
    ])) as SoneMasterFarmer

    const blkNumber = await ethers.provider.getBlockNumber()
    await _soneToken.connect(owner).setAllowTransferOn(blkNumber + 1)
    await _soneToken.connect(owner).transferOwnership(_soneMasterFarmer.address)
  })
  afterEach(async () => {
    await _soneMasterFarmer.connect(owner).transferOwnershipSoneToken(alice.address)
  })

  describe('#add pool', async () => {
    it('success', async () => {
      // add new lp token to pool with allocation point
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      // check num of pool and total allocation point of all pools
      assert.equal((await _soneMasterFarmer.poolLength()).valueOf(), 1, 'soneMasterFarmer has 1 pool')
      assert.equal(
        (await _soneMasterFarmer.totalAllocPoint()).valueOf(),
        10,
        'soneMasterFarmer has total 10 alloc points'
      )
      // check first pool info
      const pool1 = await _soneMasterFarmer.poolInfo(0)
      assert.equal(pool1[0], _pair.address)
      assert.equal(pool1[1].toNumber(), 10)
    })
    // expect msg inform not have right to add token to pool
    it('exception not owner', async () => {
      await expect(_soneMasterFarmer.connect(alice).add(10, _pair.address, true)).to.be.revertedWith(
        revertMsg.NOT_OWNER
      )
    })
    // expect msg for adding existed pool
    it('exception pool already exist', async () => {
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      await expect(_soneMasterFarmer.connect(owner).add(10, _pair.address, true)).to.be.revertedWith(
        revertMsg.POOL_ALREADY_EXIST
      )
    })
  })
  describe('#update pool', async () => {
    beforeEach(async () => {
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
    })
    it('success', async () => {
      // update first pool
      await _soneMasterFarmer.connect(owner).set(0, 20, true)
      // check num of pool and total alloc point after update for masterfarmer
      assert.equal((await _soneMasterFarmer.poolLength()).valueOf(), 1, 'soneMasterFarmer has 1 pool')
      assert.equal(
        (await _soneMasterFarmer.totalAllocPoint()).valueOf(),
        20,
        'soneMasterFarmer has total 20 alloc points'
      )
      // check pool0 info
      const pool1 = await _soneMasterFarmer.poolInfo(0)
      assert.equal(pool1[0], _pair.address)
      assert.equal(pool1[1].toNumber(), 20)
    })
    // check update first pool not by the owner
    it('exception not owner', async () => {
      await expect(_soneMasterFarmer.connect(alice).set(0, 10, true)).to.be.revertedWith(revertMsg.NOT_OWNER)
    })
  })
  describe('#deposit', async () => {
    beforeEach(async () => {
      // add new pair to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      // Approve allowance to spend alice's tokens for the _router
      await _token0.connect(alice).approve(_router.address, 10000000)
      await _token1.connect(alice).approve(_router.address, 10000000)
      // add liquidity
      await _router.connect(alice).addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      await _router.connect(alice).addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
    })
    it('success', async () => {
      // get sone balance at addresses
      const balanceDevBefore = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenBefore = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceBefore = await _soneToken.balanceOf(alice.address)
      // Approve allowance to spend alice's lp token for the _soneMasterFarmer
      await _pair.connect(alice).approve(_soneMasterFarmer.address, 10000000)
      // deposit lp token from alice
      await _soneMasterFarmer.connect(alice).deposit(0, 999000)
      await _soneMasterFarmer.connect(alice).deposit(0, 1000000)
      // get sone balance at addresses after deposits
      const balanceDevAfter = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenAfter = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceAfter = await _soneToken.balanceOf(alice.address)
      // check amount reward to dev
      assert.equal(balanceDevAfter.sub(balanceDevBefore).toNumber(), 4, 'sone reward to dev equal to 4') // 25% * 16
      // check sone balance
      assert.equal(balanceSoneTokenAfter.sub(balanceSoneTokenBefore).toNumber(), 131, 'sone balance equal to 131') // 75% * 16 + 75% * 159
      // check alice sone balance
      assert.equal(balanceSoneAliceAfter.sub(balanceSoneAliceBefore).toNumber(), 40, 'alice sone balance equal to 40') // 159 - 75%*159
      // check lp token deposit to farmer
      assert.equal((await _pair.balanceOf(_soneMasterFarmer.address)).toNumber(), 1999000)
      // get alice info in pool 0
      const userInfo = await _soneMasterFarmer.userInfo(0, alice.address)
      // check alice info (amount lp token alice provide and lp token alice has left)
      assert.equal(userInfo[0].toNumber(), 1999000)
      assert.equal((await _pair.balanceOf(alice.address)).toNumber(), 0)
    })
    // check deposit invalid amount(0)
    it('invalid amount', async () => {
      await expect(_soneMasterFarmer.connect(alice).deposit(0, 0)).to.be.revertedWith(revertMsg.INVALID_AMOUNT_DEPOSIT)
    })
  })
  describe('#withdraw', async () => {
    beforeEach(async () => {
      // add new pair to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      // Approve allowance to spend alice's tokens for the _router
      await _token0.connect(alice).approve(_router.address, 10000000)
      await _token1.connect(alice).approve(_router.address, 10000000)
      // add liquidity
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // Approve allowance to spend alice's lp token for the _soneMasterFarmer
      await _pair.connect(alice).approve(_soneMasterFarmer.address, 10000000)
      // deposit lp token from alice
      await _soneMasterFarmer.connect(alice).deposit(0, 999000)
    })
    it('success', async () => {
      // get sone balance at addresses
      const balanceDevBefore = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenBefore = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceBefore = await _soneToken.balanceOf(alice.address)
      // withdraw all lp tokens
      await _soneMasterFarmer.connect(alice).withdraw(0, 999000)
      // get sone balance at addresses
      const balanceDevAfter = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenAfter = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceAfter = await _soneToken.balanceOf(alice.address)
      // check amount reward to dev
      assert.equal(balanceDevAfter.sub(balanceDevBefore).toNumber(), 4, 'sone reward to dev equal to 4') // 25% * 16
      // check sone balance
      assert.equal(balanceSoneTokenAfter.sub(balanceSoneTokenBefore).toNumber(), 131, 'sone balance equal to 131') // 75% * 16 + 75% * 159
      // check alice sone balance
      assert.equal(balanceSoneAliceAfter.sub(balanceSoneAliceBefore).toNumber(), 40, 'alice sone balance equal to 40') // 159 - 75%*159
      assert.equal(
        (await _pair.balanceOf(_soneMasterFarmer.address)).toNumber(),
        0,
        'soneMasterFarmer has no lp tokens'
      )
      // get alice info in pool 0
      const userInfo = await _soneMasterFarmer.userInfo(0, alice.address)
      // check lp token amount alice provides
      assert.equal(userInfo[0].valueOf(), 0)
      // check alice lp token balance
      assert.equal((await _pair.balanceOf(alice.address)).toNumber(), 999000)
    })
    // check withdraw amount larger than amount alice provides
    it('invalid amount', async () => {
      await expect(_soneMasterFarmer.connect(alice).withdraw(0, 1000000)).to.be.revertedWith(
        revertMsg.INVALID_AMOUNT_WITHDRAW
      )
    })
  })
  describe('#update pool', async () => {
    beforeEach(async () => {
      // add new lp token to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      // Approve allowance to spend alice's tokens for the _router
      await _token0.connect(alice).approve(_router.address, 10000000)
      await _token1.connect(alice).approve(_router.address, 10000000)
      // add liquidity
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // Approve allowance to spend alice's lp token for the _soneMasterFarmer
      await _pair.connect(alice).approve(_soneMasterFarmer.address, 10000000)
      // alice deposits lp tokens
      await _soneMasterFarmer.connect(alice).deposit(0, 999000)
    })
    it('success', async () => {
      // get balance sone token of addresses
      const balanceDevBefore = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenBefore = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceBefore = await _soneToken.balanceOf(alice.address)
      await _soneMasterFarmer.connect(alice).updatePool(0)
      // get balance sone token after update pool
      const balanceDevAfter = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenAfter = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceAfter = await _soneToken.balanceOf(alice.address)
      // check amount reward to dev
      assert.equal(balanceDevAfter.sub(balanceDevBefore).toNumber(), 4, 'amount reward to dev equal to 4') // 25% * 16
      // check sone token balance
      assert.equal(balanceSoneTokenAfter.sub(balanceSoneTokenBefore).toNumber(), 12, 'sone balance equal to 12') // 75% * 16
      // check alice sone token balance
      assert.equal(balanceSoneAliceAfter.sub(balanceSoneAliceBefore).toNumber(), 0, 'alice has no sone token')
      const poolInfo = await _soneMasterFarmer.poolInfo(0)
      // check accSonePerShare
      assert.equal(poolInfo[3].valueOf(), 160160160) // 0 + (160 * 10^12) / 999000
      // check lastRewardBlock
      assert.equal(poolInfo[2].valueOf(), await ethers.provider.getBlockNumber())
    })
  })
  describe('#get multiplier', async () => {
    it('_from < START_BLOCK', async () => {
      // START_BLOCK = 1
      const result = await _soneMasterFarmer.getMultiplier(0, 1)
      assert.equal(result.valueOf(), 0, 'reward multiplier equal to 0')
    })
    it('START_BLOCK < _from when week 1', async () => {
      const result = await _soneMasterFarmer.getMultiplier(1, 30)
      assert.equal(result.valueOf(), 928, 'reward multiplier equal to 928') // 29 * 32
    })
    it('START_BLOCK < _from when week 1 & 2', async () => {
      const result = await _soneMasterFarmer.getMultiplier(500, 800)
      assert.equal(result.valueOf(), 9600, 'reward multiplier equal to 9600') // (721−500)×32 + (800−721)×32
    })
  })

  describe('#get Pool Reward', async () => {
    beforeEach(async () => {
      // create new token
      _token2 = (await deployContract(alice, await artifacts.readArtifact('MockERC20'), [
        'TOKEN2',
        'TOKEN2',
        10000000,
      ])) as MockERC20
      await _factory.createPair(_token0.address, _token2.address)
      const pairAddress = await _factory.getPair(_token0.address, _token2.address)
      _pair1 = UniswapV2Pair__factory.connect(pairAddress, owner)
      // add 2 lp tokens to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      await _soneMasterFarmer.connect(owner).add(10, _pair1.address, true)
    })
    it('success', async () => {
      const result = await _soneMasterFarmer.connect(alice).getPoolReward(1, 30, 10)
      // check pool reward for farmer with totalAllocPoint = 20
      assert.equal(result[1].valueOf(), 2320) // ((30-1)*32*10)/20
      // check pool reward for dev
      assert.equal(result[0].valueOf(), 232) // 10% * forFarmer
    })
  })
  describe('#get Pending Reward', async () => {
    beforeEach(async () => {
      // Approve allowance to spend alice's tokens for the _router
      await _token0.connect(alice).approve(_router.address, 10000000)
      await _token1.connect(alice).approve(_router.address, 10000000)
      // add liquidity
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // add new lp token to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      // Approve allowance to spend alice's lp token for the _soneMasterFarmer
      await _pair.connect(alice).approve(_soneMasterFarmer.address, 10000000)
      // alice deposits lp tokens to pool
      await _soneMasterFarmer.connect(alice).deposit(0, 999000)
    })
    it('no pending', async () => {
      const result = await _soneMasterFarmer.connect(alice).pendingReward(0, alice.address)
      assert.equal(result.valueOf(), 0) // no new block
    })
    it('exits pending', async () => {
      // update lastRewardBlock and accSonePerShare
      await _soneMasterFarmer.connect(alice).updatePool(0)
      const result = await _soneMasterFarmer.connect(alice).pendingReward(0, alice.address)
      // check amount pending reward
      assert.equal(result.valueOf(), 159, 'alice pending reward equal to 159') // has 1 new block
    })
  })
  describe('#claim reward', async () => {
    beforeEach(async () => {
      // add new lp token to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      // Approve allowance to spend alice's tokens for the _router
      await _token0.connect(alice).approve(_router.address, 10000000)
      await _token1.connect(alice).approve(_router.address, 10000000)
      // add liquidity
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // Approve allowance to spend alice's lp token for the _soneMasterFarmer
      await _pair.connect(alice).approve(_soneMasterFarmer.address, 10000000)
      // alice deposits lp token to pool
      await _soneMasterFarmer.connect(alice).deposit(0, 999000)
    })
    it('success', async () => {
      // get sone token balance for addresses
      const balanceDevBefore = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenBefore = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceBefore = await _soneToken.balanceOf(alice.address)
      // alice claim reward for staking
      await _soneMasterFarmer.connect(alice).claimReward(0)
      // get sone token balance for addresses after claimed
      const balanceDevAfter = await _soneToken.balanceOf(dev.address)
      const balanceSoneTokenAfter = await _soneToken.balanceOf(_soneToken.address)
      const balanceSoneAliceAfter = await _soneToken.balanceOf(alice.address)
      // check amount reward to dev
      assert.equal(balanceDevAfter.sub(balanceDevBefore).toNumber(), 4) // 25% * 16
      // check balance sone token
      assert.equal(balanceSoneTokenAfter.sub(balanceSoneTokenBefore).toNumber(), 131) // 75% * 16 + 75% * 159
      // check alice sone balance
      assert.equal(balanceSoneAliceAfter.sub(balanceSoneAliceBefore).toNumber(), 40) // 159 - 75%*159
      // check amount lp token in masterfarmer
      assert.equal((await _pair.balanceOf(_soneMasterFarmer.address)).toNumber(), 999000)
      // get alice info in pool
      const userInfo = await _soneMasterFarmer.userInfo(0, alice.address)
      // check amount lp token alice provides
      assert.equal(userInfo[0].valueOf(), 999000)
      // check amount alice lp token has
      assert.equal((await _pair.balanceOf(alice.address)).toNumber(), 0)
    })
  })

  describe('#emergency Withdraw', async () => {
    beforeEach(async () => {
      // add new pair to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
      // Approve allowance to spend alice's tokens for the _router
      await _token0.connect(alice).approve(_router.address, 10000000)
      await _token1.connect(alice).approve(_router.address, 10000000)
      // add liquidity
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // Approve allowance to spend alice's lp token for the _soneMasterFarmer
      await _pair.connect(alice).approve(_soneMasterFarmer.address, 10000000)
      // deposit lp token to pool
      await _soneMasterFarmer.connect(alice).deposit(0, 999000)
    })
    it('success', async () => {
      // withdraw without rewards
      await _soneMasterFarmer.connect(alice).emergencyWithdraw(0)
      // check num lp token in pool and alice lp token balance
      assert.equal(
        (await _pair.balanceOf(_soneMasterFarmer.address)).toNumber(),
        0,
        'soneMasterFarmer has no lp tokens'
      )
      assert.equal((await _pair.balanceOf(alice.address)).toNumber(), 999000, 'alice lp token balance equal to 999000')
      // get alice info in pool
      const userInfo = await _soneMasterFarmer.userInfo(0, alice.address)
      // check amount lp token alice provides in pool
      assert.equal(userInfo[0].valueOf(), 0, 'amount lp token alice provides equal to 0')
      // check reward alice had received
      assert.equal(userInfo[1].valueOf(), 0, 'alice had received no rewards')
    })
  })
  describe('#set dev', async () => {
    it('success', async () => {
      // update dev address by previous dev address
      await _soneMasterFarmer.connect(dev).dev(alice.address)
      // check current dev address
      assert.equal(await _soneMasterFarmer.devaddr(), alice.address)
    })
    // check set dev address not by current dev address
    it('not dev address', async () => {
      await expect(_soneMasterFarmer.connect(alice).dev(alice.address)).to.be.revertedWith(revertMsg.NOT_DEV_ADDRESS)
    })
  })
  describe('#getNewRewardPerBlock', async () => {
    beforeEach(async () => {
      // add new pair to pool
      await _soneMasterFarmer.connect(owner).add(10, _pair.address, true)
    })
    // check reward for pool 0
    it('pid1 = 0', async () => {
      const result = await _soneMasterFarmer.connect(alice).getNewRewardPerBlock(0)
      assert.equal(result.valueOf(), 160) // 32 * 5
    })
    // check reward for pool 1
    it('pid1 = 1', async () => {
      const result = await _soneMasterFarmer.connect(alice).getNewRewardPerBlock(1)
      assert.equal(result.valueOf(), 160) // 32 * 5 * 10 (allocPoint) / 10 (totalAllocPoint)
    })
  })
})
