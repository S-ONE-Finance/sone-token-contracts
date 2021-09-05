import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ERC20 } from 'src/types'
import { contractData } from './data'
import { Contracts, TokenInfo, SoneContracts } from '../interface/contract-info.interface'

export const getDecimalizedBalance = async (contract: ERC20, decimal: number, address: string): Promise<string> => {
  const balance = await contract.balanceOf(address)
  return decimalize(decimal, balance)
}

export const decimalize = (decimal: number, value: BigNumber): string => {
  return value.div(BigNumber.from('10').pow(decimal)).toString()
}

export const multiplize = (decimal: number, value: BigNumber): string => {
  return BigNumber.from(value).mul(BigNumber.from('10').pow(decimal)).toString()
}

export const accountToSigner = async (
  hre: HardhatRuntimeEnvironment,
  ...names: string[]
): Promise<SignerWithAddress[]> => {
  console.log('Get address of accounts', names)
  const accounts = await hre.ethers.getSigners()

  let addresses: SignerWithAddress[] = []
  for (var name of names) {
    if (name === 'owner') {
      addresses.push(accounts[0])
    } else if (name === 'alice') {
      addresses.push(accounts[1])
    } else if (name === 'bob') {
      addresses.push(accounts[2])
    } else if (name === 'alice2') {
      addresses.push(accounts[3])
    } else if (name === 'bob2') {
      addresses.push(accounts[4])
    } else {
      addresses.push(await hre.ethers.getSigner(name))
    }
  }
  console.log(
    '-> account addresses :>> ',
    addresses.map((value) => value.address)
  )
  return addresses
}

export const getContracts = (network: string): Contracts => {
  return Object.getOwnPropertyDescriptor(contractData, network)?.value
}

export const tokenNameToToken = (hre: HardhatRuntimeEnvironment, ...tokenNames: string[]): TokenInfo[] => {
  let tokens: TokenInfo[] = []
  console.log('Get contract of token names', tokenNames)

  const commonTokens: TokenInfo[] = getCommonTokens(hre.network.name)
  for (const name of tokenNames) {
    const token: TokenInfo | undefined = commonTokens.find((token) => token.symbol.toLowerCase() == name.toLowerCase())
    token && tokens.push(token)
  }
  console.log('-> tokens :>> ', tokens)
  return tokens
}

export const tokenNameToAddress = (hre: HardhatRuntimeEnvironment, ...tokenNames: string[]): string[] => {
  let addresses: string[] = []
  console.log('Get contract address of token names', tokenNames)

  const tokens: TokenInfo[] = getCommonTokens(hre.network.name)
  for (const name of tokenNames) {
    const address = tokens.find((token) => token.symbol.toLowerCase() == name.toLowerCase())?.address
    addresses.push(address || name)
  }
  console.log('-> token addresses :>> ', addresses)
  return addresses
}

export const getCommonTokens = (network: string): TokenInfo[] => {
  const contracts: Contracts = getContracts(network)
  return contracts.tokens || []
}

export const getSoneContracts = (network: string): SoneContracts | null => {
  const contracts: Contracts = getContracts(network)
  return contracts.sone || null
}
