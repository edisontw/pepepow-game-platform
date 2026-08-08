# PEPEPOW Game Platform

An open-source, mobile-first browser arcade for the PEPEPOW ecosystem.

> **Play first, chain later.**

## Current status

The first six games are now playable and the public front page is intentionally simple: choose a game and start playing. No login, wallet or payment is required.

1. **Auto-Shooting Runner** — 2D movement, auto-fire action, weapon leveling, responsive fullscreen, three mini-bosses, a final boss, level summaries and endlessly harder stages.
2. **Pet Matching** — an endless miner-matching puzzle with rising difficulty, hints, reshuffles, music, and one +30 second continue per run.
3. **Plant Defense** — lane defense with Hash Miners, three POW Frog levels, Crystal Walls, recurring bosses, mining income and endless stage scaling.
4. **Idle Pet & Mining** — raise Glowtail, mine HASH, grow the fictional rig, explore expeditions and keep device-local progress.
5. **BLOCKSCAPE 3D** — first-person exploration across multiple zones with relics, ghosts, close-range combat, upgrades, a minimap and touch controls.
6. **NODE TACTICS** — a lightweight tactical roguelite built around 3 AP turns, node control, enemy intent, cards, upgrades and stronger AI pressure.

All six games remain browser-first and off-chain. PEPEPOW integration is optional future work and should not be required for core gameplay.

Live platform: https://pepepow-game-platform.edisonhuang.chatgpt.site/

## Architecture

The project is a **modular monolith**: one Next.js deployment today, with clear boundaries so games, persistence and blockchain infrastructure can evolve independently.

```text
pepepow-game-platform/
├── src/
│   ├── app/                         # Next.js pages + thin HTTP API routes
│   │   └── api/
│   │       ├── health/
│   │       └── chain/status/
│   ├── games/                       # One isolated feature folder per game
│   │   ├── runner/
│   │   ├── pet-matching/
│   │   ├── plant-defense/
│   │   ├── idle-pet-mining/
│   │   ├── blockscape-3d/
│   │   └── node-tactics/
│   ├── platform/                    # Cross-game registry/contracts
│   └── server/
│       ├── blockchain/
│       │   └── providers/           # Light API and local wallet RPC adapters
│       └── db/                      # Persistence contracts/adapters
├── public/
│   └── games/runner/                # Static Runner served by Next.js
├── standalone/
│   └── runner/                      # Independently hostable Runner
├── docs/
├── .env.example
└── package.json
```

The important dependency rule is:

```text
browser games -> platform/API -> server services -> DB or blockchain provider
```

Games never receive RPC credentials or database credentials. Private keys and seed phrases never belong in this application.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the planned data and blockchain boundaries.

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
git clone https://github.com/edisontw/pepepow-game-platform.git
cd pepepow-game-platform
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run lint
npm run build
npm start
```

The standalone Runner under `standalone/runner/` can still be hosted without Node.js or a build step.

## PEPEPOW providers

General chain lookups and payment checks use the public, read-only
[`light.pepepow.net`](https://light.pepepow.net/) gateway backed by ElectrumX.
The adapter uses `/api/status`, `/api/address/{address}`, `/api/tx/{txid}` and
`/api/payment/check`; it does not call node RPC.

The local wallet RPC client is reserved for future controlled server-side wallet
operations such as signed payouts. It is not the public data source.

Only server code may call these providers. The browser should use application endpoints such as `/api/chain/status`.

## Database direction

No database dependency is required for the six current games. Repository contracts now define the boundary for future scores and payment records.

For the first server-backed release, prefer SQLite when running on one persistent host. Move to PostgreSQL only when multi-instance deployment, higher write concurrency or operational needs justify it. Game code should not care which adapter is selected.

## Security

- Never request, upload or store player private keys or seed phrases.
- Keep wallet RPC bound to localhost or a private network.
- Never expose RPC credentials to client-side code.
- Treat a wallet address as an identifier, not proof of ownership.
- If wallet authentication is added, sign a server challenge locally and verify the signature server-side.
- Separate real PEPEPOW values from fictional in-game points.
- Require explicit confirmation policy before granting paid entries or rewards.

## Contributing

The platform is in active prototype development. Gameplay ideas, testing feedback, issues and code contributions are welcome.

## License

MIT. See [LICENSE](LICENSE).
