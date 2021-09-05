import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import { HardhatUserConfig } from 'hardhat/config'
import '@openzeppelin/hardhat-upgrades'
import dotenv from 'dotenv'
import 'tsconfig-paths/register' // This adds support for typescript paths mappings

import './src/tasks'

dotenv.config()

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  // Your type-safe config goes here
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    localhost: {
      url: `http://localhost:8545`,
      allowUnlimitedContractSize: false,
    },
    private: {
      url: `https://private-net.s-one.finance`,
      accounts: [
        process.env.PRIVATE_OPERATOR_PRIVATE_KEY as string, // 0x00a329c0648769a73afac7f9381e08fb43dbea72
        '0xcadbe0586fb7b800b1d94d5b5ca5c7765419adbad1f5a21c94f36023112b3e85', // 0xA7BCcC846555518cB6Ac0bA8033BE10503fE0183
        '0x9811566962d584d506458555d88616c7c3e8e0365332bd6a543f9c37209efa19', // 0x967Fb7477e278b4C41269cF8149fa1e1CFa49Bcb
      ],
      gasPrice: 'auto',
    },
    ganache: {
      url: `https://ganache.s-one.finance`,
      accounts: [
        '0x4b07975545d12e8c92baa5bde272e3504c37944f1385858e1cc8be62d97dec05', // 0xA449f05246309aFEeCBef656AB1Edee5eeAffD17
        '0xcadbe0586fb7b800b1d94d5b5ca5c7765419adbad1f5a21c94f36023112b3e85', // 0xA7BCcC846555518cB6Ac0bA8033BE10503fE0183
        '0x9811566962d584d506458555d88616c7c3e8e0365332bd6a543f9c37209efa19', // 0x967Fb7477e278b4C41269cF8149fa1e1CFa49Bcb
        '0x64bcb369e824a9bc2495201e8883829457beea84e6d37efb43cfcea6925000c6', // 0x3Fd7073374F66b5d392DcfECa3630f9584771F94
        '0xfc4959f673da9e85fd3dc40dd9b3fd3906b7d9411bfd485d6b62179ab49b0614', // 0x81592b817047A0017b8DFbe7BE392BBa9Dad2063
        '0xd4aa415ce71135277086bc3a15e2995bd3397c385cdb5a3d5ce4ced7f74701eb', // 0x8B4e6F629B4Ead3989f7C015209A4d7166B03DA4
        '0x5047452f0ede0a486848713f3e72ef34285c78b50b38b80f4427e616a5b16f7a', // 0xd8c555B8c02c875063f82eE329F2604E50794BB0
      ],
      gasPrice: 'auto',
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [
        process.env.OPERATOR_PRIVATE_KEY as string
      ]
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [
        process.env.OPERATOR_PRIVATE_KEY as string
      ],
      gasPrice: Number.parseInt(process.env.GAS_PRICE as string),
      gas: Number.parseInt(process.env.GAS_LIMIT as string),
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [
        process.env.OPERATOR_PRIVATE_KEY as string
      ]
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    },
    bsc_testnet: {
      url: `https://data-seed-prebsc-1-s3.binance.org:8545`,
      chainId: 97,
      accounts: [
        process.env.OPERATOR_PRIVATE_KEY as string
      ]
    },
    bsc: {
      url: `https://bsc-dataseed.binance.org/`,
      chainId: 56,
      accounts: [
        process.env.OPERATOR_PRIVATE_KEY as string
      ]
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.4.17',
      },
      {
        version: '0.5.16',
      },
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.7',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5',
    alwaysGenerateOverloads: true, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    // externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  },
  paths: {
    root: './src',
    cache: '../cache',
    artifacts: '../artifacts',
  },
}

export default config
