import BN from 'bn.js'
import { ethers, waffle, artifacts } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { assert } from 'chai'
import { Pair } from '@s-one-finance/sdk-core'
import { WETH9, UniswapV2Factory, SoneSwapRouter, MockERC20, UniswapV2Pair, UniswapV2Pair__factory } from '~/types'

const _BN = (str: string | number) => new BN(str)
const { deployContract } = waffle

function getAmountOut(amountIn: BN, reserveIn: BN, reserveOut: BN, swapFee: BN) {
  var amountInWithFee = amountIn.mul(_BN(1000).sub(swapFee))
  var numerator = amountInWithFee.mul(reserveOut)
  var denominator = reserveIn.mul(_BN(1000)).add(amountInWithFee)
  return numerator.div(denominator)
}
function getAmountIn(amountOut: BN, reserveIn: BN, reserveOut: BN, swapFee: BN) {
  var numerator = reserveIn.mul(amountOut).mul(_BN(1000))
  var denominator = reserveOut.sub(amountOut).mul(_BN(1000).sub(swapFee))
  return numerator.div(denominator).add(_BN(1))
}

describe('swap', () => {
  let [owner, alice, bob]: SignerWithAddress[] = []
  let _weth: WETH9
  let _factory: UniswapV2Factory
  let _router: SoneSwapRouter
  let _token0: MockERC20
  let _token1: MockERC20
  let _pair: UniswapV2Pair
  let _swapFee: BN

  beforeEach(async () => {
    // Initialize contract instances
    ;[owner, alice, bob] = await ethers.getSigners()
    _factory = (await deployContract(alice, await artifacts.readArtifact('UniswapV2Factory'), [
      alice.address,
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
    await _factory.createPair(_token0.address, _token1.address)
    const pairAddress = await _factory.getPair(_token0.address, _token1.address)
    _pair = UniswapV2Pair__factory.connect(pairAddress, owner)
    _weth = (await deployContract(owner, await artifacts.readArtifact('WETH9'))) as WETH9
    _router = (await deployContract(owner, await artifacts.readArtifact('SoneSwapRouter'), [
      _factory.address,
      _weth.address,
    ])) as SoneSwapRouter

    // add liquidity
    _swapFee = _BN((await _factory.swapFee()).toString())
    // Transfer tokens to alice address
    await _token0.connect(alice).transfer(_pair.address, '1000000')
    await _token1.connect(alice).transfer(_pair.address, '1000000')
    await _pair.connect(alice).mint(alice.address)
  })

  describe('#swap 2 token', async () => {
    it('swap exact token1', async () => {
      // init token0 for bob
      await _token0.mint(bob.address, 1000000)
      // check bob's token0 balance
      assert.equal((await _token0.balanceOf(bob.address)).valueOf(), 1000000, 'bob token0 balance equal to 1000000')

      const amountOut = getAmountOut(_BN(1000), _BN(1000000), _BN(1000000), _swapFee)
      // check amount out
      assert.equal(amountOut.toNumber(), 996, 'amountOut equal to 996') // 996.006981
      // approve for router to spend bob's token0
      await _token0.connect(bob).approve(_router.address, 1000)
      // swap
      await _router
        .connect(bob)
        .swapExactTokensForTokens(1000, 0, [_token0.address, _token1.address], bob.address, 11571287987)
      // check bob balance of token0 and token1
      assert.equal((await _token0.balanceOf(bob.address)).toNumber(), 999000, "bob's token0 balance equal to 999000")
      assert.equal(
        (await _token1.balanceOf(bob.address)).valueOf(),
        amountOut.toString(),
        "bob's token1 balance equal to amountOut"
      )

      // check reserves
      const reserves = await _pair.getReserves()
      if (_token0.address < _token1.address) {
        assert.equal(reserves[0].toNumber(), 1001000, 'reserves[0] equal to 1001000')
        assert.equal(
          reserves[1].valueOf(),
          _BN(1000000).sub(amountOut).toString(),
          'reserves[1] equal to 1000000 - amountOut'
        )
      } else {
        assert.equal(reserves[1].toNumber(), 1001000, 'reserves[1] equal to 1001000')
        assert.equal(
          reserves[0].valueOf(),
          _BN(1000000).sub(amountOut).toString(),
          'reserves[0] equal to 1000000 - amountOut'
        )
      }
    })
    it('swap exact token2', async () => {
      // mint token0 for bob
      await _token0.mint(bob.address, 1000000)
      // check bob token0 balance
      assert.equal((await _token0.balanceOf(bob.address)).toNumber(), 1000000, 'bob token0 balance equal to 1000000')

      const amountIn = getAmountIn(_BN(1000), _BN(1000000), _BN(1000000), _swapFee)
      // check amount in
      assert.equal(amountIn.toNumber(), 1005, 'amountIn equal to 1005') // 1005.01304
      // Appove allowance to spend bob's tokens for the _router
      await _token0.connect(bob).approve(_router.address, 1000000)
      // swap token0 and token1
      await _router
        .connect(bob)
        .swapTokensForExactTokens(1000, 1000000, [_token0.address, _token1.address], bob.address, 11571287987)
      assert.equal(
        (await _token0.balanceOf(bob.address)).valueOf(),
        _BN(1000000).sub(amountIn).toString(),
        'bob token0 balance equal to 1000000 - amountIn'
      )
      assert.equal((await _token1.balanceOf(bob.address)).toNumber(), 1000, 'bob token1 balance equal to 1000')

      // check reserves
      const reserves = await _pair.getReserves()
      if (_token0.address < _token1.address) {
        assert.equal(
          reserves[0].valueOf(),
          _BN(1000000).add(amountIn).toString(),
          'reserves[0] equal to 1000000 + amountIn'
        )
        assert.equal(reserves[1].valueOf(), 999000, 'reserves[1] equal to 999000')
      } else {
        assert.equal(
          reserves[1].valueOf(),
          _BN(1000000).add(amountIn).toString(),
          'reserves[1] equal to 1000000 + amountIn'
        )
        assert.equal(reserves[0].valueOf(), 999000, 'reserves[0] equal to 999000')
      }
    })
  })
})
