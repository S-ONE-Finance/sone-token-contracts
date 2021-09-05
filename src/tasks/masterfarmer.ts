import { ethers } from 'ethers'
import { task } from 'hardhat/config'
import { accountToSigner } from 'src/tasks/utils'
import { SoneMasterFarmer__factory } from 'src/types'

task('masterfarmer:add-pool', 'Add a pool')
  .addParam('masterfarmerAddress', 'Masterfarmer address')
  .addParam('pairAddress', 'Pair address')
  .addParam('allocPoint', 'Alloc point')
  .addParam('withUpdate', 'Update pool')
  .setAction(async ({ masterfarmerAddress, pairAddress, allocPoint, withUpdate }, hre) => {
    const [signer] = await accountToSigner(hre, 'owner')
    const masterfarmer = SoneMasterFarmer__factory.connect(masterfarmerAddress, signer)
    const updatePool = withUpdate == 'true' ? true : false
    await masterfarmer.add(allocPoint, pairAddress, updatePool)
    console.log('masterfarmerAddress :>> ', masterfarmerAddress)
    console.log('pairAddress :>> ', pairAddress)
    console.log('allocPoint :>> ', allocPoint)
  })

task('masterfarmer:get-pool-length', 'Get pool length')
  .addParam('masterfarmerAddress', 'Masterfarmer address')
  .setAction(async ({ masterfarmerAddress }, hre) => {
    const [signer] = await accountToSigner(hre, 'owner')
    const masterfarmer = SoneMasterFarmer__factory.connect(masterfarmerAddress, signer)
    const poolLength = await masterfarmer.poolLength()
    console.log('masterfarmerAddress :>> ', masterfarmerAddress)
    console.log('poolLength :>> ', poolLength.toNumber())
  })
