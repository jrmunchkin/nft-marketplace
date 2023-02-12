const { developmentChains } = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("IsaacNft", function () {
      let deployer, isaacNft, mintFee;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        isaacNft = await ethers.getContract("IsaacNft", deployer);
        mintFee = await isaacNft.getMintFee();
      });

      it("Should mint a random NFT", async function () {
        await new Promise(async (resolve, reject) => {
          isaacNft.once("NftMinted", async () => {
            try {
              const tokenCounter = await isaacNft.getTokenCounter();
              const tokenUri = await isaacNft.tokenURI(
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

          const oldTokenCounter = await isaacNft.getTokenCounter();
          const txMintNft = await isaacNft.mintNft({
            value: mintFee.toString(),
          });
          await txMintNft.wait(1);
        });
      });
    });
