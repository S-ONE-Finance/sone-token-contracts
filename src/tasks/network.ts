import { task } from 'hardhat/config'

task('network:gas-price', 'Prints gas price', async function (_taskArgs, hre) {
  console.log('Gas price', (await hre.ethers.provider.getGasPrice()).toString())
})
