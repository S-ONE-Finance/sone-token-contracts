import { ethers, upgrades, network } from 'hardhat'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

import { TokenInfo } from 'src/tasks/interface/contract-info.interface'

async function main() {
  const DEPLOYMENT_PATH = resolve('src/deployments')
  const DATA_PATH = resolve(DEPLOYMENT_PATH, 'data')
  const TOKEN_PATH = resolve(DATA_PATH, `tokens.${network.name}.json`)

  if (!existsSync(DATA_PATH)) {
    mkdirSync(DATA_PATH)
  }

  let tokenList: TokenInfo[] = existsSync(TOKEN_PATH) ? JSON.parse(readFileSync(TOKEN_PATH).toString()) : []

  // We get the contract to deploy
  const SONE = await ethers.getContractFactory('SoneToken')
  const sone = await upgrades.deployProxy(SONE, [1, 1000], {
    initializer: '__SoneToken_init',
  })

  // SONE-v2 contracts
  // const SONEv2 = await ethers.getContractFactory('SoneTokenv2')
  // const soneV2 = await upgrades.upgradeProxy(sone.address, SONEv2)

  console.log('SONE deployed to:', sone.address)

  let isExistedSone = false
  tokenList = tokenList.map((value) => {
    if (value.symbol == 'SONE') {
      value.address = sone.address
      isExistedSone = true
    }
    return value
  })

  if (!isExistedSone) {
    tokenList.push({
      address: sone.address,
      decimals: await sone.decimals(),
      name: await sone.name(),
      symbol: await sone.symbol(),
    })
  }

  writeFileSync(TOKEN_PATH, JSON.stringify(tokenList, null, 2))
  console.log(`Wrote data to file ${TOKEN_PATH}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
