const { developmentChains } = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe.only("NftMarketplace", function () {
      let deployer, hamtaroNft, nftMarketplace, mintFee;
      const PRICE = ethers.utils.parseEther("0.1");
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        hamtaroNft = await ethers.getContract("HamtaroNft", deployer);
        nftMarketplace = await ethers.getContract("NftMarketplace", deployer);
        mintFee = await hamtaroNft.getMintFee();
      });

      it("Should list, update, cancel, buy NFT and withdraw proceeds", async function () {
        await new Promise(async (resolve, reject) => {
          hamtaroNft.once("NftMinted", async () => {
            try {
              const accounts = await ethers.getSigners();

              //First listing
              await hamtaroNft.approve(nftMarketplace.address, tokenId);
              const listNftTx = await nftMarketplace.listNft(
                hamtaroNft.address,
                tokenId,
                PRICE
              );
              await listNftTx.wait(1);
              const listing = await nftMarketplace.getListing(
                hamtaroNft.address,
                tokenId
              );

              //Buying
              const buyNftTx = await nftMarketplace.buyNft(
                hamtaroNft.address,
                tokenId,
                {
                  value: PRICE,
                }
              );
              await buyNftTx.wait(1);

              //Second listing
              await hamtaroNft.approve(nftMarketplace.address, tokenId);
              const list2NftTx = await nftMarketplace.listNft(
                hamtaroNft.address,
                tokenId,
                PRICE
              );
              await list2NftTx.wait(1);

              //Update
              const updateNftTx = await nftMarketplace.updateNftListing(
                hamtaroNft.address,
                tokenId,
                ethers.utils.parseEther("0.2")
              );
              await updateNftTx.wait(1);
              const listing2 = await nftMarketplace.getListing(
                hamtaroNft.address,
                tokenId
              );

              //Cancel
              const cancelNftTx = await nftMarketplace.cancelNftListing(
                hamtaroNft.address,
                tokenId
              );
              await cancelNftTx.wait(1);
              const listing3 = await nftMarketplace.getListing(
                hamtaroNft.address,
                tokenId
              );

              //Withdraw
              const withdrawTx = await nftMarketplace.withdrawProceeds();
              await withdrawTx.wait(1);

              assert.equal(listing.price.toString(), PRICE);
              assert.equal(listing.seller.toString(), deployer);
              assert.equal(
                listing2.price.toString(),
                ethers.utils.parseEther("0.2").toString()
              );
              assert.equal(listing3.price.toString(), "0");
            } catch (e) {
              reject(e);
            }
            resolve();
          });

          const tokenId = await hamtaroNft.getTokenCounter();
          const txMintNft = await hamtaroNft.mintNft({
            value: mintFee.toString(),
          });
          await txMintNft.wait(1);
        });
      });
    });
