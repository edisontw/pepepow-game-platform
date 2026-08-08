# Plant Defense balance simulation

`npm run simulate:plant-defense` runs 4,536 deterministic seeded strategy trials against the same balance model imported by the game. No separate copy of enemy HP, speed, miner yield, wave size, projectile damage, boss scaling, or starting Energy is used.

The simulator compares defense-first, balanced, and miner-heavy purchase policies through wave 30 and reports win rate, median survival time, median resource state, optimal strategy, and whether one strategy dominates by a large margin.

The model is intended for regression and balance-direction analysis, not as a substitute for browser playtesting: spatial targeting and player reaction timing are deliberately summarized rather than replaced with invented game constants. Numerical balance changes should be made only when both this simulation and interactive tests support them.

The current production values remain unchanged. In particular, starting Energy stays at 1000 and miner stacking retains the existing diminishing-return floor so an early miner investment does not scale linearly forever.
