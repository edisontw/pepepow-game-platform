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

## Shared platform contracts

Cross-game capabilities live under `src/shared/` with separate `audio`, `ui`, `input`, `storage`, `api`, `wallet`, and `rewards` boundaries. The current API/wallet/reward implementations are deliberately safe mocks:

- `GameAPI.getPlayer()` returns a local anonymous identity.
- `GameAPI.submitScore()` rejects client scores as `untrusted-client` until an authoritative server verifier exists.
- `GameAPI.getLeaderboard()` returns no trusted entries.
- `WalletAPI.getAddress()` / `getBalance()` expose no real wallet.
- `RewardAPI.claim()` never creates a real reward.

Games must not call PEPEPOW RPC directly. Future browser chain reads should go through platform API routes backed by the ElectrumX-based Light API. Wallet RPC, if ever enabled for controlled payouts, remains server-only.

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

The read-only `ChainProvider` currently exposes:

- chain height
- transaction lookup
- address balance lookup
- address-level payment check

### Light API

`LightApiProvider` calls the public ElectrumX-backed gateway at
`light.pepepow.net`:

- `GET /api/status`
- `GET /api/address/{address}`
- `GET /api/tx/{txid}`
- `GET /api/payment/check?address={address}&amount={amount}`

This is the platform's general chain-data boundary. It does not invoke the
PEPEPOW node RPC directly.

### Local wallet RPC

`WalletRpcClient` connects server-to-server, normally to `127.0.0.1:8093`.
Credentials are read only from environment variables. Never proxy arbitrary RPC
methods from the browser.

It is reserved for future controlled wallet operations such as payouts when the
application host has its own PEPEPOW wallet. It is not used for public chain
lookups or payment checks.

## Recommended payment flow

1. Browser requests a payment intent from the platform API.
2. Server stores expected amount, destination, purpose and expiry.
3. Player sends PEPEPOW with their own wallet.
4. A server worker verifies the transaction through the Light API `ChainProvider`.
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

Run PEPEPOW wallet RPC on localhost/private networking for controlled payout
operations, while continuing to use Light API for public chain queries and
payment verification. Add a separate background worker for confirmations and
rewards.

### Stage D - only if needed

Move SQLite to PostgreSQL and separate workers/API services when traffic or operations justify it.
