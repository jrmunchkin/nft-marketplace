const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
  VRF_SUB_FUND_AMOUNT,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const {
  storeImages,
  storeTokenUriMetadata,
} = require("../utils/uploadToPinata");
const fs = require("fs");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  let tokenUris = [
    ["ipfs://QmcwAxqY4u1cFydnPJz4FyfHXLmxT8mRvABZNfexUocQiq"],
    [
      "ipfs://QmaL9qpCw3cjwPUoER4CptAZ4fcWuVaUr3NXxqCMBSzjTA",
      "ipfs://Qma7qiAbVjgY8gpQc36Fdnh6BfBXRREZjMXVSdHJL9jMUo",
      "ipfs://QmRvU2WTugDWXWbxYp9cJEbcWSSWH4uxcSCt12J2wgkBnZ",
    ],
    [
      "ipfs://QmYRMJfGpxjLJFHoCU3ReTn4yq3WzgNYfUrtLRtuM7RQYT",
      "ipfs://QmPfZviiH4XCqHZjHwGWKBCEr9MmgDXuRV5PtqTMfxmVeo",
      "ipfs://QmZNDqgkaZuNW5x2TXhfHFRJjgkM8qYaRPTf8ZpxFYmMZQ",
      "ipfs://QmevbUUERCPavcxSesg5DFNdgHxdBKbg4HjfSKoizoo6xo",
      "ipfs://QmRxSpVMjyyNiHdm139XUHPHHBFkp7fhznNNMrrwc3iisE",
      "ipfs://Qme6Qi3VuTpqgB3zJXGTHLTLZ1AfTG7rLkPNHPMM9xPXwd",
      "ipfs://QmP5vRjb3A6NnCwQqqjvNS8TeP1zeoeqUEebE4JmdVXZT2",
    ],
  ];
  if (process.env.UPLOAD_TO_PINATA == "true") {
    tokenUris[0] = await handleTokenUris(
      "./images/isaac/legendary",
      "Legendary"
    );
    tokenUris[1] = await handleTokenUris("./images/isaac/rare", "Rare");
    tokenUris[2] = await handleTokenUris("./images/isaac/common", "Common");
  }

  let vrfCoordinatorV2Mock, vrfCoordinatorV2Address, subscriptionId;

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const tx = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await tx.wait(1);
    subscriptionId = txReceipt.events[0].args.subId;
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
    subscriptionId = networkConfig[chainId].subscriptionId;
  }

  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const mintFee = networkConfig[chainId]["mintFee"];

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    gasLane,
    callbackGasLimit,
    tokenUris,
    mintFee,
  ];

  const isaacNft = await deploy("IsaacNft", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(
      subscriptionId.toNumber(),
      isaacNft.address
    );
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(isaacNft.address, args);
  }

  log("----------------------------------");
};

async function handleTokenUris(imagesLocation) {
  tokenUris = [];

  const { responses: imageUploadResponses, files } = await storeImages(
    imagesLocation
  );

  for (let imageUploadResponseIndex in imageUploadResponses) {
    let metadataFile = files[imageUploadResponseIndex].replace(".png", ".json");
    let tokenUriMetadataJSON = fs.readFileSync(
      "./metadatas/isaac/" + metadataFile
    );
    let tokenUriMetadata = JSON.parse(tokenUriMetadataJSON);
    tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
    console.log(`Uploading ${tokenUriMetadata.name}...`);
    const responseUploadMetadata = await storeTokenUriMetadata(
      tokenUriMetadata
    );

    tokenUris.push(`ipfs://${responseUploadMetadata.IpfsHash}`);
  }
  console.log(tokenUris);

  return tokenUris;
}

module.exports.tags = ["all", "isaacNft", "main"];
