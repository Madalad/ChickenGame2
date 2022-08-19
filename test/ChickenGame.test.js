const { expect, assert } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

describe("ChickenGame", function () {
    let chickenGame, betSize, deployer, bettor, vault
    const chainId = network.config.chainId

    beforeEach(async function () {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        bettor = accounts[1]
        vault = accounts[2]
        await deployments.fixture(["all"])
        chickenGame = await ethers.getContract("ChickenGame", deployer.address)
        betSize = await chickenGame.getBetsize()
        interval = await chickenGame.getInterval()
    })

    describe("constructor", function () {
        it("should set state variables", async function () {
            const _betSize = await chickenGame.getBetsize()
            const _interval = await chickenGame.getInterval()
            const _edge = await chickenGame.getEdge()
            const _vault = await chickenGame.getVaultAddress()
            assert.equal(_betSize.toString(), networkConfig[chainId]["betSize"].toString())
            assert.equal(_interval.toString(), networkConfig[chainId]["interval"].toString())
            assert.equal(_edge.toString(), "500")
            assert.equal(_vault, vault.address)
        })
    })

    describe("bet", function () {
        it("should fire the event", async function () {
            await expect(chickenGame.bet({ value: betSize })).to.emit(chickenGame, "BetPlaced")
        })
        it("should update state variables", async function () {
            const initialTimestamp = await chickenGame.getLastBetTimestamp()
            await chickenGame.bet({ value: betSize })
            const recentBettor = await chickenGame.getRecentBettor()
            const updatedTimestamp = await chickenGame.getLastBetTimestamp()
            assert.equal(recentBettor, deployer.address)
            assert(updatedTimestamp.gt(initialTimestamp))
        })
        it("should not accept bet if too small", async function () {
            await expect(chickenGame.bet()).to.be.revertedWith("ChickenGame__BetTooSmall")
        })
        it("should not accept bet if game is over", async function () {
            // checkUpkeep requires at least two bets to have been placed
            const balance = await chickenGame.getBalance()
            await chickenGame.bet({ value: betSize })
            await chickenGame.bet({ value: betSize })
            // simulate waiting
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            // try to bet after interval has passed
            await expect(chickenGame.bet({ value: betSize })).to.be.revertedWith(
                "ChickenGame__NotOpen"
            )
        })
    })

    describe("checkUpkeep", function () {
        it("should be false if time hasnt passed", async function () {
            await chickenGame.bet({ value: betSize })
            const checkUpkeep = await chickenGame.checkUpkeep("0x")
            assert(!checkUpkeep[0])
        })
        it("should be false if balance is <= 1 bet", async function () {
            let checkUpkeep = await chickenGame.checkUpkeep("0x")
            assert(!checkUpkeep[0])
            await chickenGame.bet({ value: betSize })
            checkUpkeep = await chickenGame.checkUpkeep("0x")
            assert(!checkUpkeep[0])
        })
        it("should return true otherwise", async function () {
            await chickenGame.bet({ value: betSize })
            await chickenGame.bet({ value: betSize })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const checkUpkeep = await chickenGame.checkUpkeep("0x")
            assert(checkUpkeep[0])
        })
    })

    describe("performUpkeep", function () {
        beforeEach(async function () {})
        it("should revert if upkeep is not needed", async function () {
            await expect(chickenGame.performUpkeep("0x")).to.be.revertedWith(
                "ChickenGame__UpkeepNotNeeded"
            )
        })
        it("should send balance to the winner, and rake to the vault", async function () {
            // place bets
            await chickenGame.bet({ value: betSize })
            const chickenGameConnectedContract = chickenGame.connect(bettor)
            await chickenGameConnectedContract.bet({ value: betSize })
            // wait interval
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            // perform upkeep
            const bettorInitialBalance = await bettor.getBalance()
            const vaultInitialBalance = await vault.getBalance()
            const contractInitialBalance = await chickenGame.getBalance()
            await chickenGame.performUpkeep("0x")
            const bettorFinalBalance = await bettor.getBalance()
            const vaultFinalBalance = await vault.getBalance()
            const contractFinalBalance = await chickenGame.getBalance()
            const edge = (await chickenGame.getEdge()).toNumber() / 10000
            const rake = contractInitialBalance.div(1 / edge)
            const winnings = contractInitialBalance.sub(rake)
            assert.equal(
                bettorInitialBalance.add(winnings).toString(),
                bettorFinalBalance.toString()
            )
            assert.equal(vaultInitialBalance.add(rake).toString(), vaultFinalBalance.toString())
            assert.equal(contractFinalBalance.toString(), "0")
        })
        it("should emit the right event", async function () {
            await chickenGame.bet({ value: betSize })
            await chickenGame.bet({ value: betSize })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            await expect(chickenGame.performUpkeep("0x")).to.emit(chickenGame, "RoundSettled")
        })
        it("should reset state variables", async function () {
            await chickenGame.bet({ value: betSize })
            await chickenGame.bet({ value: betSize })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const contractInitialBalance = await chickenGame.getBalance()
            await chickenGame.performUpkeep("0x")
            const edge = (await chickenGame.getEdge()).toNumber() / 10000
            const rake = contractInitialBalance.div(1 / edge)
            const winnings = contractInitialBalance.sub(rake)
            const recentWinner = await chickenGame.getRecentWinner()
            const recentWinAmount = await chickenGame.getRecentWinAmount()
            const recentBettor = await chickenGame.getRecentBettor()
            assert.equal(recentWinner, deployer.address)
            assert.equal(recentWinAmount.toString(), winnings.toString())
            assert.equal(recentBettor, ethers.constants.AddressZero)
        })
    })
})

module.exports.tags = ["all", "chickenGame"]
