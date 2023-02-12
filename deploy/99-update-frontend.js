const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_FOLDER = process.env.FRONT_END_FOLDER;

const FRONT_END_ADDRESSES_FILE = FRONT_END_FOLDER + "/contractAddresses.json";
const FRONT_END_ABI_FILE = FRONT_END_FOLDER;

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END == "true") {
    await updateContractAddresses();
    await updateAbi();
  }
};

async function updateAbi() {
  const hamtaroNft = await ethers.getContract("HamtaroNft");
  fs.writeFileSync(
    `${FRONT_END_ABI_FILE}/hamtaroNft.json`,
    hamtaroNft.interface.format(ethers.utils.FormatTypes.json)
  );

  const isaacNft = await ethers.getContract("IsaacNft");
  fs.writeFileSync(
    `${FRONT_END_ABI_FILE}/isaacNft.json`,
    isaacNft.interface.format(ethers.utils.FormatTypes.json)
  );

  const nftMarketplace = await ethers.getContract("NftMarketplace");
  fs.writeFileSync(
    `${FRONT_END_ABI_FILE}/nftMarketplace.json`,
    nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddresses() {
  const hamtaroNft = await ethers.getContract("HamtaroNft");
  const isaacNft = await ethers.getContract("IsaacNft");
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const chainId = network.config.chainId.toString();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
  );
  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId]["HamtaroNft"].includes(hamtaroNft.address)) {
      currentAddresses[chainId]["HamtaroNft"].push(hamtaroNft.address);
    }
    if (!currentAddresses[chainId]["IsaacNft"].includes(isaacNft.address)) {
      currentAddresses[chainId]["IsaacNft"].push(isaacNft.address);
    }
    if (
      !currentAddresses[chainId]["NftMarketplace"].includes(
        nftMarketplace.address
      )
    ) {
      currentAddresses[chainId]["NftMarketplace"].push(nftMarketplace.address);
    }
  } else {
    currentAddresses[chainId] = {
      HamtaroNft: [hamtaroNft.address],
      IsaacNft: [isaacNft.address],
      NftMarketplace: [nftMarketplace.address],
    };
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];
