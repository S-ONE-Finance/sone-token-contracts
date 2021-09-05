import { ethers, artifacts, waffle } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { CurrencyAmount, Token, TokenAmount, Pair, ChainId, JSBI } from '@s-one-finance/sdk-core'
import { assert } from 'chai'
import { BigNumberish } from '@ethersproject/bignumber'
import { WETH9, UniswapV2Factory, SoneSwapRouter, MockERC20, UniswapV2Pair, UniswapV2Pair__factory } from '~/types'

const { deployContract } = waffle

const MINIMUM_LIQUIDITY = 1000
const _BN = (str: string | number) => ethers.BigNumber.from(str)
function decimalize(amount: number, decimals: number): bigint {
  return BigInt(amount) * BigInt(10) ** BigInt(decimals)
}

describe('SoneSwapRouter - Add Liquidity', () => {
  let [owner, alice, bob]: SignerWithAddress[] = []
  let _weth: WETH9
  let _factory: UniswapV2Factory
  let _router: SoneSwapRouter
  let _token0: MockERC20
  let _token1: MockERC20
  let _pair: UniswapV2Pair

  beforeEach(async () => {
    ;[owner, alice, bob] = await ethers.getSigners()
    // Initialize contract instances
    _weth = (await deployContract(owner, await artifacts.readArtifact('WETH9'))) as WETH9
    _factory = (await deployContract(owner, await artifacts.readArtifact('UniswapV2Factory'), [
      owner.address,
    ])) as UniswapV2Factory
    _router = (await deployContract(owner, await artifacts.readArtifact('SoneSwapRouter'), [
      _factory.address,
      _weth.address,
    ])) as SoneSwapRouter
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
    // Transfer tokens to alice address
    await _token0.transfer(alice.address, '10000000')
    await _token1.transfer(alice.address, '10000000')

    // Approve allowance to spend alice's tokens for the _router
    await _token0.connect(alice).approve(_router.address, '7000000')
    await _token1.connect(alice).approve(_router.address, '7000000')
  })

  describe('# add liquidity with 2 tokens', async () => {
    it('to a new pool excluding ETH', async () => {
      await _factory.createPair(_token0.address, _token1.address)
      const pairAddress = await _factory.getPair(_token0.address, _token1.address)
      _pair = UniswapV2Pair__factory.connect(pairAddress, owner)
      let amountADesired: BigNumberish = _BN(1000000)
      let amountBDesired: BigNumberish = _BN(1000000)
      let amountAMin: BigNumberish = _BN(1000000)
      let amountBMin: BigNumberish = _BN(1000000)
      // Add liquidity to a new pool
      await _router
        .connect(alice)
        .addLiquidity(
          _token0.address,
          _token1.address,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          alice.address,
          11571287987
        )
      // Check reserves, total LP token and user's balance after adding at the first time
      assert.equal((await _pair.totalSupply()).toNumber(), 1000000, 'totalSupply equal to 1000000')
      assert.equal(
        (await _pair.balanceOf(alice.address)).toNumber(),
        1000000 - MINIMUM_LIQUIDITY,
        'user Balance equal to totalSupply - MINIMUM_LIQUIDITY'
      )
      const reserves = await _pair.getReserves()
      assert.equal(reserves[0].toNumber(), 1000000, 'reserves[0] equal to 1000000')
      assert.equal(reserves[1].toNumber(), 1000000, 'reserves[1] equal to 1000000')
    })

    it('to a existed pool excluding ETH', async () => {
      await _factory.createPair(_token0.address, _token1.address)
      const pairAddress = await _factory.getPair(_token0.address, _token1.address)
      _pair = UniswapV2Pair__factory.connect(pairAddress, owner)
      let amountADesired: BigNumberish = _BN(1500000)
      let amountBDesired: BigNumberish = _BN(1000000)
      let amountAMin: BigNumberish = _BN(1500000)
      let amountBMin: BigNumberish = _BN(1000000)

      // Add liquidity to a new pool
      await _router
        .connect(alice)
        .addLiquidity(
          _token0.address,
          _token1.address,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          alice.address,
          11571287987
        )

      // Check reserves and total LP token after adding at the first time
      const reservesBefore = await _pair.getReserves()
      const totalSupplyBefore = await _pair.totalSupply()
      if (_token1.address < _token0.address) {
        assert.equal(reservesBefore[1].toNumber(), 1500000, 'reservesBefore[1] equal to 1500000')
        assert.equal(reservesBefore[0].toNumber(), 1000000, 'reservesBefore[0] equal to 1000000')
      } else {
        assert.equal(reservesBefore[0].toNumber(), 1500000, 'reservesBefore[0] equal to 1500000')
        assert.equal(reservesBefore[1].toNumber(), 1000000, 'reservesBefore[1] equal to 1000000')
      }
      assert.equal(totalSupplyBefore.toNumber(), 1224744, 'totalSupplyBefore equal to 1224744')

      // Prepare parameters to add liquidity for the second time
      enum Tokens {
        CURRENCY_A = 'CURRENCY_A',
        CURRENCY_B = 'CURRENCY_B',
      }
      const tokens: Token[] = [
        new Token(
          ChainId.MAINNET,
          _token0.address,
          await _token0.decimals(),
          await _token0.symbol(),
          await _token0.name()
        ),
        new Token(
          ChainId.MAINNET,
          _token1.address,
          await _token1.decimals(),
          await _token1.symbol(),
          await _token1.name()
        ),
      ]
      const pair =
        _token1.address < _token0.address
          ? new Pair(
              new TokenAmount(tokens[0], reservesBefore[1].toString()),
              new TokenAmount(tokens[1], reservesBefore[0].toString())
            )
          : new Pair(
              new TokenAmount(tokens[0], reservesBefore[0].toString()),
              new TokenAmount(tokens[1], reservesBefore[1].toString())
            )

      const independentTokenAmount: TokenAmount = new TokenAmount(tokens[0], BigInt(1000000))
      const dependentTokenAmount: CurrencyAmount = pair
        .priceOf(tokens[0])
        .quote(new TokenAmount(tokens[0], independentTokenAmount.raw))
      const amounts: { [token in Tokens]: CurrencyAmount } = {
        [Tokens.CURRENCY_A]: independentTokenAmount,
        [Tokens.CURRENCY_B]: dependentTokenAmount,
      }

      const allowedSlippage = 100 // 1%
      const amountsMin = {
        [Tokens.CURRENCY_A]: calculateSlippageAmount(amounts.CURRENCY_A, allowedSlippage)[0],
        [Tokens.CURRENCY_B]: calculateSlippageAmount(amounts.CURRENCY_B, allowedSlippage)[0],
      }

      amountADesired = _BN(amounts.CURRENCY_A.raw.toString())
      amountBDesired = _BN(amounts.CURRENCY_B.raw.toString())
      amountAMin = _BN(amountsMin.CURRENCY_A.toString())
      amountBMin = _BN(amountsMin.CURRENCY_B.toString())

      // Add liquidity to a existed pool
      await _router
        .connect(alice)
        .addLiquidity(
          _token0.address,
          _token1.address,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          alice.address,
          11571287987
        )

      // Info after adding the second time
      const totalSupplyAfter = await _pair.totalSupply()
      const reservesAfter = await _pair.getReserves()

      const amountAActual =
        _token1.address < _token0.address
          ? _BN(reservesAfter[1].toString()).sub(_BN(reservesBefore[1].toString()))
          : _BN(reservesAfter[0].toString()).sub(_BN(reservesBefore[0].toString()))
      const amountBActual =
        _token1.address < _token0.address
          ? _BN(reservesAfter[0].toString()).sub(_BN(reservesBefore[0].toString()))
          : _BN(reservesAfter[1].toString()).sub(_BN(reservesBefore[1].toString()))
      const aliceLPBalance = await _pair.balanceOf(alice.address)

      // Check added amounts
      assert.isAtLeast(
        Number(amountAActual.toString()),
        Number(amountAMin.toString()),
        'amountAActual is greater or equal to amountAMin'
      )
      assert.isAtLeast(
        Number(amountBActual.toString()),
        Number(amountBMin.toString()),
        'amountBActual is greater or equal to amountBMin'
      )
      assert.isAtMost(
        Number(amountAActual.toString()),
        Number(amountADesired.toString()),
        'amountAActual is less than or equal to amountADesired'
      )
      assert.isAtMost(
        Number(amountBActual.toString()),
        Number(amountBDesired.toString()),
        'amountBActual is less than or equal to amountBDesired'
      )
      // Check reserves of the pool after adding liquidity second time
      if (_token1.address < _token0.address) {
        assert.equal(reservesAfter[1].toNumber(), 2500000, 'reservesAfter[1] equal to 2500000')
        assert.equal(reservesAfter[0].toNumber(), 1666666, 'reservesAfter[0] equal to 1666666')
      } else {
        assert.equal(reservesAfter[0].toNumber(), 2500000, 'reservesAfter[0] equal to 2500000')
        assert.equal(reservesAfter[1].toNumber(), 1666666, 'reservesAfter[1] equal to 1666666')
      }
      // Check total minted LP token of the pool and user's balance after adding liquidity second time
      assert.equal(totalSupplyAfter.toNumber(), 2041239, 'totalSupplyAfter equal to 2041239') // TO DO: explain minted LP token number
      assert.equal(
        aliceLPBalance.toNumber(),
        totalSupplyAfter.toNumber() - MINIMUM_LIQUIDITY,
        'aliceLPBalance equal to totalSupplyAfter - MINIMUM_LIQUIDITY'
      )
    })
    it('to a new pool including ETH', async () => {
      await _factory.createPair(_token0.address, _weth.address)
      const pairAddress = await _factory.getPair(_token0.address, _weth.address)
      _pair = UniswapV2Pair__factory.connect(pairAddress, owner)
      const balanceBeforeAdd = await ethers.provider.getBalance(alice.address)

      // Add liquidity to a new pool
      const txAddLiquidity = await _router
        .connect(alice)
        .addLiquidityETH(_token0.address, 1000000, 0, 0, alice.address, 11571287987, {
          value: '1000000',
        })
      const tx = await ethers.provider.getTransaction(txAddLiquidity.hash)
      const txReceipt = await ethers.provider.getTransactionReceipt(txAddLiquidity.hash)
      const fee = txReceipt.gasUsed.mul(_BN((tx.gasPrice as any).toString()))
      const balanceAfterAdd = await ethers.provider.getBalance(alice.address)
      const value = balanceBeforeAdd.sub(balanceAfterAdd).sub(fee)

      // Check amount eth spent
      assert.equal(value.toNumber(), 1000000, 'Value ETH spent to add liquidity equal to 1000000')
      // Check reserves, total LP token and user's balance after adding at the first time
      assert.equal((await _pair.totalSupply()).toNumber(), 1000000, 'totalSupply equal to 1000000')
      assert.equal(
        (await _pair.balanceOf(alice.address)).toNumber(),
        1000000 - MINIMUM_LIQUIDITY,
        'user lp token Balance equal to totalSupply - MINIMUM_LIQUIDITY'
      )
      const reserves = await _pair.getReserves()
      assert.equal(reserves[0].toNumber(), 1000000, 'reserves[0] equal to 1000000')
      assert.equal(reserves[1].toNumber(), 1000000, 'reserves[1] equal to 1000000')
    })

    it('to a existed pool including ETH', async () => {
      await _factory.createPair(_token0.address, _weth.address)
      const firstPairAddress = await _factory.getPair(_token0.address, _weth.address)
      _pair = UniswapV2Pair__factory.connect(firstPairAddress, owner)
      const balanceBeforeCreate = await ethers.provider.getBalance(alice.address)
      // Add liquidity to a new pool
      const firstAddLiquidity = await _router
        .connect(alice)
        .addLiquidityETH(_token0.address, 1000000, 0, 0, alice.address, 11571287987, {
          value: '1000000',
        })

      let tx = await ethers.provider.getTransaction(firstAddLiquidity.hash)
      let txReceipt = await ethers.provider.getTransactionReceipt(firstAddLiquidity.hash)
      let fee = txReceipt.gasUsed.mul(_BN((tx.gasPrice as any).toString()))
      const balanceAfterCreate = await ethers.provider.getBalance(alice.address)
      let value = balanceBeforeCreate.sub(balanceAfterCreate).sub(fee)
      const reservesBefore = await _pair.getReserves()
      const totalSupplyBefore = await _pair.totalSupply()
      // Check amount eth spent
      assert.equal(value.toNumber(), 1000000, 'Value ETH spent to add liquidity equal to 1000000')
      // Check reserves and total LP token after adding at the first time
      assert.equal(reservesBefore[0].toNumber(), 1000000, 'reservesBefore[0] equal to 1000000')
      assert.equal(reservesBefore[1].toNumber(), 1000000, 'reservesBefore[1] equal to 1000000')
      assert.equal(totalSupplyBefore.toNumber(), 1000000, 'totalSupplyBefore equal to 1000000')

      // Prepare parameters to add liquidity for the second time
      enum Tokens {
        CURRENCY_A = 'CURRENCY_A',
        CURRENCY_B = 'CURRENCY_B',
      }
      const tokens: Token[] = [
        new Token(
          ChainId.MAINNET,
          _token0.address,
          await _token0.decimals(),
          await _token0.symbol(),
          await _token0.name()
        ),
        new Token(ChainId.MAINNET, _weth.address, await _weth.decimals(), await _weth.symbol(), await _weth.name()),
      ]
      const pair = new Pair(
        new TokenAmount(tokens[0], reservesBefore[0].toString()),
        new TokenAmount(tokens[1], reservesBefore[1].toString())
      )

      const dependentTokenAmount = pair.priceOf(tokens[0]).quote(new TokenAmount(tokens[0], BigInt(1500000)))

      const amounts: { [token in Tokens]: CurrencyAmount } = {
        [Tokens.CURRENCY_A]: new TokenAmount(tokens[0], BigInt(1500000)),
        [Tokens.CURRENCY_B]: new TokenAmount(tokens[1], dependentTokenAmount.raw),
      }
      const allowedSlippage = 100 // 1%
      const amountsMin = {
        [Tokens.CURRENCY_A]: calculateSlippageAmount(amounts.CURRENCY_A, allowedSlippage)[0],
        [Tokens.CURRENCY_B]: calculateSlippageAmount(amounts.CURRENCY_B, allowedSlippage)[0],
      }

      let amountADesired = _BN(amounts.CURRENCY_A.numerator.toString())
      let amountBDesired = _BN(amounts.CURRENCY_B.numerator.toString())
      let amountAMin = _BN(amountsMin.CURRENCY_A.toString())
      let amountBMin = _BN(amountsMin.CURRENCY_B.toString())

      // Add liquidity to a existed pool
      const txAddLiquidity = await _router
        .connect(alice)
        .addLiquidityETH(_token0.address, amountADesired, amountAMin, amountBMin, alice.address, 11571287987, {
          value: '1500000',
        })

      // Info after adding the second time
      const reservesAfter = await _pair.getReserves()
      const amountAActual = _BN(reservesAfter[0].toString()).sub(_BN(reservesBefore[0].toString()))
      const amountBActual = _BN(reservesAfter[1].toString()).sub(_BN(reservesBefore[1].toString()))
      const aliceLPBalance = await _pair.balanceOf(alice.address)
      tx = await ethers.provider.getTransaction(txAddLiquidity.hash)
      txReceipt = await ethers.provider.getTransactionReceipt(txAddLiquidity.hash)
      fee = txReceipt.gasUsed.mul(_BN((tx.gasPrice as any).toString()))
      const balanceAfterAdd = await ethers.provider.getBalance(alice.address)
      // Check amount eth spent
      value = balanceAfterCreate.sub(balanceAfterAdd).sub(fee)
      assert.equal(value.toNumber(), 1500000, 'value eth spent to add liquidity equal to 1500000')
      // Check added amounts
      assert.isAtLeast(
        amountAActual.toNumber(),
        amountAMin.toNumber(),
        'amountAActual is greater or equal to amountAMin'
      )
      assert.isAtLeast(
        amountBActual.toNumber(),
        amountBMin.toNumber(),
        'amountAActual is greater or equal to amountAMin'
      )
      assert.isAtMost(
        amountAActual.toNumber(),
        amountADesired.toNumber(),
        'amountAActual is less than or equal to amountADesired'
      )
      assert.isAtMost(
        amountBActual.toNumber(),
        amountBDesired.toNumber(),
        'amountAActual is less than or equal to amountBDesired'
      )
      // Check total minted LP token of the pool and user's balance after adding liquidity second time
      assert.equal((await _pair.totalSupply()).toNumber(), 2500000, 'totalSupplyAfter equal to 2041239')
      assert.equal(
        aliceLPBalance.toNumber(),
        2500000 - MINIMUM_LIQUIDITY,
        'aliceLPBalance equal to totalSupplyAfter - MINIMUM_LIQUIDITY'
      )
      // Check reserves of the pool after adding liquidity second time
      assert.equal(reservesAfter[0].toNumber(), 2500000, 'reservesAfter[0] equal to 2500000')
      assert.equal(reservesAfter[1].toNumber(), 2500000, 'reservesAfter[1] equal to 2500000')
    })
  })

  describe('# add liquidity with 1 token', async () => {
    beforeEach(async () => {
      // Appove allowance to spend bob's tokens for the _router
      await _token0.connect(bob).approve(_router.address, '1000000')
      await _token1.connect(bob).approve(_router.address, '1000000')
    })

    it('to a existed pool excluding ETH', async () => {
      await _factory.createPair(_token0.address, _token1.address)
      const firstPairAddress = await _factory.getPair(_token0.address, _token1.address)
      _pair = UniswapV2Pair__factory.connect(firstPairAddress, owner)
      await _token0.transfer(bob.address, '10000000')
      // , { from: owner.address }
      // add liquidity to new pool
      await _router
        .connect(alice)
        .addLiquidity(_token0.address, _token1.address, 1000000, 1000000, 0, 0, alice.address, 11571287987)
      // prepare for add liquidity one mode
      enum Tokens {
        CURRENCY_A = 'CURRENCY_A',
        CURRENCY_B = 'CURRENCY_B',
      }
      const tokens: Token[] = [
        new Token(
          ChainId.MAINNET,
          _token0.address,
          await _token0.decimals(),
          await _token0.symbol(),
          await _token0.name()
        ),
        new Token(
          ChainId.MAINNET,
          _token1.address,
          await _token1.decimals(),
          await _token1.symbol(),
          await _token1.name()
        ),
      ]
      const reservesBefore = await _pair.getReserves()
      const pair = new Pair(
        new TokenAmount(tokens[0], reservesBefore[0].toString()),
        new TokenAmount(tokens[1], reservesBefore[1].toString())
      )
      const amountInput = BigInt('20000')
      const wrappedUserInputParsedAmount = new TokenAmount(tokens[0], amountInput)
      const allowedSlippage = 100 // 1%

      const [selectedTokenInputAmount, selectedAmountMin, theOtherAmountMin, theOtherOutputMin] =
        pair.getAmountsAddOneToken(wrappedUserInputParsedAmount, allowedSlippage)

      await _router
        .connect(bob)
        .addLiquidityOneToken(
          selectedTokenInputAmount.toString(),
          selectedAmountMin.toString(),
          theOtherAmountMin.toString(),
          theOtherOutputMin.toString(),
          [_token0.address, _token1.address],
          bob.address,
          11571287987
        )
      // check token balance of user
      assert.equal(
        (await _token0.balanceOf(bob.address)).toNumber(),
        10000000 - 20000,
        'bob token0 balance equal to 9980000'
      )
      assert.equal((await _token1.balanceOf(bob.address)).toNumber(), 68, 'bob token1 balance equal to 68') // swap -9871 add 9803
      // check total supply and lp token of user balance
      assert.equal((await _pair.totalSupply()).toNumber(), 1009900, 'total supply equal to 1009900')
      assert.equal((await _pair.balanceOf(bob.address)).toNumber(), 9900, 'lp token balance equal to 9900')
      // check reserves
      const reserves = await _pair.getReserves() // [_token1, _token0]
      if (_token1.address < _token0.address) {
        assert.equal(reserves[1].toNumber(), 1020000, 'reserves[1] equal to 1020000') // balance1 = 1000000(add 1)+10000(swap)+10000(add 2)
        assert.equal(reserves[0].toNumber(), 999932, 'reserves[0] equal to 999932') // balance0 = 1000000(add 1)-9871(swap)+9803(add 2)
      } else {
        assert.equal(reserves[0].toNumber(), 1020000, 'reserves[0] equal to 1020000') // balance0 = 1000000(add 1)+10000(swap)+10000(add 2)
        assert.equal(reserves[1].toNumber(), 999932, 'reserves[1] equal to 999932') // balance1 = 1000000(add 1)-9871(swap)+9803(add 2)
      }
    })

    it('to a existed pool including ETH', async () => {
      await _factory.createPair(_weth.address, _token0.address)
      const pairAddress = await _factory.getPair(_weth.address, _token0.address)
      _pair = UniswapV2Pair__factory.connect(pairAddress, owner)
      // get user eth balance
      const balanceBeforeAdd = await ethers.provider.getBalance(bob.address)
      // add liquidity to new pool
      await _router.connect(alice).addLiquidityETH(_token0.address, 1000000, 0, 0, alice.address, 11571287987, {
        value: '1000000',
      })
      // prepare for add liquidity one mode
      enum Tokens {
        CURRENCY_A = 'CURRENCY_A',
        CURRENCY_B = 'CURRENCY_B',
      }
      const tokens: Token[] = [
        new Token(ChainId.MAINNET, _weth.address, await _weth.decimals(), await _weth.symbol(), await _weth.name()),
        new Token(
          ChainId.MAINNET,
          _token0.address,
          await _token0.decimals(),
          await _token0.symbol(),
          await _token0.name()
        ),
      ]
      const reservesBefore = await _pair.getReserves()
      const pair =
        _weth.address < _token0.address
          ? new Pair(
              new TokenAmount(tokens[0], reservesBefore[0].toString()),
              new TokenAmount(tokens[1], reservesBefore[1].toString())
            )
          : new Pair(
              new TokenAmount(tokens[0], reservesBefore[1].toString()),
              new TokenAmount(tokens[1], reservesBefore[0].toString())
            )

      const amountInput = BigInt('20000')
      const wrappedUserInputParsedAmount = new TokenAmount(tokens[0], amountInput)
      const allowedSlippage = 100 // 1%

      const [selectedTokenInputAmount, selectedAmountMin, theOtherAmountMin, theOtherOutputMin] =
        pair.getAmountsAddOneToken(wrappedUserInputParsedAmount, allowedSlippage)

      const txAddLiquidity = await _router.connect(bob).addLiquidityOneTokenETHExactETH(
        theOtherAmountMin.toString(),
        selectedAmountMin.toString(), // ETH
        theOtherOutputMin.toString(),
        [_weth.address, _token0.address],
        bob.address,
        11571287987,
        {
          value: selectedTokenInputAmount.toString(),
        }
      )
      const tx = await ethers.provider.getTransaction(txAddLiquidity.hash)
      const txReceipt = await ethers.provider.getTransactionReceipt(txAddLiquidity.hash)
      const gasPrice = tx.gasPrice
      const fee = txReceipt.gasUsed.mul(_BN((tx.gasPrice as any).toString()))
      const balanceAfterAdd = await ethers.provider.getBalance(bob.address)

      // check user token0 balance
      assert.equal((await _token0.balanceOf(bob.address)).toNumber(), 68, 'bob token0 balance equal to 68')
      const value = balanceBeforeAdd.sub(balanceAfterAdd).sub(fee)
      // check amount eth spent for add liquidity
      assert.equal(value.toNumber(), 20000, 'amount ETH spent equal to 20000') // 10000(swap) + 10000 (add)
      // check total supply and user's lp token balance
      assert.equal((await _pair.totalSupply()).toNumber(), 1009900, 'totalSupply equal to 1009900')
      assert.equal((await _pair.balanceOf(bob.address)).toNumber(), 9900, 'bob lp token balance equal to 9900')

      // check reserves
      const reserves = await _pair.getReserves() // [_weth, _token0]
      if (_weth.address < _token0.address) {
        assert.equal(reserves[0].toNumber(), 1020000, 'reserves[0] equal to 1020000') // balanceWETH = 1000000(add 1)+10000(swap)+10000(add 2)
        assert.equal(reserves[1].toNumber(), 999932, 'reserves[1] equal to 999932') // balance0 = 1000000(add 1)-9871(swap)+9803(add 2)
      } else {
        assert.equal(reserves[1].toNumber(), 1020000, 'reserves[1] equal to 1020000') // balanceWETH = 1000000(add 1)+10000(swap)+10000(add 2)
        assert.equal(reserves[0].toNumber(), 999932, 'reserves[0] equal to 999932') // balance0 = 1000000(add 1)-9871(swap)+9803(add 2)
      }
    })
  })
})

function calculateSlippageAmount(value: CurrencyAmount, slippage: number): [JSBI, JSBI] {
  if (slippage < 0 || slippage > 10000) {
    throw Error(`Unexpected slippage value: ${slippage}`)
  }
  return [
    JSBI.divide(JSBI.multiply(value.raw, JSBI.BigInt(10000 - slippage)), JSBI.BigInt(10000)),
    JSBI.divide(JSBI.multiply(value.raw, JSBI.BigInt(10000 + slippage)), JSBI.BigInt(10000)),
  ]
}
