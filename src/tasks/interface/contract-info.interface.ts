export interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
}

export interface SoneContracts {
  factory: string
  router: string
  masterFarmer: string
}

export interface Contracts {
  tokens?: TokenInfo[]
  sone?: SoneContracts
}

export interface ContractData {
  private?: Contracts
  ganache?: Contracts
  ropsten?: Contracts
}
