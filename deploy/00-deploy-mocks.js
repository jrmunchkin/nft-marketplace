const { network } = require("hardhat");
const {
  developmentChains,
  BASE_FEE,
  GAS_PRICE_LINK,
} = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  if (developmentChains.includes(network.name)) {
    log("Deploying mocks...");

    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });

    log("Mock deployed");
  }
};

module.exports.tags = ["all", "mocks"];
