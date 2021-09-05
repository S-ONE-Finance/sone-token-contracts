import BN from 'bn.js'
import { ethers, waffle, artifacts } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert, expect } from 'chai'
import {
  WETH9,
  UniswapV2Factory,
  SoneSwapRouter,
  MockERC20,
  UniswapV2Pair,
  SoneToken,
  SoneConvert,
  UniswapV2Pair__factory,
} from '~/types'

const revertMsg = require('./constants/error-msg.js').revertMsg
const { deployContract } = waffle

const _BN = (str: string | number) => new BN(str)

const MINIMUM_LIQUIDITY = 1000

describe('SoneSwapRouter - Withdraw Liquidity', () => {
  let [owner, alice, bob]: SignerWithAddress[] = []

  let _weth: WETH9
  let _factory: UniswapV2Factory
  let _router: SoneSwapRouter
  let _token0: MockERC20
  let _token1: MockERC20
  let _pair: UniswapV2Pair
  let _soneToken: SoneToken
  let _soneConvert: SoneConvert

  beforeEach(async () => {
    // Initialize contract instances
    ;[owner, alice, bob] = await ethers.getSigners()
    _weth = (await deployContract(owner, await artifacts.readArtifact('WETH9'))) as WETH9
    _factory = (await deployContract(owner, await artifacts.readArtifact('UniswapV2Factory'), [
      owner.address,
    ])) as UniswapV2Factory
    _router = (await deployContract(owner, await artifacts.readArtifact('SoneSwapRouter'), [
      _factory.address,
      _weth.address,
    ])) as SoneSwapRouter
    _soneToken = (await deployContract(owner, await artifacts.readArtifact('SoneToken'))) as SoneToken
    await _soneToken.connect(owner).__SoneToken_init(1, 1000)
    _soneConvert = (await deployContract(owner, await artifacts.readArtifact('SoneConvert'), [
      _soneToken.address,
      _weth.address,
      _factory.address,
      _router.address,
    ])) as SoneConvert
    _token0 = (await deployContract(owner, await artifacts.readArtifact('MockERC20'), [
      'TOKEN0',
      'TOKEN0',
      50000000,
    ])) as MockERC20
    _token1 = (await deployContract(owner, await artifacts.readArtifact('MockERC20'), [
      'TOKEN1',
      'TOKEN1',
      50000000,
    ])) as MockERC20
    await _factory.setSoneConvert(_soneConvert.address)

    // Get pool address of the pair token0-token1
    await _factory.createPair(_token0.address, _token1.address)

    const pairAddress = await _factory.getPair(_token0.address, _token1.address)
    _pair = UniswapV2Pair__factory.connect(pairAddress, owner)

    const blkNumber = await ethers.provider.getBlockNumber()
    await _soneToken.setAllowTransferOn(blkNumber + 1)
    // Transfer tokens to alice address
    await _token0.transfer(alice.address, 10000000)
    await _token1.transfer(alice.address, 10000000)
    // Approve allowance to spend alice's tokens for the router
    await _token0.connect(alice).approve(_router.address, 1000000)
    await _token1.connect(alice).approve(_router.address, 1000000)
  })

  describe('# withdraw liquidity in a pool excluding ETH', async () => {
    beforeEach(async () => {
      // add liquidity to new pool
      const add = await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
    })
    it('burn without fee', async () => {
      // Approve allowance to spend alice's lp token for the router
      await _pair.connect(alice).approve(_router.address, 1000000 - MINIMUM_LIQUIDITY)

      // check alice lp token balance
      assert.equal(
        (await _pair.balanceOf(alice.address)).valueOf(),
        1000000 - MINIMUM_LIQUIDITY,
        "Alice's lp token balance equal to 1000000 - MINIMUM_LIQUIDITY"
      )
      // Remove liquidity
      await _router
        .connect(alice)
        .removeLiquidity(
          _token0.address,
          _token1.address,
          1000000 - MINIMUM_LIQUIDITY,
          0,
          0,
          alice.address,
          11571287987
        )
      // check totalSupply and alice lp token balance
      assert.equal((await _pair.totalSupply()).valueOf(), MINIMUM_LIQUIDITY, 'totalSupply equal to MINIMUM_LIQUIDITY')
      assert.equal((await _pair.balanceOf(alice.address)).valueOf(), 0, "alice's lp token balance equal to 0")
      // check reserves
      const reserves = await _pair.getReserves()
      assert.equal(reserves[0].valueOf(), MINIMUM_LIQUIDITY, 'reserves[0] equal to MINIMUM_LIQUIDITY')
      assert.equal(reserves[1].valueOf(), MINIMUM_LIQUIDITY, 'reserves[1] equal to MINIMUM_LIQUIDITY')
    })

    it('burn with fee', async () => {
      await _factory.setWithdrawFeeTo(bob.address)
      // Approve allowance to spend alice's lp token for the router
      await _pair.connect(alice).approve(_router.address, 1000000 - MINIMUM_LIQUIDITY)
      // check alice's lp token balance
      assert.equal(
        (await _pair.balanceOf(alice.address)).valueOf(),
        1000000 - MINIMUM_LIQUIDITY,
        "Alice's lp token balance equal to 1000000 - MINIMUM_LIQUIDITY"
      )
      // Remove liquidity
      await _router
        .connect(alice)
        .removeLiquidity(
          _token0.address,
          _token1.address,
          1000000 - MINIMUM_LIQUIDITY,
          0,
          0,
          alice.address,
          11571287987
        )
      // check total supply and alice's lp token balance
      assert.equal(
        (await _pair.totalSupply()).valueOf(),
        MINIMUM_LIQUIDITY + 999,
        'totalSupply equal to INIMUM_LIQUIDITY + 999'
      )
      assert.equal((await _pair.balanceOf(alice.address)).valueOf(), 0, "Alice's lp token balance equal to 0")
      // check alice tokens balance
      assert.equal(
        (await _token0.balanceOf(alice.address)).valueOf(),
        9998001,
        "alice's token0 balance equal to 9998001"
      )
      assert.equal(
        (await _token1.balanceOf(alice.address)).valueOf(),
        9998001,
        "alice's token1 balance equal to 9998001"
      )
      // check bob's lp token balance
      assert.equal((await _pair.balanceOf(bob.address)).valueOf(), 999, "bob's lp token balance equal to 999")
      // check reserves
      const reserves = await _pair.getReserves()
      assert.equal(reserves[0].valueOf(), 1999, 'reserves[0] equal to 1999')
      assert.equal(reserves[1].valueOf(), 1999, 'reserves[1] equal to 1999')
    })

    it('revert: burn with token amount min over the token reserve', async () => {
      // Approve allowance to spend alice's lp token for the router
      await _pair.connect(alice).approve(_router.address, 1000000 - MINIMUM_LIQUIDITY)
      // check failed condition
      await expect(
        _router
          .connect(alice)
          .removeLiquidity(
            _token0.address,
            _token1.address,
            1000000 - MINIMUM_LIQUIDITY,
            1000000,
            1000000,
            alice.address,
            11571287987
          )
      ).to.be.revertedWith(revertMsg.INSUFFICIENT_A_AMOUNT)
    })

    it("revert: burn with liquidity amount over the pool's liquidity", async () => {
      // Approve allowance to spend alice's lp token for the router
      await _pair.connect(alice).approve(_router.address, 1000000 - MINIMUM_LIQUIDITY)
      // check alice's lp token balance
      assert.equal(
        (await _pair.balanceOf(alice.address)).valueOf(),
        1000000 - MINIMUM_LIQUIDITY,
        "Alice's lp token balance equal to 1000000 - MINIMUM_LIQUIDITY"
      )
      // check catch overflow condition
      await expect(
        _router
          .connect(alice)
          .removeLiquidity(_token0.address, _token1.address, 1000000, 1000000, 1000000, alice.address, 11571287987)
      ).to.be.revertedWith(revertMsg.SUBTRACTION_OVERFLOW)
    })

    it('revert: burn zero output amount', async () => {
      // Approve allowance to spend alice's token0 for the router
      await _token0.connect(alice).approve(_router.address, 1000)
      // Approve allowance to spend alice's lp token for the router
      await _pair.connect(alice).approve(_router.address, 1000000 - MINIMUM_LIQUIDITY)
      // check alice's lp token balance
      assert.equal(
        (await _pair.balanceOf(alice.address)).valueOf(),
        1000000 - MINIMUM_LIQUIDITY,
        "Alice's lp token balance equal to 1000000 - MINIMUM_LIQUIDITY"
      )
      // swap
      await _router
        .connect(alice)
        .swapExactTokensForTokens(1000, 0, [_token0.address, _token1.address], alice.address, 11571287987)
      // check catch wrong amount liquidity
      await expect(
        _router.connect(alice).removeLiquidity(_token0.address, _token1.address, 1, 0, 0, alice.address, 11571287987)
      ).to.be.revertedWith(revertMsg.INSUFFICIENT_LIQUIDITY_BURNED)
    })
  })

  describe('# withdraw liquidity in a pool including ETH', async () => {
    beforeEach(async () => {
      // Get pool address of the pair token0-WETH
      await _factory.createPair(_token0.address, _weth.address)
      const pairAddress = await _factory.getPair(_token0.address, _weth.address)
      _pair = UniswapV2Pair__factory.connect(pairAddress, owner)
      // add liquidity to new pool
      await _router.connect(alice).addLiquidityETH(_token0.address, 1000000, 0, 0, alice.address, 11571287987, {
        value: 1000000,
      })
    })

    it('burn without fee', async () => {
      // Approve allowance to spend alice's lp token for the router
      await _pair.connect(alice).approve(_router.address, 1000000 - MINIMUM_LIQUIDITY)
      // check alice's lp token balance
      assert.equal(
        (await _pair.balanceOf(alice.address)).valueOf(),
        1000000 - MINIMUM_LIQUIDITY,
        "Alice's lp token balance equal to 1000000 - MINIMUM_LIQUIDITY"
      )
      // Remove liquidity
      await _router
        .connect(alice)
        .removeLiquidityETH(_token0.address, 1000000 - MINIMUM_LIQUIDITY, 0, 0, alice.address, 11571287987)
      // check total supply and alice's lp token balance
      assert.equal((await _pair.totalSupply()).valueOf(), MINIMUM_LIQUIDITY, 'totalSupply equal to MINIMUM_LIQUIDITY')
      assert.equal((await _pair.balanceOf(alice.address)).valueOf(), 0, "Alice's lp token balance equal to 0")
      // check reserve tokens
      const reserves = await _pair.getReserves()
      assert.equal(reserves[0].valueOf(), MINIMUM_LIQUIDITY, 'reserves[0] equal to MINIMUM_LIQUIDITY')
      assert.equal(reserves[1].valueOf(), MINIMUM_LIQUIDITY, 'reserves[1] equal to MINIMUM_LIQUIDITY')
    })

    it('burn with fee', async () => {
      await _factory.setWithdrawFeeTo(bob.address)
      // Approve allowance to spend alice's lp token for the router
      await _pair.connect(alice).approve(_router.address, 1000000 - MINIMUM_LIQUIDITY)
      // check alice's lp token balance
      assert.equal(
        (await _pair.balanceOf(alice.address)).valueOf(),
        1000000 - MINIMUM_LIQUIDITY,
        "Alice's lp token balance equal to 1000000 - MINIMUM_LIQUIDITY"
      )
      // Remove liquidity
      await _router
        .connect(alice)
        .removeLiquidityETH(_token0.address, 1000000 - MINIMUM_LIQUIDITY, 0, 0, alice.address, 11571287987)
      // check total supply and alice's lp token and token0 balance
      assert.equal(
        (await _pair.totalSupply()).valueOf(),
        MINIMUM_LIQUIDITY + 999,
        'totalSupply equal to MINIMUM_LIQUIDITY + 999'
      )
      assert.equal((await _pair.balanceOf(alice.address)).valueOf(), 0, "Alice's lp token balance equal to 0")
      assert.equal(
        (await _token0.balanceOf(alice.address)).valueOf(),
        9998001,
        "Alice's token0balance equal to 9998001"
      )
      // check bob's lp token balance
      assert.equal((await _pair.balanceOf(bob.address)).valueOf(), 999, "bob's lp token balance equal to 999")
      // check reserve tokens
      const reserves = await _pair.getReserves()
      assert.equal(reserves[0].valueOf(), 1999, 'reserves[0] equal to 1999')
      assert.equal(reserves[1].valueOf(), 1999, 'reserves[1] equal to 1999')
    })
  })

  describe('# withdraw liquidity with sone convert', async () => {
    beforeEach(async () => {
      // Transfer tokens to bob address
      await _token0.transfer(bob.address, 10000000)
      await _token1.transfer(bob.address, 10000000)

      // Appove allowance to spend bob's tokens for the router
      await _token0.connect(bob).approve(_router.address, 1000000)
      await _token1.connect(bob).approve(_router.address, 1000000)

      // Config addresses
      await _factory.setSoneConvert(_soneConvert.address)
      await _factory.setFeeTo(owner.address)

      // Alice add liquidity
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // Bob add liquidity
      await _token0.connect(bob).approve(_router.address, 1000000)
      await _token1.connect(bob).approve(_router.address, 1000000)
      await _router
        .connect(bob)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, bob.address, 11571287987)
    })

    it('return sone when exist 1 token can swap to SONE', async () => {
      await _factory.createPair(_token0.address, _soneToken.address)
      const pairAddress = await _factory.getPair(_token0.address, _soneToken.address)
      const _pairSone = UniswapV2Pair__factory.connect(pairAddress, owner)

      _soneToken.mint(alice.address, 10000000)
      // Approve allowance to spend alice's sone token for the router
      await _soneToken.connect(alice).approve(_router.address, 1000000)
      await _token0.connect(alice).approve(_router.address, 1000000)

      // / add liquidity to new pool token0 and sone
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _soneToken.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // Swap
      for (let index = 1; index < 30; index++) {
        // Approve allowance to spend alice's token0 for the router
        await _token0.connect(alice).approve(_router.address, 1000)
        await _router
          .connect(alice)
          .swapExactTokensForTokens(1000, 0, [_token0.address, _token1.address], alice.address, 11571287987)
      }
      // Remove liquidity
      await _pair.connect(bob).approve(_router.address, 1000000)
      await _router
        .connect(bob)
        .removeLiquidity(_token0.address, _token1.address, 1000000, 0, 0, bob.address, 11571287987)
      // check bob tokens balance

      assert.equal(
        (await _token0.balanceOf(bob.address)).toNumber(),
        10014491,
        "Bob's token0 balance equal to 10014491"
      ) //  9000000 (balance) + 1014491 (remove liquid)
      assert.equal((await _token1.balanceOf(bob.address)).toNumber(), 9985750, "Bob's token1 balance equal to 9985750") // 9000000 (balance) + 985750 (remove liquid)
      assert.equal((await _soneToken.balanceOf(bob.address)).toNumber(), 5, "Bob's sone token balance equal to 5") // 3 (covert from token0-sone) + 2 (covert from token1-token0-sone)
    })

    it('return 2 tokens from convert', async () => {
      // Swap
      for (let index = 1; index < 30; index++) {
        await _token0.connect(alice).approve(_router.address, 1000)
        await _router
          .connect(alice)
          .swapExactTokensForTokens(1000, 0, [_token0.address, _token1.address], alice.address, 11571287987)
      }

      // Remove liquidity
      await _pair.connect(bob).approve(_router.address, 1000000)
      await _router
        .connect(bob)
        .removeLiquidity(_token0.address, _token1.address, 1000000, 0, 0, bob.address, 11571287987)
      // check bob tokens balance
      assert.equal((await _token0.balanceOf(bob.address)).valueOf(), 10014495, "Bob's token0 balance equal to 10014495") //  9000000 (balance) + 1014491 (remove liquid) + 4 (from convert)
      assert.equal((await _token1.balanceOf(bob.address)).valueOf(), 9985753, "Bob's token1 balance equal to 9985753") // 9000000 (balance) + 985750 (remove liquid) + 3 (from convert)
    })
  })
})
