const { ethers } = require("hardhat")

const networkConfig = {
    4: {
        name: "rinkeby",
        betSize: ethers.utils.parseEther("0.1"),
        callbackGasLimit: "500000", // 500,000 gas
        interval: "30",
    },
    31337: {
        name: "hardhat",
        betSize: ethers.utils.parseEther("1"),
        callbackGasLimit: "500000", // 500,000 gas
        interval: "30",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = { networkConfig, developmentChains }
