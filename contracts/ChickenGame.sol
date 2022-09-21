// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error ChickenGame__BetTooSmall();
error ChickenGame__BettingClosed();
error ChickenGame__UpkeepNotNeeded();
error ChickenGame__TransferFailed();

contract ChickenGame is Ownable {
    uint256 private immutable i_betSize;
    uint256 private immutable i_interval;
    uint256 private s_lastBetTimestamp;
    uint256 private immutable i_edge;
    address private s_recentBettor;
    address private s_recentWinner;
    uint256 private s_recentWinAmount;
    address payable private immutable i_vault;

    event BetPlaced(address bettor);
    event RoundSettled(address winner, uint256 amount);

    constructor(
        uint256 _betSize,
        uint256 _interval,
        uint256 _edge,
        address payable _vault
    ) {
        i_betSize = _betSize;
        i_interval = _interval;
        i_edge = _edge;
        i_vault = _vault;
    }

    function bet() external payable {
        if (msg.value < i_betSize) {
            revert ChickenGame__BetTooSmall();
        }
        if (
            block.timestamp - s_lastBetTimestamp > i_interval && address(this).balance > msg.value
        ) {
            revert ChickenGame__BettingClosed();
        }
        emit BetPlaced(msg.sender);
        s_recentBettor = msg.sender;
        s_lastBetTimestamp = block.timestamp;
    }

    function checkUpkeep(
        bytes memory /* checkData */ /*override*/
    )
        public
        view
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool timePassed = (block.timestamp - s_lastBetTimestamp) > i_interval;
        bool hasBalance = address(this).balance > i_betSize;
        upkeepNeeded = timePassed && hasBalance;
    }

    function performUpkeep(
        bytes calldata /* performData */ /*override*/
    ) external {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert ChickenGame__UpkeepNotNeeded();
        }
        uint256 balance = (address(this).balance * (10000 - i_edge)) / 10000;
        (bool success, ) = s_recentBettor.call{value: balance}("");
        if (!success) {
            revert ChickenGame__TransferFailed();
        }

        emit RoundSettled(msg.sender, balance);
        s_recentWinner = s_recentBettor;
        s_recentWinAmount = balance;
        i_vault.transfer(address(this).balance);
        s_recentBettor = address(0);
    }

    function getBetsize() public view returns (uint256) {
        return i_betSize;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getLastBetTimestamp() public view returns (uint256) {
        return s_lastBetTimestamp;
    }

    function getEdge() public view returns (uint256) {
        return i_edge;
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
        return address(this).balance;
    }

    function getVaultAddress() public view returns (address) {
        return i_vault;
    }
}
