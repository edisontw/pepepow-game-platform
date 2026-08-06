# PEPEPOW Game Platform

An open-source browser game platform for the PEPEPOW ecosystem.

> **Play first, chain later.**

The project starts with small, replayable games that work well on mobile browsers. PEPEPOW integration is optional and should add value to the game rather than become a requirement to play.

## Current status

**Early development / Runner v0.2**

The first playable game is an **Auto-Shooting Runner**: move left and right, automatically shoot enemies, collect weapon upgrades, survive several enemy patterns, and defeat a projectile-firing boss.

- Source: [games/runner](games/runner)
- Live platform: https://pepepow-game-platform.edisonhuang.chatgpt.site
- No wallet, node, backend, or build step is required for the Runner.

## Design goals

- Fun and understandable before adding cryptocurrency features
- Mobile-first browser gameplay
- Short sessions, roughly 1-10 minutes
- Low server requirements
- Playable without an account or payment
- Optional PEPEPOW features
- Avoid pay-to-win mechanics
- Keep private keys and seed phrases out of the game platform
- Keep core gameplay independent from blockchain services

## Repository structure

```text
pepepow-game-platform/
├── games/
│   └── runner/
│       ├── index.html
│       ├── style.css
│       └── game.js
├── docs/
├── README.md
├── LICENSE
└── .gitignore
```

Each game should remain as independent as practical. Shared PEPEPOW or platform features can be added separately so a game can still run without a wallet, node, or ElectrumX service.

## First game: Auto-Shooting Runner

Runner v0.2 currently includes:

- Automatic shooting
- Drag / left-right movement
- Pulse, spread, and rapid weapon behavior
- Firepower and shield pickups
- Drone, tank, and zigzag enemies
- Boss movement and three-way projectile attacks
- Hit and pickup particle feedback
- Score and local high score
- Mobile-friendly controls

The immediate focus remains gameplay tuning, effects, balance, mobile testing, and replay value.

## PEPEPOW integration

Potential later integrations include:

- Optional challenge or tournament entry
- Community-funded prize pools
- Weekly high-score rewards
- Cosmetic unlocks
- Special event stages
- Player tips
- Payment verification using existing PEPEPOW infrastructure

Early versions may use normal wallet transfers and blockchain verification rather than complex smart-contract-style systems.

### Security principle

The game platform must **never request, upload, or store a player's private key or seed phrase**.

Wallet addresses may be used as identifiers. If wallet authentication is added later, signing should happen locally and the server should only verify the signature.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).

The immediate priority is to make the Runner genuinely fun, then establish a reusable platform structure, and only then add optional PEPEPOW functionality.

## Contributing

The project is in active prototype development. Issues, gameplay ideas, testing feedback, and code contributions are welcome.

## License

MIT. See [LICENSE](LICENSE).
