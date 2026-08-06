# PEPEPOW Game Platform

An open-source browser game platform for the PEPEPOW ecosystem.

> **Play first, chain later.**

The project starts with small, replayable games that work well on mobile browsers. PEPEPOW integration is optional and should add value to the game rather than become a requirement to play.

## Current status

**Early development / v0.1**

The first playable concept is an **Auto-Shooting Runner**: move left and right, automatically shoot enemies, collect firepower upgrades, and defeat a boss at the end of a short run.

A live prototype is currently available at:

**https://pepepow-game-platform.edisonhuang.chatgpt.site**

The source version of the Runner will be moved into this repository as the next development step.

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

## Planned repository structure

```text
pepepow-game-platform/
├── games/
│   └── runner/
├── shared/
├── docs/
├── README.md
├── LICENSE
└── .gitignore
```

Each game should remain as independent as practical. Shared PEPEPOW or platform features can be added separately so a game can still run without a wallet, node, or ElectrumX service.

## First game: Auto-Shooting Runner

Planned gameplay direction:

- Automatic shooting
- Drag / left-right movement
- Enemy waves and tougher enemy types
- Weapon and firepower upgrades
- Short stage progression
- Boss encounter
- Score and local high score
- Mobile-friendly controls

The prototype comes first. Weapon variety, enemy patterns, effects, balance, and replay value should be improved before cryptocurrency features become a focus.

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

The project is still at an early prototype stage. Issues, gameplay ideas, testing feedback, and code contributions will be welcome as the source version becomes available.

## License

MIT. See [LICENSE](LICENSE).
