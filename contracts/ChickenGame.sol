// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error ChickenGame__BetTooSmall();
error ChickenGame__BettingClosed();
error ChickenGame__RoundInProgress();
error ChickenGame__TransferFailed();

contract ChickenGame is Ownable {
    ERC20 USDC;

    uint256 private s_balance;
    uint256 private immutable i_betSize;
    uint256 private immutable i_interval;
    uint256 private s_lastBetTimestamp;
    uint16 private s_rake;
    uint256 private s_settleReward;
    address private s_recentBettor;
    address private s_recentWinner;
    uint256 private s_recentWinAmount;
    address payable private immutable i_vault;

    event BetPlaced(uint256 blockTimestamp, address bettor);
    event RoundSettled(address winner, uint256 amount, address settler);

    constructor(
        uint256 _betSize,
        uint256 _interval,
        uint16 _rake,
        uint256 _settleReward,
        address payable _vault,
        address _usdcAddress
    ) {
        USDC = ERC20(_usdcAddress);
        i_betSize = _betSize;
        i_interval = _interval;
        s_rake = _rake;
        s_settleReward = _settleReward;
        i_vault = _vault;
    }

    function bet() external {
        if (
            block.timestamp - s_lastBetTimestamp > i_interval &&
            USDC.balanceOf(address(this)) > i_betSize
        ) {
            revert ChickenGame__BettingClosed();
        }
        USDC.transferFrom(msg.sender, address(this), i_betSize);
        emit BetPlaced(block.timestamp, msg.sender);
        s_balance += i_betSize;
        s_recentBettor = msg.sender;
        s_lastBetTimestamp = block.timestamp;
    }

    function settleRound() external {
        if (!(block.timestamp - s_lastBetTimestamp > i_interval && s_balance >= 2 * i_betSize)) {
            revert ChickenGame__RoundInProgress();
        }
        uint256 rake = (s_balance * s_rake) / 10000;
        uint256 winnings = s_balance - rake - s_settleReward;
        USDC.transfer(s_recentBettor, winnings);
        USDC.transfer(i_vault, rake);
        USDC.transfer(msg.sender, s_settleReward);

        emit RoundSettled(s_recentBettor, winnings, msg.sender);
        s_recentWinner = s_recentBettor;
        s_recentWinAmount = winnings;
        s_recentBettor = address(0);
        s_balance = 0;
    }

    // Getters

    function getBetsize() public view returns (uint256) {
        return i_betSize;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getLastBetTimestamp() public view returns (uint256) {
        return s_lastBetTimestamp;
    }

    function getRake() public view returns (uint16) {
        return s_rake;
    }

    function getSettleReward() public view returns (uint256) {
        return s_settleReward;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRecentWinAmount() public view returns (uint256) {
        return s_recentWinAmount;
    }

    function getRecentBettor() public view returns (address) {
        return s_recentBettor;
    }

    function getBalance() public view returns (uint256) {
        return s_balance;
    }

    function getVaultAddress() public view returns (address) {
        return i_vault;
    }

    // Setters

    function setRake(uint16 _newrake) public onlyOwner {
        require(_newrake < 10000, "Cannot set rake to >100%.");
        s_rake = _newrake;
    }

    function setSettleReward(uint256 _newSettleReward) public onlyOwner {
        s_settleReward = _newSettleReward;
    }
}
