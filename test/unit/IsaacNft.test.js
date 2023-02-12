const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts, deployments } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("isaacNft", function () {
      let isaacNft, vrfCoordinatorV2Mock, deployer, mintFee;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["mocks", "isaacNft"]);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        isaacNft = await ethers.getContract("IsaacNft", deployer);
        mintFee = await isaacNft.getMintFee();
      });

      describe("constructor", function () {
        it("Should initialize contract correctly", async function () {
          const name = await isaacNft.name();
          const symbol = await isaacNft.symbol();
          const tokenCounter = await isaacNft.getTokenCounter();
          const isaacTokenUriZero = await isaacNft.getIsaacTokenUri(0, 0);
          const initializeMintFee = await isaacNft.getMintFee();
          assert.equal(name, "Isaac");
          assert.equal(symbol, "ISC");
          assert.equal(tokenCounter.toString(), "0");
          assert(isaacTokenUriZero.includes("ipfs://"));
          assert.equal(
            initializeMintFee.toString(),
            networkConfig[chainId]["mintFee"]
          );
        });
      });

      describe("mintFreeNft", function () {
        it("Should increment user free nft storage", async function () {
          const txMint = await isaacNft.mintFreeNft();
          await txMint.wait(1);
          const nbFreeNft = await isaacNft.getNbUserFreeNft(deployer);
          assert.equal(nbFreeNft.toString(), "1");
        });
        it("Should revert if called more than 3 times", async function () {
          const txMint = await isaacNft.mintFreeNft();
          await txMint.wait(1);
          const txMint2 = await isaacNft.mintFreeNft();
          await txMint2.wait(1);
          const txMint3 = await isaacNft.mintFreeNft();
          await txMint3.wait(1);
          await expect(isaacNft.mintFreeNft()).to.be.revertedWith(
            "IsaacNft__NoMoreFreeNft"
          );
        });
        it("Should emits an event and kicks off a random word request", async function () {
          await expect(await isaacNft.mintFreeNft()).to.emit(
            isaacNft,
            "NftRequested"
          );
        });
      });

      describe("mintNft", function () {
        it("Should revert if payment amount is less than the mint fee", async function () {
          await expect(
            isaacNft.mintNft({
              value: mintFee.sub(ethers.utils.parseEther("0.001")),
            })
          ).to.be.revertedWith("IsaacNft__NotEnoughETH");
        });
        it("Should emits an event and kicks off a random word request", async function () {
          await expect(
            await isaacNft.mintNft({ value: mintFee.toString() })
          ).to.emit(isaacNft, "NftRequested");
        });
      });

      describe("fulfillRandomWords", () => {
        it("Should mints NFT after random number is returned", async function () {
          await new Promise(async (resolve, reject) => {
            isaacNft.once("NftMinted", async () => {
              try {
                const tokenUri = await isaacNft.tokenURI("0");
                assert.equal(tokenUri.toString().includes("ipfs://"), true);
              } catch (e) {
                console.log(e);
                reject(e);
              }
              resolve();
            });

            const txMintNft = await isaacNft.mintNft({
              value: mintFee.toString(),
            });
            const txMintNftReceipt = await txMintNft.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txMintNftReceipt.events[1].args.requestId,
              isaacNft.address
            );
          });
        });
        it("Should increment token counter", async function () {
          await new Promise(async (resolve, reject) => {
            isaacNft.once("NftMinted", async () => {
              try {
                const tokenCounter = await isaacNft.getTokenCounter();
                assert.equal(tokenCounter.toString(), "1");
              } catch (e) {
                console.log(e);
                reject(e);
              }
              resolve();
            });

            const txMintNft = await isaacNft.mintFreeNft();
            const txMintNftReceipt = await txMintNft.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txMintNftReceipt.events[1].args.requestId,
              isaacNft.address
            );
          });
        });
      });

      describe("getRandomCharacter", () => {
        it("should return Legendary if moddedRng < 5", async function () {
          const expectedValue = await isaacNft.getRandomCharacter(104);
          assert.equal(0, expectedValue[0]);
        });
        it("should return Rare if moddedRng is between 5 - 39", async function () {
          const expectedValue = await isaacNft.getRandomCharacter(115);
          assert.equal(1, expectedValue[0]);
        });
        it("should return Common if moddedRng is between 40 - 99", async function () {
          const expectedValue = await isaacNft.getRandomCharacter(150);
          assert.equal(2, expectedValue[0]);
        });
      });
    });
