import { ethers, network } from 'hardhat'
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

  const feeTo = process.env.FEE_TO_ADDRESS as string
  const sone = process.env.SONE_ADDRESS as string

  // We get the contract to deploy
  const multiSender = await ethers.getContractFactory('MutiSender')
  const contractAddress = await multiSender.deploy(feeTo, sone)

  // SONE-v2 contracts
  // const multiSenderFactory = await ethers.getContractFactory('MutiSenderV2')
  // const multiSender = await upgrades.upgradeProxy(contractAddress.address, multiSenderFactory)

  console.log('SONE multiple sender deployed to:', contractAddress.address)

  let isExistedSone = false
  tokenList = tokenList.map((value) => {
    if (value.symbol == 'MultiSender') {
      value.address = contractAddress.address
      isExistedSone = true
    }
    return value
  })

  if (!isExistedSone) {
    tokenList.push({
      decimals: 0,
      symbol: "",
      address: contractAddress.address,
      name: ""
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
