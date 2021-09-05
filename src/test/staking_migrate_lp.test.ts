require('dotenv').config()
import { ethers, waffle, artifacts } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert, expect } from 'chai'
import {
  Migrator,
  MockERC20,
  SoneMasterFarmer,
  SoneSwapRouter,
  SoneToken,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  WETH9,
} from '~/types'

const { deployContract } = waffle

const revertMsg = require('./constants/error-msg.js').revertMsg

describe('staking', () => {
  let [owner, alice, dev]: SignerWithAddress[] = []
  let _weth: WETH9
  let _factory: UniswapV2Factory
  let _router: SoneSwapRouter
  let _token0: MockERC20
  let _token1: MockERC20
  let _pair: UniswapV2Pair
  let _soneMasterFarmer: SoneMasterFarmer
  let _factoryNew: UniswapV2Factory
  let _migrator: Migrator
  let _soneToken: SoneToken

  beforeEach(async () => {
    ;[owner, alice, dev] = await ethers.getSigners()
    // Initialize contract instances
    _factory = (await deployContract(owner, await artifacts.readArtifact('UniswapV2Factory'), [
      owner.address,
    ])) as UniswapV2Factory
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
    _weth = (await deployContract(owner, await artifacts.readArtifact('WETH9'))) as WETH9
    _router = (await deployContract(owner, await artifacts.readArtifact('SoneSwapRouter'), [
      _factory.address,
      _weth.address,
    ])) as SoneSwapRouter
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

    _factoryNew = (await deployContract(owner, await artifacts.readArtifact('UniswapV2Factory'), [
      owner.address,
    ])) as UniswapV2Factory

    _migrator = (await deployContract(owner, await artifacts.readArtifact('Migrator'), [
      _soneMasterFarmer.address,
      _factory.address,
      _factoryNew.address,
      2,
    ])) as Migrator
  })
  describe('#check address migrator', async () => {
    it('not set', async () => {
      // check migrator address when haven't set migrator
      const migrator = await _soneMasterFarmer.migrator()
      assert.equal(migrator, '0x0000000000000000000000000000000000000000')
    })
  })
  describe('#check set migrator', async () => {
    it('success', async () => {
      // set migrator for masterFarmer
      await _soneMasterFarmer.setMigrator(_migrator.address)
      const migrator = await _soneMasterFarmer.migrator()
      // check migrator address
      assert.equal(migrator, _migrator.address)
    })
    it('exception not owner', async () => {
      // check owner of masterfarmer to set migrator
      await expect(_soneMasterFarmer.connect(alice).setMigrator(_migrator.address)).to.be.revertedWith(
        revertMsg.NOT_OWNER
      )
    })
  })
  // migrate
  describe('#migrate', async () => {
    beforeEach(async () => {
      // add new lp to pool
      await _soneMasterFarmer.add(10, _pair.address, true)
      // Approve allowance to spend alice's tokens for the router
      await _token0.connect(alice).approve(_router.address, 10000000)
      await _token1.connect(alice).approve(_router.address, 10000000)
      // add liquidity to pool
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // Approve allowance to spend alice's old lp token for the router
      await _pair.connect(alice).approve(_soneMasterFarmer.address, 10000000)
      // deposit amount of lp token to farm
      await _soneMasterFarmer.connect(alice).deposit(0, 999000)
    })
    it('exception no migrator', async () => {
      await expect(_soneMasterFarmer.connect(owner).migrate(0)).to.be.revertedWith(revertMsg.NOT_EXIST_MIGRATOR)
    })
    it('exception migrate bad', async () => {
      await _soneMasterFarmer.connect(owner).setMigrator(_migrator.address)
      await expect(_soneMasterFarmer.connect(owner).migrate(0)).to.be.revertedWith(revertMsg.MIGRATE_BAD)
    })
    it('success', async () => {
      // set migrator for farmer by owner
      await _soneMasterFarmer.connect(owner).setMigrator(_migrator.address)
      // set migrator to new factory
      await _factoryNew.connect(owner).setMigrator(_migrator.address)
      // migrate pool 0
      await _soneMasterFarmer.connect(owner).migrate(0)
      // get address lp token from new factory
      const pairAddress = await _factoryNew.getPair(_token0.address, _token1.address)
      const _pairNew = UniswapV2Pair__factory.connect(pairAddress, owner)
      // check sone master farmer lp token balance
      assert.equal(
        (await _pairNew.balanceOf(_soneMasterFarmer.address)).valueOf(),
        999000,
        'soneMasterFarmer new lp token balance equal to 999000'
      )
      assert.equal(
        (await _pair.balanceOf(_soneMasterFarmer.address)).valueOf(),
        0,
        'soneMasterFarmer old lp token balance equal to 0'
      )
    })
  })
})
