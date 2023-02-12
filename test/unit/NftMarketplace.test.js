const { developmentChains } = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts, deployments } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("NftMarketplace", function () {
      let nftMarketplace, hamtaroNft, vrfCoordinatorV2Mock, deployer;
      const PRICE = ethers.utils.parseEther("0.1");
      const TOKEN_ID = 0;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["mocks", "hamtaroNft", "nftMarketplace"]);
        nftMarketplace = await ethers.getContract("NftMarketplace", deployer);
        hamtaroNft = await ethers.getContract("HamtaroNft", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        await new Promise(async (resolve, reject) => {
          hamtaroNft.once("NftMinted", async () => {
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

      describe("listNft", function () {
        it("Should revert if NFT not belongs to sender", async function () {
          const accounts = await ethers.getSigners();
          const accountConnected = nftMarketplace.connect(accounts[1]);
          await expect(
            accountConnected.listNft(hamtaroNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotOwner");
        });
        it("Should revert if price under 0", async function () {
          await expect(
            nftMarketplace.listNft(hamtaroNft.address, TOKEN_ID, 0)
          ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero");
        });
        it("Should revert if NFT not approved", async function () {
          await expect(
            nftMarketplace.listNft(hamtaroNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace");
        });
        it("Should revert if NFT already listed", async function () {
          await hamtaroNft.approve(nftMarketplace.address, TOKEN_ID);
          const listNftTx = await nftMarketplace.listNft(
            hamtaroNft.address,
            TOKEN_ID,
            PRICE
          );
          await listNftTx.wait(1);
          await expect(
            nftMarketplace.listNft(hamtaroNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__AlreadyListed");
        });
        it("Should list NFT", async function () {
          await hamtaroNft.approve(nftMarketplace.address, TOKEN_ID);
          const listNftTx = await nftMarketplace.listNft(
            hamtaroNft.address,
            TOKEN_ID,
            PRICE
          );
          await listNftTx.wait(1);
          const listing = await nftMarketplace.getListing(
            hamtaroNft.address,
            TOKEN_ID
          );
          assert.equal(listing.price.toString(), PRICE);
          assert.equal(listing.seller.toString(), deployer);
        });
        it("Should emit an event when NFT listed", async function () {
          await hamtaroNft.approve(nftMarketplace.address, TOKEN_ID);
          await expect(
            await nftMarketplace.listNft(hamtaroNft.address, TOKEN_ID, PRICE)
          ).to.emit(nftMarketplace, "NftListed");
        });
      });

      describe("buyNft", function () {
        describe("Not listed", function () {
          it("Should revert if NFT not listed", async function () {
            await expect(
              nftMarketplace.buyNft(hamtaroNft.address, TOKEN_ID)
            ).to.be.revertedWith("NftMarketplace__NotListed");
          });
        });
        describe("Listed", function () {
          beforeEach(async function () {
            await hamtaroNft.approve(nftMarketplace.address, TOKEN_ID);
            const listNftTx = await nftMarketplace.listNft(
              hamtaroNft.address,
              TOKEN_ID,
              PRICE
            );
            await listNftTx.wait(1);
          });
          it("Should revert if price under the selling price", async function () {
            await expect(
              nftMarketplace.buyNft(hamtaroNft.address, TOKEN_ID, {
                value: ethers.utils.parseEther("0.01"),
              })
            ).to.be.revertedWith("NftMarketplace__PriceNotMet");
          });
          it("Should increment proceeds of seller", async function () {
            const buyNftTx = await nftMarketplace.buyNft(
              hamtaroNft.address,
              TOKEN_ID,
              {
                value: PRICE,
              }
            );
            await buyNftTx.wait(1);
            const proceeds = await nftMarketplace.getProceeds(deployer);
            assert.equal(proceeds.toString(), PRICE.toString());
          });
          it("Should delete NFT listing", async function () {
            const buyNftTx = await nftMarketplace.buyNft(
              hamtaroNft.address,
              TOKEN_ID,
              {
                value: PRICE,
              }
            );
            await buyNftTx.wait(1);
            const listing = await nftMarketplace.getListing(
              hamtaroNft.address,
              TOKEN_ID
            );
            assert.equal(listing.price.toString(), "0");
          });
          it("Should transfer NFT to buyer", async function () {
            const accounts = await ethers.getSigners();
            const accountConnected = nftMarketplace.connect(accounts[1]);
            const buyNftTx = await accountConnected.buyNft(
              hamtaroNft.address,
              TOKEN_ID,
              {
                value: PRICE,
              }
            );
            await buyNftTx.wait(1);
            const newOwner = await hamtaroNft.ownerOf(TOKEN_ID);
            assert.equal(newOwner.toString(), accounts[1].address);
          });
          it("Should emit an event when NFT bought", async function () {
            await expect(
              await nftMarketplace.buyNft(hamtaroNft.address, TOKEN_ID, {
                value: PRICE,
              })
            ).to.emit(nftMarketplace, "NftBought");
          });
        });
      });

      describe("cancelNftListing", function () {
        describe("Not listed", function () {
          it("Should revert if NFT not listed", async function () {
            await expect(
              nftMarketplace.cancelNftListing(hamtaroNft.address, TOKEN_ID)
            ).to.be.revertedWith("NftMarketplace__NotListed");
          });
        });
        describe("Listed", function () {
          beforeEach(async function () {
            await hamtaroNft.approve(nftMarketplace.address, TOKEN_ID);
            const listNftTx = await nftMarketplace.listNft(
              hamtaroNft.address,
              TOKEN_ID,
              PRICE
            );
            await listNftTx.wait(1);
          });
          it("Should revert if NFT not belongs to sender", async function () {
            const accounts = await ethers.getSigners();
            const accountConnected = nftMarketplace.connect(accounts[1]);
            await expect(
              accountConnected.cancelNftListing(hamtaroNft.address, TOKEN_ID)
            ).to.be.revertedWith("NftMarketplace__NotOwner");
          });
          it("Should delete NFT listing", async function () {
            const cancelNftTx = await nftMarketplace.cancelNftListing(
              hamtaroNft.address,
              TOKEN_ID
            );
            await cancelNftTx.wait(1);
            const listing = await nftMarketplace.getListing(
              hamtaroNft.address,
              TOKEN_ID
            );
            assert.equal(listing.price.toString(), "0");
          });
          it("Should emit an event when NFT cancel", async function () {
            await expect(
              await nftMarketplace.cancelNftListing(
                hamtaroNft.address,
                TOKEN_ID
              )
            ).to.emit(nftMarketplace, "NftCanceled");
          });
        });
      });

      describe("updateNftListing", function () {
        describe("Not listed", function () {
          it("Should revert if NFT not listed", async function () {
            await expect(
              nftMarketplace.updateNftListing(
                hamtaroNft.address,
                TOKEN_ID,
                PRICE
              )
            ).to.be.revertedWith("NftMarketplace__NotListed");
          });
        });
        describe("Listed", function () {
          beforeEach(async function () {
            await hamtaroNft.approve(nftMarketplace.address, TOKEN_ID);
            const listNftTx = await nftMarketplace.listNft(
              hamtaroNft.address,
              TOKEN_ID,
              PRICE
            );
            await listNftTx.wait(1);
          });
          it("Should revert if NFT not belongs to sender", async function () {
            const accounts = await ethers.getSigners();
            const accountConnected = nftMarketplace.connect(accounts[1]);
            await expect(
              accountConnected.updateNftListing(
                hamtaroNft.address,
                TOKEN_ID,
                PRICE
              )
            ).to.be.revertedWith("NftMarketplace__NotOwner");
          });
          it("Should revert if price under 0", async function () {
            await expect(
              nftMarketplace.updateNftListing(hamtaroNft.address, TOKEN_ID, 0)
            ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero");
          });
          it("Should update NFT listing", async function () {
            const updateNftTx = await nftMarketplace.updateNftListing(
              hamtaroNft.address,
              TOKEN_ID,
              ethers.utils.parseEther("0.2")
            );
            await updateNftTx.wait(1);
            const listing = await nftMarketplace.getListing(
              hamtaroNft.address,
              TOKEN_ID
            );
            assert.equal(
              listing.price.toString(),
              ethers.utils.parseEther("0.2").toString()
            );
          });
          it("Should emit an event when NFT updated", async function () {
            await expect(
              await nftMarketplace.updateNftListing(
                hamtaroNft.address,
                TOKEN_ID,
                ethers.utils.parseEther("0.2")
              )
            ).to.emit(nftMarketplace, "NftListed");
          });
        });
      });

      describe("withdrawProceeds", function () {
        describe("No proceeds", function () {
          it("Should revert if no proceeds", async function () {
            await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
              "NftMarketplace__NoProceeds"
            );
          });
        });
        describe("Proceeds", function () {
          beforeEach(async function () {
            await hamtaroNft.approve(nftMarketplace.address, TOKEN_ID);
            const listNftTx = await nftMarketplace.listNft(
              hamtaroNft.address,
              TOKEN_ID,
              PRICE
            );
            await listNftTx.wait(1);
            const accounts = await ethers.getSigners();
            const accountConnected = nftMarketplace.connect(accounts[1]);
            const buyNftTx = await accountConnected.buyNft(
              hamtaroNft.address,
              TOKEN_ID,
              {
                value: PRICE,
              }
            );
            await buyNftTx.wait(1);
          });
          it("Should put proceeds to 0", async function () {
            const withdrawTx = await nftMarketplace.withdrawProceeds();
            await withdrawTx.wait(1);
            const proceeds = await nftMarketplace.getProceeds(deployer);
            assert.equal(proceeds.toString(), "0");
          });
          it("Should transfer proceeds to owner", async function () {
            const accounts = await ethers.getSigners();
            const userBalanceBeforeProceeds = await accounts[0].getBalance();
            const withdrawTx = await nftMarketplace.withdrawProceeds();
            const withdrawTxReceipt = await withdrawTx.wait(1);
            const gasUseToProceeds = withdrawTxReceipt.gasUsed.mul(
              withdrawTxReceipt.effectiveGasPrice
            );
            const userBalanceAfterProceeds = await accounts[0].getBalance();
            assert.equal(
              userBalanceAfterProceeds.add(gasUseToProceeds).toString(),
              userBalanceBeforeProceeds.add(PRICE).toString()
            );
          });
          it("Should emit an event when proceeds withdraws", async function () {
            await expect(await nftMarketplace.withdrawProceeds()).to.emit(
              nftMarketplace,
              "ProceedsWithdraw"
            );
          });
        });
      });
    });
