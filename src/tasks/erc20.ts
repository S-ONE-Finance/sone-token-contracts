import { BigNumber } from 'ethers'
import { task, types } from 'hardhat/config'

import erc20 from 'src/abi/ERC-20.json'
import { ERC20, TetherToken, UniswapV2ERC20__factory, WETH9__factory, WETH9 } from 'src/types'

import {
  accountToSigner,
  getDecimalizedBalance,
  tokenNameToAddress,
  decimalize,
  getCommonTokens,
  tokenNameToToken,
} from 'src/tasks/utils'
import { int } from 'hardhat/internal/core/params/argumentTypes'

task('erc20:token-balance', 'Get token balance of an account')
  .addParam('tokenAddress', `The token address`)
  .addParam('account', `The account's address`)
  .addOptionalParam('tokenDecimals', `The token decimals`, 18, int)
  .setAction(async (taskArgs, hre) => {
    const [signer] = await accountToSigner(hre, taskArgs.account)
    const [token] = tokenNameToToken(hre, taskArgs.tokenAddress)

    const contract = new hre.ethers.Contract(token.address, erc20.abi, signer) as ERC20

    const balance = await getDecimalizedBalance(contract, token.decimals || taskArgs.tokenDecimals, signer.address)
    console.log('balance :>> ', balance.toString())
  })

task('erc20:approve', 'ERC20 approve')
  .addParam('from', 'From address')
  .addParam('token', 'Token')
  .addParam('spender', 'Spender')
  .addOptionalParam('amount', 'Approval amount', Number.MAX_SAFE_INTEGER.toString(), types.string)
  .setAction(async ({ from, token, spender, amount }, hre) => {
    const [fromSigner, spenderSigner] = await accountToSigner(hre, from, spender)
    const [tokenAddress] = tokenNameToAddress(hre, token)
    const tokenContract = UniswapV2ERC20__factory.connect(tokenAddress, fromSigner)
    await (
      await tokenContract.approve(spenderSigner.address, BigNumber.from(amount), {
        from: fromSigner.address,
      })
    ).wait()
  })

task('erc20:transfer-token', `Transfer a token from an account 'from' to another account 'to'`)
  .addParam('tokenAddress', `The contract address of a token: 'usdt', 'usdc', 'dai' or an token address`)
  .addParam('from', `The account is sender: 'owner', 'alice', 'bob' or an address`)
  .addParam('to', `The account is receiver: 'owner', 'alice', 'bob' or an address`)
  .addOptionalParam('tokenDecimals', `Token decimals`, 18, int)
  .setAction(async (taskArgs, hre) => {
    console.log(taskArgs)
    const [from, to] = await accountToSigner(hre, taskArgs.from, taskArgs.to)
    const [token] = tokenNameToToken(hre, taskArgs.tokenAddress)

    const contract = new hre.ethers.Contract(token.address, erc20.abi, from) as TetherToken
    console.log(`Calling token '${contract.address}' to tranfer from '${from.address}' to '${to.address}'`)

    const balance = await getDecimalizedBalance(
      contract as unknown as ERC20,
      token.decimals || taskArgs.tokenDecimals,
      from.address
    )
    console.log('spender balance :>> ', balance, 'tokens')

    const totalSupply = await contract.functions.totalSupply()
    console.log(
      'total supply :>> ',
      decimalize(Number(token.decimals || taskArgs.tokenDecimals), totalSupply?.[0]),
      'tokens'
    )

    await contract.functions.transfer(
      to.address,
      BigNumber.from('25000000').mul(BigNumber.from(10).pow(token.decimals || taskArgs.tokenDecimals)),
      { from: from.address }
    )
    const aliceBalance = await getDecimalizedBalance(
      contract as unknown as ERC20,
      token.decimals || taskArgs.tokenDecimals,
      to.address
    )
    console.log('receiver balance :>> ', aliceBalance, 'tokens')
  })

task('erc20:convert-eth-to-weth', 'Convert ETH to WETH')
  .addOptionalParam('account', `The account that provides ETH to deposit`, 'owner')
  .addOptionalParam('amount', 'ETH amount', '99999999999999999999999')
  .setAction(async ({ account, amount }, hre) => {
    const [signer] = await accountToSigner(hre, account)
    const [wethAddress] = tokenNameToAddress(hre, 'weth')
    let weth: WETH9 = WETH9__factory.connect(wethAddress, signer)
    ;(
      await weth.deposit({
        value: amount,
      })
    ).wait()

    console.log('WETH balance :>> ', (await weth.balanceOf(signer.address)).toString())
  })

task('erc20:get-common-tokens', 'Get common tokens such as: usdt, usdc, dai, sone, ect.').setAction(async ({}, hre) => {
  console.log('tokens :>> ', getCommonTokens(hre.network.name))
})
