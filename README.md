# Chicken-style gambling game

This project is a fully on-chain public gambling game. Users may place USDC bets of a predetermined size in hopes of winning the contracts entire balance.
A winner is chosen as the most recent bettor once a predetermined interval has passed since the last bet. Once a winner is picked, bets are no longer accepted
until the round is settled by calling the settleRound() function. Any user may do this and is paid out a fixed USDC amount from the pot for their troubles.

An alternative version of this project is found at github.com/OllieM26/ChickenGame, that instead uses Chainlink Keepers to settle each round.
