const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts, deployments } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("HamtaroNft", function () {
      let hamtaroNft, vrfCoordinatorV2Mock, deployer, mintFee;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["mocks", "hamtaroNft"]);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        hamtaroNft = await ethers.getContract("HamtaroNft", deployer);
        mintFee = await hamtaroNft.getMintFee();
      });

      describe("constructor", function () {
        it("Should initialize contract correctly", async function () {
          const name = await hamtaroNft.name();
          const symbol = await hamtaroNft.symbol();
          const tokenCounter = await hamtaroNft.getTokenCounter();
          const hamtaroTokenUriZero = await hamtaroNft.getHamtaroTokenUri(0, 0);
          const initializeMintFee = await hamtaroNft.getMintFee();
          assert.equal(name, "Hamtaro");
          assert.equal(symbol, "HAM");
          assert.equal(tokenCounter.toString(), "0");
          assert(hamtaroTokenUriZero.includes("ipfs://"));
          assert.equal(
            initializeMintFee.toString(),
            networkConfig[chainId]["mintFee"]
          );
        });
      });

      describe("mintFreeNft", function () {
        it("Should increment user free nft storage", async function () {
          const txMint = await hamtaroNft.mintFreeNft();
          await txMint.wait(1);
          const nbFreeNft = await hamtaroNft.getNbUserFreeNft(deployer);
          assert.equal(nbFreeNft.toString(), "1");
        });
        it("Should revert if called more than 3 times", async function () {
          const txMint = await hamtaroNft.mintFreeNft();
          await txMint.wait(1);
          const txMint2 = await hamtaroNft.mintFreeNft();
          await txMint2.wait(1);
          const txMint3 = await hamtaroNft.mintFreeNft();
          await txMint3.wait(1);
          await expect(hamtaroNft.mintFreeNft()).to.be.revertedWith(
            "HamtaroNft__NoMoreFreeNft"
          );
        });
        it("Should emits an event and kicks off a random word request", async function () {
          await expect(await hamtaroNft.mintFreeNft()).to.emit(
            hamtaroNft,
            "NftRequested"
          );
        });
      });

      describe("mintNft", function () {
        it("Should revert if payment amount is less than the mint fee", async function () {
          await expect(
            hamtaroNft.mintNft({
              value: mintFee.sub(ethers.utils.parseEther("0.001")),
            })
          ).to.be.revertedWith("HamtaroNft__NotEnoughETH");
        });
        it("Should emits an event and kicks off a random word request", async function () {
          await expect(
            await hamtaroNft.mintNft({ value: mintFee.toString() })
          ).to.emit(hamtaroNft, "NftRequested");
        });
      });

      describe("fulfillRandomWords", () => {
        it("Should mints NFT after random number is returned", async function () {
          await new Promise(async (resolve, reject) => {
            hamtaroNft.once("NftMinted", async () => {
              try {
                const tokenUri = await hamtaroNft.tokenURI("0");
                assert.equal(tokenUri.toString().includes("ipfs://"), true);
              } catch (e) {
                console.log(e);
                reject(e);
              }
              resolve();
            });

            const txMintNft = await hamtaroNft.mintNft({
              value: mintFee.toString(),
            });
            const txMintNftReceipt = await txMintNft.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txMintNftReceipt.events[1].args.requestId,
              hamtaroNft.address
            );
          });
        });
        it("Should increment token counter", async function () {
          await new Promise(async (resolve, reject) => {
            hamtaroNft.once("NftMinted", async () => {
              try {
                const tokenCounter = await hamtaroNft.getTokenCounter();
                assert.equal(tokenCounter.toString(), "1");
              } catch (e) {
                console.log(e);
                reject(e);
              }
              resolve();
            });

            const txMintNft = await hamtaroNft.mintFreeNft();
            const txMintNftReceipt = await txMintNft.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txMintNftReceipt.events[1].args.requestId,
              hamtaroNft.address
            );
          });
        });
      });

      describe("getRandomCharacter", () => {
        it("should return Grail if moddedRng < 2", async function () {
          const expectedValue = await hamtaroNft.getRandomCharacter(101);
          assert.equal(0, expectedValue[0]);
        });
        it("should return Legendary if moddedRng is between 2 - 6", async function () {
          const expectedValue = await hamtaroNft.getRandomCharacter(104);
          assert.equal(1, expectedValue[0]);
        });
        it("should return Rare if moddedRng is between 6 - 19", async function () {
          const expectedValue = await hamtaroNft.getRandomCharacter(115);
          assert.equal(2, expectedValue[0]);
        });
        it("should return Uncommon if moddedRng is between 20 - 49", async function () {
          const expectedValue = await hamtaroNft.getRandomCharacter(130);
          assert.equal(3, expectedValue[0]);
        });
        it("should return Common if moddedRng is between 50 - 99", async function () {
          const expectedValue = await hamtaroNft.getRandomCharacter(162);
          assert.equal(4, expectedValue[0]);
        });
      });
    });
