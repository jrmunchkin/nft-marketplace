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

const metadataTemplate = {
  name: "",
  description: "",
  image: "",
  attributes: [
    {
      trait_type: "Cuteness",
      value: 100,
    },
  ],
};

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  let tokenUris = [
    ["ipfs://QmVRym8H8YHhavs8KkPTEx9rFeXyvbrDQTsmf7rEAPwHH1"],
    [
      "ipfs://Qmbtw1wSCvvWi8K9wbyhCykxBA4K8MrR42gZ2vMV4fN2xL",
      "ipfs://QmShzdvHRD6EVU7qLNVRx71noyunTKx9ThfDTr57djWzY6",
    ],
    [
      "ipfs://QmQSKTEEQTsLVQbXXuFX9q1KL5hqfiXbYt6GBSCvinhLEq",
      "ipfs://QmYrajFxesg7xNvQkc9uGt4cHVUbVLzYHZnMjMh3Vv7w68",
      "ipfs://QmPSfWBYV9xfBukqZC9madzVMA2ASWpWtH2iJUDfksj8vV",
      "ipfs://QmTd9qLkETPwMMk8Tj1jUHoQYi8wcwXtPaWtLedHzpWHjV",
    ],
    [
      "ipfs://QmdwapnLdRJ7usu5KMfWFksuDo3KUtdhqp2UWw4AUjpaem",
      "ipfs://QmckVrrVQjQGnAxCWnA3qHYXDwvFytpyb7vBomD3ARVoyw",
      "ipfs://QmYrxm2pGFCPX9jLEGukW1CRxzUacuhaMjPF74w2BwjSSV",
      "ipfs://QmbVn891JxuuG18Dw2tdxMv9oYBSZC1s1u5g4kYE571Dqt",
      "ipfs://QmZeMprWGTvMLXzAFMWva5sbSTLmbRZviqXuYFndncN8md",
      "ipfs://QmVsiKcGcjtgGMstzNZpKihkQrY9JMEcfq1WTtdThj45HL",
    ],
    [
      "ipfs://QmR1MZU8u5Rh8dNouFzpv9raCtvTM62XgQnp7tmXF65kMM",
      "ipfs://QmbaQFiWhJyVc4N9P1bLu84EFD3G6wC47tQDko8EcqzJfB",
      "ipfs://QmX9fBNkPDUwaareDqgkqgQNK9sipwatahCAyieGD7HSqj",
      "ipfs://QmQXVvV4uu91y4J4SJEppc6zqXkCosgDxVFjehqBxRFXnL",
      "ipfs://QmY1tdgtWccikiYVLkphcXi1Kyo7H2U2EWjpUeJmim1srv",
      "ipfs://QmSZesudMLoCDqwCX3iy5UVmFkt67yvPRcLkyTMHUkTiqm",
      "ipfs://QmcYnxcExmpduwqj83WNxvsf2Gn96c4VxZfK2kkyAfvsvX",
      "ipfs://QmVkUAyem44hQgFUR58K4E3hex9a9tHxbz1UZEajJCDDm7",
      "ipfs://QmdCVLZVsYRXwKe4nQzLjkrXftKFK2S1Muged4GkezEDm5",
      "ipfs://QmWjoX7SA5GR8eDM5cqgqpv3JCUP7ijej3uALqDgyY4xpE",
      "ipfs://QmeiW62kJt9HptEGAYSGhfSnXJnFi916kRAJ2DtrmDkVop",
      "ipfs://QmYQNh92ipaPizLH1Ae36bXc7dmJEpooGMYf5My8oKroq2",
    ],
  ];
  if (process.env.UPLOAD_TO_PINATA == "true") {
    tokenUris[0] = await handleTokenUris("./images/hamtaro/grail", "Grail");
    tokenUris[1] = await handleTokenUris(
      "./images/hamtaro/legendary",
      "Legendary"
    );
    tokenUris[2] = await handleTokenUris("./images/hamtaro/rare", "Rare");
    tokenUris[3] = await handleTokenUris(
      "./images/hamtaro/uncommon",
      "Uncommon"
    );
    tokenUris[4] = await handleTokenUris("./images/hamtaro/common", "Common");
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

  const hamtaroNft = await deploy("HamtaroNft", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(
      subscriptionId.toNumber(),
      hamtaroNft.address
    );
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(hamtaroNft.address, args);
  }

  log("----------------------------------");
};

async function handleTokenUris(imagesLocation, rarity) {
  tokenUris = [];

  const { responses: imageUploadResponses, files } = await storeImages(
    imagesLocation
  );

  for (let imageUploadResponseIndex in imageUploadResponses) {
    let tokenUriMetadata = { ...metadataTemplate };
    let name = files[imageUploadResponseIndex]
      .replace(".png", "")
      .split("-")[1];
    tokenUriMetadata.name =
      name.charAt(0).toUpperCase() + name.slice(1) + " (" + rarity + ")";
    tokenUriMetadata.description = `Say hello to ${
      name.charAt(0).toUpperCase() + name.slice(1)
    }!`;
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

module.exports.tags = ["all", "hamtaroNft", "main"];
