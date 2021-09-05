import { task, types } from 'hardhat/config'

import { accountToSigner, getSoneContracts, tokenNameToAddress } from 'src/tasks/utils'

import { UniswapV2Factory__factory, UniswapV2Pair__factory } from 'src/types'

task('factory:create-pair', 'Get pair info')
  .addParam('token0', 'Token 0 address')
  .addParam('token1', 'Token 1 address')
  .addOptionalParam('pairAddress', 'Pair address')
  .setAction(async ({ token0, token1 }, hre) => {
    const [signer] = await accountToSigner(hre, 'owner')
    const soneContracts = getSoneContracts(hre.network.name)
    const factory = UniswapV2Factory__factory.connect(soneContracts?.factory as string, signer)

    const [token0Address, token1Address] = tokenNameToAddress(hre, token0, token1)
    await (await factory.createPair(token0Address, token1Address)).wait()

    const pairAddress = await factory.getPair(token0Address, token1Address)
    const pair = UniswapV2Pair__factory.connect(pairAddress, signer)

    console.log('pair :>> ', pair.address)
    console.log('token0 :>> ', await pair.token0())
    console.log('token1 :>> ', await pair.token1())
  })

task('factory:get-pair', 'Get pair info')
  .addParam('token0', 'Token 0 address')
  .addParam('token1', 'Token 1 address')
  .addOptionalParam('pairAddress', 'Pair address')
  .setAction(async ({ token0, token1 }, hre) => {
    const [signer] = await accountToSigner(hre, 'owner')
    const soneContracts = getSoneContracts(hre.network.name)
    const factory = UniswapV2Factory__factory.connect(soneContracts?.factory as string, signer)

    const [token0Address, token1Address] = tokenNameToAddress(hre, token0, token1)
    const pairAddress = await factory.getPair(token0Address, token1Address)
    const pair = UniswapV2Pair__factory.connect(pairAddress, signer)

    console.log('pair :>> ', pair.address.toLowerCase())
    console.log(
      `${(await pair.token0()) == token0Address ? `token0 ` + token0 : `token1 ` + token1} reserve :>> `,
      (await pair.getReserves())?.[0].toString()
    )
    console.log(
      `${(await pair.token0()) == token0Address ? `token1 ` + token1 : `token0 ` + token0} reserve :>> `,
      (await pair.getReserves())?.[1].toString()
    )
  })
