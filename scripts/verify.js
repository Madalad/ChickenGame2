const { ethers, run } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

async function main() {
    const accounts = await ethers.getSigners()
    vault = accounts[2].address
    const chainId = network.config.chainId
    const betSize = networkConfig[chainId]["betSize"]
    //const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]
    const edge = 500 // 5%
    const args = [betSize, interval, edge, vault]
    console.log(args)

    console.log("Verifying!!")
    try {
        await run("verify:verify", {
            args,
            contract: "contracts/FlattenedChickenGame.sol:FlattenedChickenGame",
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!")
        } else {
            console.log(e)
        }
    }
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
