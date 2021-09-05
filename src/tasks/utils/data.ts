import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { format } from 'util'

import { ContractData, TokenInfo, SoneContracts } from '../interface/contract-info.interface'

const DEPLOYMENT_PATH = resolve('src/deployments')
const TOKEN_PATH = resolve(DEPLOYMENT_PATH, 'data', `tokens.%s.json`)
const SONE_PATH = resolve(DEPLOYMENT_PATH, 'data', `sone-defi.%s.json`)

function getTokens(path: string): TokenInfo[] {
  return existsSync(path) ? JSON.parse(readFileSync(path).toString()) : []
}
function getSoneContracts(path: string): SoneContracts {
  return existsSync(path) ? JSON.parse(readFileSync(path).toString()) : {}
}

var privateTokens: TokenInfo[] = getTokens(format(TOKEN_PATH, 'private'))
var ganacheTokens: TokenInfo[] = getTokens(format(TOKEN_PATH, 'ganache'))
var ropstenTokens: TokenInfo[] = getTokens(format(TOKEN_PATH, 'ropsten'))

var privateSone: SoneContracts = getSoneContracts(format(SONE_PATH, 'private'))
var ganacheSone: SoneContracts = getSoneContracts(format(SONE_PATH, 'ganache'))
var ropstenSone: SoneContracts = getSoneContracts(format(SONE_PATH, 'ropsten'))

export const contractData: ContractData = {
  private: {
    tokens: privateTokens,
    sone: privateSone,
  },
  ganache: {
    tokens: ganacheTokens,
    sone: ganacheSone,
  },
  ropsten: {
    tokens: ropstenTokens,
    sone: ropstenSone,
  },
}
