const { developmentChains } = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("HamtaroNft", function () {
      let deployer, hamtaroNft, mintFee;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        hamtaroNft = await ethers.getContract("HamtaroNft", deployer);
        mintFee = await hamtaroNft.getMintFee();
      });

      it("Should mint a random NFT", async function () {
        await new Promise(async (resolve, reject) => {
          hamtaroNft.once("NftMinted", async () => {
            try {
              const tokenCounter = await hamtaroNft.getTokenCounter();
              const tokenUri = await hamtaroNft.tokenURI(
                oldTokenCounter.toString()
              );
              assert.equal(tokenUri.toString().includes("ipfs://"), true);
              assert.equal(
                tokenCounter.toString(),
                (oldTokenCounter.toNumber() + 1).toString()
              );
            } catch (e) {
              reject(e);
            }
            resolve();
          });

          const oldTokenCounter = await hamtaroNft.getTokenCounter();
          const txMintNft = await hamtaroNft.mintNft({
            value: mintFee.toString(),
          });
          await txMintNft.wait(1);
        });
      });
    });
