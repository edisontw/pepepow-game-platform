# Architecture

## Why a modular monolith

PEPEPOW Arcade currently has six browser games but no requirement for independent game servers. A modular monolith keeps deployment inexpensive and simple while creating boundaries that can later be extracted without rewriting the games.

Do not split this into microservices until there is a concrete scaling or ownership reason.

## Layers

| Layer | Owns | Must not own |
|---|---|---|
| `src/games/` | game rules, controls, game-local UI | DB/RPC credentials, blockchain calls |
| `src/platform/` | game registry, shared contracts, cross-game UI | provider-specific infrastructure |
| `src/app/api/` | HTTP validation and responses | business logic or direct database queries |
| `src/server/db/` | persistence interfaces and adapters | game rendering |
| `src/server/blockchain/` | PEPEPOW provider selection and normalization | private keys in browser code |

## Adding a game

Create `src/games/<slug>/`, keep game-specific state inside it, and add its metadata to `src/platform/games.ts`. A game should remain playable when the database and PEPEPOW provider are unavailable unless the mode explicitly requires them.

Large static/legacy game bundles can live under `public/games/<slug>/`. Independently distributable builds belong under `standalone/<slug>/`.

## Data model direction

Start with server-side persistence only when a feature needs it. Suggested first tables:

| Table | Purpose |
|---|---|
| `players` | internal player ID and optional wallet address |
| `game_sessions` | authoritative start/end metadata for server-backed modes |
| `scores` | completed scores eligible for leaderboards |
| `payment_intents` | expected address, amount, purpose, expiry |
| `payments` | observed txid, confirmations, verification state |
| `rewards` | reward decision, amount, destination and payout state |
| `audit_log` | security-sensitive state transitions |

Do not use wallet addresses as database primary keys. Addresses can change and one player may eventually control more than one address.

For a single persistent PEPEPOW host, SQLite is a good first adapter. Keep all access behind repository interfaces so PostgreSQL can replace it later without changing game modules.

## Blockchain provider boundary

`ChainProvider` currently exposes:

- chain height
- transaction lookup
- address balance lookup

Two adapters are prepared:

### Light API

`LightApiProvider` follows the REST endpoints documented by `edisontw/pepew-api`:

- `GET /v1/chain/height`
- `GET /v1/tx/:txid`
- `GET /v1/addr/:address/balance`

Use this when the platform should not depend directly on a local node or when a public/community API is acceptable.

### Local wallet RPC

`WalletRpcProvider` connects server-to-server, normally to `127.0.0.1:8093`. Credentials are read only from environment variables. Never proxy arbitrary RPC methods from the browser.

Use this when the application host has its own PEPEPOW node/wallet and needs independent verification or later controlled payout functionality.

## Recommended payment flow

1. Browser requests a payment intent from the platform API.
2. Server stores expected amount, destination, purpose and expiry.
3. Player sends PEPEPOW with their own wallet.
4. A server worker verifies the transaction through the selected `ChainProvider`.
5. Server waits for the configured confirmation policy.
6. A database transaction marks the payment confirmed and grants the entry/unlock exactly once.
7. Reward payout, if any, is a separate server-side action with an audit record.

Never treat a client-submitted txid alone as proof of payment. Verify destination, amount, chain status and replay/idempotency server-side.

## API direction

Current:

- `GET /api/health` - application health without requiring chain availability.
- `GET /api/chain/status` - selected provider + live chain height.

Later route groups should stay resource-oriented:

```text
/api/games/:game/sessions
/api/games/:game/scores
/api/leaderboards/:game
/api/payments/intents
/api/payments/:id
/api/rewards/:id
```

Background confirmation/payout work should not run inside game components.

## Deployment stages

### Stage A - now

One Next.js service, six games, local browser persistence, optional read-only chain status.

### Stage B - first platform backend

Next.js + SQLite + server-side score/payment APIs. Read-only chain verification uses Light API by default.

### Stage C - PEPEPOW host integration

Run PEPEPOW RPC on localhost/private networking, switch provider using environment configuration, and add a separate background worker for confirmations/rewards.

### Stage D - only if needed

Move SQLite to PostgreSQL and separate workers/API services when traffic or operations justify it.
