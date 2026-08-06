# PEPEPOW Game Platform

An open-source, mobile-first browser arcade for the PEPEPOW ecosystem.

> **Play first, chain later.**

## Current status

Six playable games are included:

1. **Auto-Shooting Runner v0.3**
2. **Pet Matching v0.1**
3. **Plant Defense v0.3**
4. **Idle Pet & Mining v0.1**
5. **BLOCKSCAPE 3D v0.1**
6. **NODE TACTICS v0.2**

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

Set `PEPEPOW_CHAIN_PROVIDER` to:

- `light-api` (default): uses the existing PEPEW/PEPEPOW REST service.
- `wallet-rpc`: uses a PEPEPOW daemon/wallet on the application host through localhost JSON-RPC.

The current REST adapter follows the API exposed by [edisontw/pepew-api](https://github.com/edisontw/pepew-api), including chain height, transaction and address-balance endpoints.

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
