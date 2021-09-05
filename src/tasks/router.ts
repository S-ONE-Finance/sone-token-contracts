import { task, types } from 'hardhat/config'
import { Pair, TokenAmount, Token, ChainId } from '@s-one-finance/sdk-core'

import { accountToSigner, multiplize, getSoneContracts, tokenNameToAddress, tokenNameToToken } from 'src/tasks/utils'

import {
  SoneSwapRouter,
  SoneSwapRouter__factory,
  UniswapV2Factory,
  UniswapV2Pair__factory,
  TetherToken__factory,
  WETH9__factory,
  WETH9,
  UniswapV2ERC20__factory,
} from 'src/types'
import { BigNumber, utils } from 'ethers'
import { int } from 'hardhat/internal/core/params/argumentTypes'

task('router:add-liquidity', 'Router add liquidity')
  .addParam('selectedToken', `Token A address: 'usdt', 'usdc', 'dai', 'sone' or another token address`)
  .addParam('theOtherToken', `Token B address: 'usdt', 'usdc', 'dai', 'sone' or another token address`)
  .addParam('selectedTokenDesired', 'Token A Desired')
  .addParam('theOtherTokenDesired', 'Token B Desired')
  .addParam('selectedTokenMinimum', 'Token A Minimum')
  .addParam('theOtherTokenMinimum', 'Token B Minimum')
  .addParam('to', `To: 'owner', 'alice', 'bob' or another address`)
  .addOptionalParam('selectedTokenDecimals', `Selected token decimals`, 18, int)
  .addOptionalParam('theOtherTokenDecimals', `The other token decimals`, 18, int)
  .addOptionalParam('deadline', 'transaction deadline', Number.MAX_SAFE_INTEGER.toString(), types.string)
  .setAction(
    async (
      {
        selectedToken,
        theOtherToken,
        selectedTokenDesired,
        theOtherTokenDesired,
        selectedTokenMinimum,
        theOtherTokenMinimum,
        to,
        selectedTokenDecimals,
        theOtherTokenDecimals,
        deadline,
      },
      hre
    ) => {
      const [senderSigner, toSigner] = await accountToSigner(hre, 'owner', to)
      const [selectedTokenInfo, theOtherTokenInfo] = tokenNameToToken(hre, selectedToken, theOtherToken)

      const soneContracts = getSoneContracts(hre.network.name)
      const router = SoneSwapRouter__factory.connect(soneContracts?.router as string, senderSigner)

      const mutiplizedSelectedTokenDesired = utils.parseUnits(selectedTokenDesired, selectedTokenInfo.decimals || selectedTokenDecimals).toString()
      const mutiplizedTheOtherTokenDesired = utils.parseUnits(theOtherTokenDesired, theOtherTokenInfo.decimals || theOtherTokenDecimals).toString()
      const mutiplizedSelectedTokenMinimum = utils.parseUnits(selectedTokenMinimum, selectedTokenInfo.decimals || selectedTokenDecimals).toString()
      const mutiplizedTheOtherTokenMinimum = utils.parseUnits(theOtherTokenMinimum, theOtherTokenInfo.decimals || theOtherTokenDecimals).toString()

      await hre.run('erc20:approve', {
        token: selectedTokenInfo.address,
        from: senderSigner.address,
        spender: router.address,
        amount: mutiplizedSelectedTokenDesired,
      })
      await hre.run('erc20:approve', {
        token: theOtherTokenInfo.address,
        from: senderSigner.address,
        spender: router.address,
        amount: mutiplizedTheOtherTokenDesired,
      })

      console.log('selectedTokenAddress :>> ', selectedTokenInfo.address)
      console.log('theOtherTokenAddress :>> ', theOtherTokenInfo.address)
      console.log('selectedTokenDesired :>> ', mutiplizedSelectedTokenDesired)
      console.log('theOtherTokenDesired :>> ', mutiplizedTheOtherTokenDesired)

      console.log(
        'selected balance :>> ',
        (
          await UniswapV2ERC20__factory.connect(selectedTokenInfo.address, senderSigner).balanceOf(senderSigner.address)
        ).toString()
      )
      console.log(
        'theOther balance :>> ',
        (
          await UniswapV2ERC20__factory.connect(theOtherTokenInfo.address, senderSigner).balanceOf(senderSigner.address)
        ).toString()
      )
      console.log('selectedTokenMinimum :>> ', mutiplizedTheOtherTokenMinimum)
      console.log('theOtherTokenMinimum :>> ', mutiplizedTheOtherTokenMinimum)
      console.log('toSigner.address :>> ', toSigner.address)
      console.log('deadline :>> ', deadline)

      await (
        await router.addLiquidity(
          selectedTokenInfo.address,
          theOtherTokenInfo.address,
          mutiplizedSelectedTokenDesired,
          mutiplizedTheOtherTokenDesired,
          mutiplizedSelectedTokenMinimum,
          mutiplizedTheOtherTokenMinimum,
          toSigner.address,
          deadline,
          {
            gasLimit: process.env.GAS_LIMIT,
          }
        )
      ).wait()
    }
  )

// task('router:add-liquidity-eth', 'Router add liquidity eth')
//   .addParam('token', 'Token')
//   .addParam('tokenDesired', 'Token Desired')
//   .addParam('tokenMinimum', 'Token Minimum')
//   .addParam('ethMinimum', 'ETH Minimum')
//   .addParam('to', 'To')
//   .addOptionalParam('deadline', 'transaction deadline', Number.MAX_SAFE_INTEGER.toString(), types.string)
//   .setAction(async ({ token, tokenDesired, tokenMinimum, ethMinimum, to, deadline }, hre) => {
//     const [senderSigner, toSigner] = await accountToSigner(hre, 'owner', to)
//     const [tokenAddress] = tokenNameToAddress(hre, token)
//     const soneContracts = getSoneContracts(hre.network.name)
//     let weth: WETH9 = WETH9__factory.connect('', senderSigner)
//     const router = SoneSwapRouter__factory.connect(soneContracts?.router as string, senderSigner)
//     console.log('soneContracts?.router :>> ', await router.factory())

//     await hre.run('erc20:approve', {
//       token: tokenAddress,
//       from: senderSigner.address,
//       spender: router.address,
//     })

//     console.log('tokenAddress :>> ', await router.WETH())
//     console.log('deadline :>> ', deadline)

//     await (
//       await router.addLiquidityETH(tokenAddress, tokenDesired, tokenMinimum, ethMinimum, to, 11571287987, {
//         value: '10000000000000000000',
//         from: senderSigner.address,
//       })
//     ).wait()
//   })

task('router:swap', 'Router swap')
  .addParam('selectedToken', 'Selected token')
  .addParam('theOtherToken', 'The other token')
  .addParam('inputAmount', 'Input amount')
  .addParam('to', 'To')
  .addOptionalParam('selectedTokenDecimals', `Selected token decimals`, 18, int)
  .addOptionalParam('theOtherTokenDecimals', `The other token decimals`, 18, int)
  .addOptionalParam('deadline', 'transaction deadline', Number.MAX_SAFE_INTEGER.toString(), types.string)
  .setAction(
    async (
      { selectedToken, theOtherToken, inputAmount, to, selectedTokenDecimals, theOtherTokenDecimals, deadline },
      hre
    ) => {
      const [signer, toSigner] = await accountToSigner(hre, 'owner', to)
      const soneContracts = getSoneContracts(hre.network.name)
      const factory = (await hre.ethers.getContractAt(
        'UniswapV2Factory',
        soneContracts?.factory as string
      )) as UniswapV2Factory
      const router = (await hre.ethers.getContractAt(
        'SoneSwapRouter',
        soneContracts?.router as string
      )) as SoneSwapRouter
      const [selectedTokenInfo, theOtherTokenInfo] = tokenNameToToken(hre, selectedToken, theOtherToken)
      // const [selectedTokenAddress, theOtherTokenAddress] = tokenNameToAddress(hre, selectedToken, theOtherToken)

      const pairAddress = await factory.getPair(selectedTokenInfo.address, theOtherTokenInfo.address)
      const _pair = UniswapV2Pair__factory.connect(pairAddress, signer)
      const reservesBefore = await _pair.getReserves()

      const _selectedTokenContract = TetherToken__factory.connect(selectedTokenInfo.address, signer)
      const _theOtherTokenContract = TetherToken__factory.connect(theOtherTokenInfo.address, signer)

      const [_selectedToken, _theOtherToken]: Token[] = [
        new Token(
          ChainId.MAINNET,
          selectedTokenInfo.address,
          (await _selectedTokenContract.decimals()).toNumber(),
          await _selectedTokenContract.symbol(),
          await _selectedTokenContract.name()
        ),
        new Token(
          ChainId.MAINNET,
          _theOtherTokenContract.address,
          (await _theOtherTokenContract.decimals()).toNumber(),
          await _theOtherTokenContract.symbol(),
          await _theOtherTokenContract.name()
        ),
      ]

      const pair = new Pair(
        new TokenAmount(_selectedToken, reservesBefore[0].toString()),
        new TokenAmount(_theOtherToken, reservesBefore[1].toString())
      )

      const mutiplizedInputAmount = utils.parseUnits(inputAmount, selectedTokenInfo.decimals).toString()
      const inputTokenAmount = new TokenAmount(
        pair.token0.address == _selectedToken.address ? _selectedToken : _theOtherToken,
        mutiplizedInputAmount
      )

      const [amountOut] = pair.getOutputAmount(inputTokenAmount)

      console.log('amountOut :>> ', amountOut.raw.toString())

      await hre.run('erc20:approve', {
        token: selectedTokenInfo.address,
        from: signer.address,
        spender: router.address,
        amount: mutiplizedInputAmount,
      })
      await (
        await router.swapTokensForExactTokens(
          amountOut.raw.toString(),
          mutiplizedInputAmount,
          [selectedTokenInfo.address, theOtherTokenInfo.address],
          toSigner.address,
          deadline
        )
      ).wait()
    }
  )
