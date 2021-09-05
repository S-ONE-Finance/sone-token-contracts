import { task } from 'hardhat/config'
import { ERC20 } from 'src/types'

import { accountToSigner, tokenNameToAddress, getDecimalizedBalance } from 'src/tasks/utils'
import { BigNumber } from 'ethers'

task('account:list', 'Prints the list of accounts', async (_taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

task('account:balance', 'Get balance of an account')
  .addParam('account', `The account's address`)
  .setAction(async (taskArgs, hre) => {
    const signer = (await accountToSigner(hre, taskArgs.account))?.[0]
    const balance = await hre.ethers.provider.getBalance(signer.address)
    console.log(hre.ethers.utils.formatEther(balance.toString()))
  })

task('account:transfer', 'Get balance of an account')
  .addParam('from', `The from's address`)
  .addParam('to', `The receiver's address`)
  .addParam('amount', `Amount`)
  .setAction(async ({ from, to, amount }, hre) => {
    const [fromSigner, toSigner] = await accountToSigner(hre, from, to)
    await fromSigner.sendTransaction({
      to: toSigner.address,
      value: BigNumber.from(amount),
    })
  })
