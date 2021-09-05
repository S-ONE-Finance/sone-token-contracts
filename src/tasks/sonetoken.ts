import { task } from 'hardhat/config'
import { SoneToken__factory } from 'src/types'
import { accountToSigner, getSoneContracts, tokenNameToAddress } from 'src/tasks/utils'

task('sonetoken:mint', 'Mint SONE token')
  .addParam('amount', 'Amount token mint')
  .addParam('to', 'Address receive token: alice, bob, address account')
  .addParam('addressToken', 'Address SONE')
  .setAction(async ({ addressToken, amount, to }, hre) => {
    const [signer] = await accountToSigner(hre, 'owner')
    const [toAddress] = await accountToSigner(hre, to)
    const [soneAddress] = await tokenNameToAddress(hre, addressToken)

    const soneToken = SoneToken__factory.connect(soneAddress, signer)
    await soneToken.mint(toAddress.address, amount)
    console.log('amount :>> ', amount)
    console.log('to :>> ', to)
  })

task('erc20:get-sone-contracts', 'Get sone contracts: factory, router, masterFarmer').setAction(async ({}, hre) => {
  console.log('sone contracts :>> ', getSoneContracts(hre.network.name))
})
