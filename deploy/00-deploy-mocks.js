const { network } = require("hardhat")
const {
    developmentChains
} = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...")

        // deploy MockUSDC and FreeBetToken
        await deploy("MockUSDC", {
            contract: "MockUSDC",
            from: deployer,
            log: true,
            args: ["MockUSDC", "mUSDc"],
        })

        log("Mocks deployed!")
        log("-----------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
