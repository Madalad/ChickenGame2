const { expect, assert } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("ChickenGame", function () {
          let chickenGame, mockUSDC, betSize, deployer, bettor, vault
          const chainId = network.config.chainId

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              bettor = accounts[1]
              vault = accounts[2]
              await deployments.fixture(["all"])
              chickenGame = await ethers.getContract("ChickenGame", deployer.address)
              mockUSDC = await ethers.getContract("MockUSDC", deployer.address)
              betSize = await chickenGame.getBetsize()
              interval = await chickenGame.getInterval()
              await mockUSDC.transfer(bettor.address, 50 * 10 ** 6) // $50
              await mockUSDC.approve(chickenGame.address, 10 ** 9)
              await mockUSDC.connect(bettor).approve(chickenGame.address, 10 ** 9)
          })

          describe("constructor", function () {
              it("should set state variables", async function () {
                  const _betSize = await chickenGame.getBetsize()
                  const _interval = await chickenGame.getInterval()
                  const _rake = await chickenGame.getRake()
                  const _vault = await chickenGame.getVaultAddress()
                  assert.equal(_betSize.toString(), networkConfig[chainId]["betSize"].toString())
                  assert.equal(_interval.toString(), networkConfig[chainId]["interval"].toString())
                  assert.equal(_rake.toString(), "500")
                  assert.equal(_vault, vault.address)
              })
          })

          describe("bet", function () {
              it("should fire the event", async function () {
                  await mockUSDC.approve(chickenGame.address, betSize)
                  await expect(chickenGame.bet()).to.emit(chickenGame, "BetPlaced")
              })
              it("should update state variables", async function () {
                  const initialTimestamp = await chickenGame.getLastBetTimestamp()
                  const initialBalance = await chickenGame.getBalance()
                  await mockUSDC.approve(chickenGame.address, betSize)
                  await chickenGame.bet()
                  const recentBettor = await chickenGame.getRecentBettor()
                  const updatedTimestamp = await chickenGame.getLastBetTimestamp()
                  const updatedBalance = await chickenGame.getBalance()
                  assert.equal(recentBettor, deployer.address)
                  assert(updatedTimestamp.gt(initialTimestamp))
                  assert.equal(updatedBalance.toString(), initialBalance.add(betSize).toString())
              })
              it("should not accept bet if insufficient balance", async function () {
                  const deployerUsdcBalance = await mockUSDC.balanceOf(deployer.address)
                  await mockUSDC.transfer(bettor.address, deployerUsdcBalance)
                  await mockUSDC.approve(chickenGame.address, betSize)
                  await expect(chickenGame.bet()).to.be.revertedWith(
                      "ERC20: transfer amount exceeds balance"
                  )
              })
              it("should not accept bet if game is over", async function () {
                  // checkUpkeep requires at least two bets to have been placed
                  await mockUSDC.approve(chickenGame.address, 2 * betSize)
                  await chickenGame.bet()
                  await chickenGame.bet()
                  // simulate waiting
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // try to bet after interval has passed
                  await expect(chickenGame.bet()).to.be.revertedWith("ChickenGame__BettingClosed")
              })
          })

          describe("settleRound", function () {
              beforeEach(async function () {})
              it("should revert if balance is <= 2 * betsize", async function () {
                  await expect(chickenGame.settleRound()).to.be.revertedWith(
                      "ChickenGame__RoundInProgress"
                  )
              })
              it("should revert if time interval has not yet passed", async function () {
                  await chickenGame.bet()
                  await chickenGame.bet()
                  await expect(chickenGame.settleRound()).to.be.revertedWith(
                      "ChickenGame__RoundInProgress"
                  )
              })
              it("should send balance to the winner, reward to the settler, and rake to the vault", async function () {
                  // place bets
                  await chickenGame.bet()
                  const chickenGameConnectedContract = chickenGame.connect(bettor)
                  await chickenGameConnectedContract.bet()
                  // wait interval
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  // settle round
                  const deployerInitialBalance = await mockUSDC.balanceOf(deployer.address)
                  const bettorInitialBalance = await mockUSDC.balanceOf(bettor.address)
                  const vaultInitialBalance = await mockUSDC.balanceOf(vault.address)
                  const contractInitialBalance = await chickenGame.getBalance()
                  await chickenGame.settleRound()
                  const deployerFinalBalance = await mockUSDC.balanceOf(deployer.address)
                  const bettorFinalBalance = await mockUSDC.balanceOf(bettor.address)
                  const vaultFinalBalance = await mockUSDC.balanceOf(vault.address)
                  const contractFinalBalance = await chickenGame.getBalance()
                  const edge = await chickenGame.getRake()
                  const rake = contractInitialBalance.mul(edge).div(10000)
                  const settleReward = await chickenGame.getSettleReward()
                  const winnings = contractInitialBalance.sub(rake).sub(settleReward)
                  assert.equal(
                      bettorFinalBalance.toString(),
                      bettorInitialBalance.add(winnings).toString()
                  )
                  assert.equal(
                      vaultFinalBalance.toString(),
                      vaultInitialBalance.add(rake).toString()
                  )
                  assert.equal(
                      deployerFinalBalance.toString(),
                      deployerInitialBalance.add(settleReward)
                  )
                  assert.equal(contractFinalBalance.toString(), "0")
              })
              it("should emit the right event", async function () {
                  // bettor bets, deployer settles
                  await chickenGame.connect(bettor).bet()
                  await chickenGame.connect(bettor).bet()
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const contractBalance = await chickenGame.getBalance()
                  await new Promise(async (resolve, reject) => {
                      chickenGame.once("RoundSettled", async (winner, amount, settler) => {
                          try {
                              const edge = await chickenGame.getRake()
                              const rake = contractBalance.mul(edge).div(10000)
                              const settleReward = await chickenGame.getSettleReward()
                              const expectedWinnings = contractBalance.sub(rake).sub(settleReward)
                              assert.equal(winner, bettor.address)
                              assert.equal(amount.toString(), expectedWinnings.toString())
                              assert.equal(settler, deployer.address)
                          } catch (e) {
                              reject(e)
                          }
                          resolve()
                      })
                      await chickenGame.settleRound()
                  })
              })
              it("should reset state variables", async function () {
                  await chickenGame.bet()
                  await chickenGame.bet()
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const contractInitialBalance = await chickenGame.getBalance()
                  await chickenGame.settleRound()
                  const edge = await chickenGame.getRake()
                  const rake = contractInitialBalance.mul(edge).div(10000)
                  const settleReward = await chickenGame.getSettleReward()
                  const winnings = contractInitialBalance.sub(rake).sub(settleReward)
                  const recentWinner = await chickenGame.getRecentWinner()
                  const recentWinAmount = await chickenGame.getRecentWinAmount()
                  const recentBettor = await chickenGame.getRecentBettor()
                  assert.equal(recentWinner, deployer.address)
                  assert.equal(recentWinAmount.toString(), winnings.toString())
                  assert.equal(recentBettor, ethers.constants.AddressZero)
              })
          })

          describe("setters", function () {
              it("should set rake", async function () {
                  const newRake = 1000
                  await chickenGame.setRake(newRake)
                  assert.equal((await chickenGame.getRake()).toString(), newRake.toString())
              })
              it("should revert if we try to set rake too high", async function () {
                  await expect(chickenGame.setRake(10000)).to.be.revertedWith(
                      "Cannot set rake to >100%."
                  )
              })
              it("should get settle reward", async function () {
                  const newSettleReward = 5 * 10 ** 6 // $5
                  await chickenGame.setSettleReward(newSettleReward)
                  assert.equal(
                      (await chickenGame.getSettleReward()).toString(),
                      newSettleReward.toString()
                  )
              })
          })
      })

module.exports.tags = ["all", "chickenGame"]
