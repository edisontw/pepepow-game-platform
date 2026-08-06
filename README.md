# PEPEPOW Game Platform

An open-source, mobile-first browser game platform for the PEPEPOW ecosystem.

> **Play first, chain later.**

## Current status — 6 playable games

The platform now contains six playable prototypes:

1. **Auto-Shooting Runner v0.3** — auto-fire runner with upgrades, soldiers, mini-boss and final boss.
2. **Pet Matching** — fast tile-link matching with combos, hints, reshuffles and local high score.
3. **Plant Defense v0.3** — lane defense with miners, upgradeable defenders, visible projectiles, bosses and endless progression.
4. **Idle Pet & Mining** — raise a Hash Hopper, mine HASH, upgrade the rig and unlock expeditions.
5. **BLOCKSCAPE 3D** — lightweight first-person maze exploration with five relics and a Node Gate objective.
6. **NODE TACTICS v0.2** — short tactical card runs with visible enemy intent, route choices, upgrades and Overclock difficulty.

Live platform: https://pepepow-game-platform.edisonhuang.chatgpt.site/

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
git clone https://github.com/edisontw/pepepow-game-platform.git
cd pepepow-game-platform
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

The original Runner is also kept as a standalone static game under `games/runner/` and can be opened or hosted without a build step.

## Repository structure

```text
pepepow-game-platform/
├── app/                 # Platform UI + games 02-06
├── public/runner/       # Runner used by the platform
├── games/runner/        # Standalone Runner build
├── docs/
├── package.json
└── README.md
```

## Design goals

- Fun and understandable before cryptocurrency features
- Mobile-first browser gameplay
- Short, replayable sessions
- Low server requirements
- Playable without an account or payment
- Optional PEPEPOW features only where they add value
- No pay-to-win mechanics
- Keep core gameplay independent from blockchain services

## PEPEPOW integration

Possible later integrations include challenge or tournament entry, community-funded prize pools, weekly high-score rewards, cosmetic unlocks, special events and player tips.

### Security principle

The game platform must **never request, upload, or store a player's private key or seed phrase**.

Wallet addresses may be used as identifiers. If wallet authentication is added later, signing should happen locally and the server should only verify the signature.

## Contributing

The project is in active prototype development. Gameplay ideas, testing feedback, issues and code contributions are welcome.

## License

MIT. See [LICENSE](LICENSE).
