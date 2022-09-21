require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const PRIVATE_KEY2 = process.env.PRIVATE_KEY2
const PRIVATE_KEY3 = process.env.PRIVATE_KEY3
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const FUJI_API_KEY = process.env.FUJI_API_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
const FUJI_RPC_URL = process.env.FUJI_RPC_URL
const FUJI_CONTRACT_ADDRESS = process.env.FUJI_CONTRACT_ADDRESS

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        localhost: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        rinkeby: {
            chainId: 4,
            blockConfirmations: 6,
            url: RINKEBY_RPC_URL,
            accounts: [PRIVATE_KEY],
            apiKey: ETHERSCAN_API_KEY,
            //contractAddress: "0x430eFf3ea50975885B3c6aa8bA664c6f9eD615b5",
        },
        fuji: {
            url: FUJI_RPC_URL,
            accounts: [PRIVATE_KEY, PRIVATE_KEY2, PRIVATE_KEY3],
            chainId: 43113,
            blockConfirmations: 2,
            apiKey: FUJI_API_KEY,
            contractAddress: FUJI_CONTRACT_ADDRESS,
        },
    },
    solidity: "0.8.7",
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
        },
        player: {
            default: 1,
            1: 0,
        },
        vault: {
            default: 2,
            1: 0,
        },
    },
    etherscan: {
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
            avalancheFujiTestnet: FUJI_API_KEY,
        },
    },
    gasReporter: {
        enabled: false,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
    },
    mocha: {
        timeout: 300000, // 300s
    },
}
