# S-ONE Finance SONE token

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Multi-chain liquidity protocol for emerging token projects with no seed investment, founder’s fees, or pre-mining.

In-depth documentation on this SDK is available at [docs.s-one.finance](http://docs.s-one.finance/).

Feel free to read the code.

## SONE Token - A governance token of S-ONE Finance: 
- Mainnet address: [0xf5c771e0b749444eaec5c1f7ef5c0b93200bb0e4](https://etherscan.io/token/0xf5c771e0b749444eaec5c1f7ef5c0b93200bb0e4)
- Token Sale Announcement: https://s-one.finance/
- SONE token price: 0.3 USDT
- Accepted ETH, BTC, USDT, USDC, BUSD, Others.
- MIN amount: $500
- From May 10 to Aug 31 2021

## Running

To run the project, follow these steps. You must have at least node v10 and [yarn](https://yarnpkg.com/) installed.

First clone the repository:

```sh
git clone https://github.com/S-ONE-Finance/sone-token-contracts.git
```

Move into the sone-token-contracts working directory

```sh
cd sone-token-contracts
```

Install dependencies

```sh
yarn install
```

## Running Test

```sh
yarn test
```

You should see output like the following:

```sh
yarn test
yarn run v1.22.10
$ yarn truffle test
$ /Users/sone-token-contract/node_modules/.bin/truffle test
Using network 'test'.


Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.

  Contract: SoneToken V2
    #v2 mint
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint 1000 sone token by owner (68ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint 1000 sone token not by owner (340ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint over cap (52ms)
    # burn
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint 1000 & burn 200 (52ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint 1000 & burn 200 when not access
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint 1000 & burn 200 when owner burn (83ms)
    # lock
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ lock fail when allow transfer on not yet
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ lock fail when lock over balance (39ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint 1000 & lock 750 sone token by owner (112ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ mint 1000 & lock 750 sone token not by owner
    # white list
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ lock fail when user not in white list and allow transfer on not yet
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ lock ok when user in white list and allow transfer on not yet (113ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ lock fail when user was removed from whitelist by admin (198ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ lock fail when user was removed from whitelist by self (180ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ renounce whitelist fail when user was not in whitelist renounce whitelist (38ms)
    # allow transfer on
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ not transfer (39ms)
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ not set allowTransferOn
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ can transfer (98ms)
    # add fuction to V2
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ false white list
owner 0xf17f52151EbEF6C7334FAD080c5704D77216b732
      ✓ true white list (48ms)

  Contract: SoneToken
    # mint
      ✓ mint 1000 sone token by owner (53ms)
      ✓ mint 1000 sone token not by owner
      ✓ mint over cap
    # burn
      ✓ mint 1000 & burn 200 (54ms)
      ✓ mint 1000 & burn 200 when not access (48ms)
      ✓ mint 1000 & burn 200 when owner burn (89ms)
    # lock
      ✓ lock fail when allow transfer on not yet (40ms)
      ✓ lock fail when lock over balance (60ms)
      ✓ mint 1000 & lock 750 sone token by owner (140ms)
      ✓ mint 1000 & lock 750 sone token not by owner (40ms)
    # white list
      ✓ lock fail when user not in white list and allow transfer on not yet (59ms)
      ✓ lock ok when user in white list and allow transfer on not yet (133ms)
      ✓ lock fail when user was removed from whitelist by admin (212ms)
      ✓ lock fail when user was removed from whitelist by self (248ms)
      ✓ renounce whitelist fail when user was not in whitelist renounce whitelist (47ms)
    # allow transfer on
      ✓ not transfer
      ✓ not set allowTransferOn (67ms)
      ✓ can transfer (127ms)


  38 passing (14s)

✨  Done in 27.21s.
```