# Roadmap

This roadmap intentionally keeps gameplay ahead of blockchain integration.

## Phase 1 - Runner prototype

**Goal:** prove that the first game is fun on mobile and desktop.

- [x] Basic auto-shooting prototype
- [x] Left-right / drag controls
- [x] Health, score, and local high score
- [x] Boss and stage victory
- [x] Move the playable source into this repository
- [x] Add pulse, spread, and rapid weapon variety
- [x] Add drone, tank, and zigzag enemy patterns
- [x] Add boss projectile attacks
- [x] Add shield pickups and hit / pickup effects
- [ ] Tune difficulty, drop rates, and weapon balance
- [ ] Test on common mobile screen sizes
- [ ] Add audio and stronger game-feel feedback

## Phase 2 - Reusable game platform

**Goal:** make it easy to add more small games without coupling them to PEPEPOW.

- [ ] Define a small game registration / launcher interface
- [ ] Extract only genuinely shared UI and assets
- [ ] Keep games independently runnable
- [ ] Add local settings and accessibility controls
- [ ] Establish a simple score/result interface

Candidate future games include pet matching, lane defense, casual exploration, idle/collection, card, and tactical concepts.

## Phase 3 - Optional PEPEPOW layer

**Goal:** add blockchain features only where they improve the experience.

- [ ] Wallet-address support without custody
- [ ] Local signature-based authentication if needed
- [ ] Payment verification through PEPEPOW infrastructure
- [ ] Optional challenge / tournament entry
- [ ] Community prize pools and rewards
- [ ] Cosmetic or special-event unlocks

Core games must continue to work when blockchain services are unavailable.

## Phase 4 - Public self-hosting

**Goal:** let community developers clone, run, modify, and deploy the platform easily.

- [x] First game can run as static files with no build step
- [ ] Document platform configuration
- [ ] Provide example environment variables without secrets
- [ ] Add automated checks
- [ ] Document platform-level deployment
- [ ] Publish the first stable release

## Principles

1. Gameplay first.
2. Blockchain features are optional.
3. Never store private keys or seed phrases.
4. Avoid pay-to-win mechanics.
5. Prefer simple infrastructure and short feedback loops.
6. Only move shared code into the platform layer after reuse is proven.
