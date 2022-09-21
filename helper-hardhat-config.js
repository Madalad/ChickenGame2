const { ethers } = require("hardhat")

const networkConfig = {
    4: {
        name: "rinkeby",
        betSize: 10 * 10 ** 6, // $10
        callbackGasLimit: "500000", // 500,000 gas
        interval: "30",
    },
    31337: {
        name: "hardhat",
        betSize: 10 * 10 ** 6, // $10
        callbackGasLimit: "500000", // 500,000 gas
        interval: "30",
    },
    43113: {
        name: "fuji",
        betSize: 10 * 10 ** 6, // $10
        callbackGasLimit: "500000",
        interval: "30",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = { networkConfig, developmentChains }
