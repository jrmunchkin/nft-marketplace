# NFT Marketplace contract (SOLIDITY)

**This is the SOLIDITY version of the repository, you also can find a [VYPER version](https://github.com/jrmunchkin/nft-marketplace-vyper)**

This is a repository to work with and create a NFT Marketplace in a javascript environment using hardhat.
This is a backend repository, it also work with a [frontend repository](https://github.com/jrmunchkin/nft-marketplace-front-end). However you absolutly can use this repository without the frontend part.

## Summary

### NFT Marketplace

The NFT Marketplace contract creates a NFT marketplace where any NFT collection can be listed or bought
Every user can withdraw the ETH from the NFT they sold.

The NFT Marketplace allow you to :

- `listNft`: List a NFT on the marketplace with a given ETH price from any collection.
- `buyNft`: Buy a NFT on the marketplace from any collection.
- `updateNftListing`: Update the ETH price of your listed NFTs.
- `cancelNftListing`: Cancel the listing of your NFT.
- `withdrawProceeds`: Withdraw the ETH from the NFTs you sold on the Marketplace.

### NFT Collections

This repository comes with 2 NFTs contract, each creating a NFT collection.
The constructor takes a mint fee in ETH and an array of token uris for each characters of the collection.

This contract implements :

- Chainlink VRF to pick a random NFT when the user mint.

The NFT Collections allows you to :

- `mintFreeNft`: Mint a maximum of 3 free NFTs.
- `mintNft`: Mint an NFT buy paying mint fees.

- [NFT Marketplace](#nft-marketplace-contract)
  - [Summary](#summary)
    - [NFT Marketplace](#nft-marketplace)
    - [NFT Collections](#nft-collections)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Testnet Development](#testnet-development)
- [Usage](#useage)
  - [Deployment](#deployment)
  - [Testing](#testing)

## Prerequisites

Please install or have installed the following:

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [nodejs and npm](https://nodejs.org/en/download/)

## Installation

1. Clone this repository

```
git clone https://github.com/jrmunchkin/nft-marketplace
cd nft-marketplace
```

2. Install dependencies

```
yarn
```

## Testnet Development

If you want to be able to deploy to testnets, do the following. I suggest to use goerli network.

```bash
cp .env.example .env
```

Set your `GOERLI_RPC_URL`, and `PRIVATE_KEY`

You can get a `GOERLI_RPC_URL` by opening an account at [Alchemy](https://www.alchemy.com/). Follow the steps to create a new application.

You also can work with [Infura](https://infura.io/).

You can find your `PRIVATE_KEY` from your ethereum wallet like [metamask](https://metamask.io/).

You'll also want an [Etherscan API Key](https://etherscan.io/apis) to verify your smart contracts. Set it here `ETHERSCAN_API_KEY`.

To be able to fully use the NFT collections you will need an account on [Pinata](https://app.pinata.cloud/). It will help you to push your NFTs metadata on IPFS and create a pin for you. To use Pinata you will need an `PINATA_API_KEY`, a `PINATA_API_SECRET` and a `PINATA_JWT` that you can find in the developers section. Additionally use `UPLOAD_TO_PINATA` to push conditionally on pinata.

If you want to use it with the [frontend repository](https://github.com/jrmunchkin/nft-marketplace-front-end), You also can clone it and set your frontend path `FRONT_END_FOLDER`

the `UPDATE_FRONT_END` set to true will update your frontend with the last deployed contract.

Finally you can add a `COINMARKETCAP_API_KEY` if you want to use hardhat gas reporter. You can find one by registring to [CoinMarketCap Developers](https://pro.coinmarketcap.com/).

You can add your environment variables to the `.env` file:

```bash
PRIVATE_KEY=<PRIVATE_KEY>
GOERLI_RPC_URL=<RPC_URL>
ETHERSCAN_API_KEY=<YOUR_API_KEY>
COINMARKETCAP_API_KEY=<YOUR_API_KEY>
FRONT_END_FOLDER=<YOUR_PATH_TO_FRONTEND>
UPDATE_FRONT_END=<TRUE_OR_FALSE>
PINATA_API_KEY=<YOUR_API_KEY>
PINATA_API_SECRET=<YOUR_API_SECRET>
PINATA_JWT=<YOUR_JWT>
UPLOAD_TO_PINATA=<TRUE_OR_FALSE>
```

You'll also need testnet goerli ETH if you want to deploy on goerli tesnet. You can get ETH into your wallet by using the [alchemy goerli faucet](https://goerlifaucet.com/) or [chainlink faucet](https://faucets.chain.link/).

# Usage

## Deployment

Feel free to change the mintFee variable in the helper-hardhat-config.js for setting your mint fee for the NFT collections.

To deploy the contracts locally

```bash
yarn hardhat deploy
```

To deploy on goerli tesnet you need to create first a subscription on [Chainlink VRF](https://vrf.chain.link/goerli).
Add the newly created subscriptionId to your helper-hardhat-config.js.

To deploy the contracts on goerli tesnet

```bash
yarn hardhat deploy --network goerli
```

Once the contracts are deployed on goerli, you need to add them as a consumer to your subscription (Don't forget to claim some LINK by using the [chainlink faucet](https://faucets.chain.link/)).

To update the front end repository with the newly deployed contracts (You need to pull the [frontend](https://github.com/jrmunchkin/nft-marketplace-front-end) and set your `FRONT_END_FOLDER` first)

```bash
yarn hardhat deploy --tags frontend
```

## Testing

For unit testing

```
yarn hardhat test
```

For integration testing

```
yarn hardhat test --network goerli
```
