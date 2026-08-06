# Auto-Shooting Runner

The Runner is the first playable game prototype for PEPEPOW Game Platform.

## Run it

No build step, wallet, node, or backend is required.

1. Download or clone this repository.
2. Open `games/runner/index.html` in a modern browser.
3. Play with `Left / Right` or `A / D` on desktop, or drag on a phone.

Any static web server can host this folder as-is.

## v0.2 gameplay

- Automatic shooting
- `PULSE`, `SPREAD`, and `RAPID` weapon behavior
- Firepower level upgrades
- Shield pickups
- Drone, tank, and zigzag enemy patterns
- Boss movement and three-way projectile attacks
- Hit, destruction, and pickup particle feedback
- Health, score, and device-local high score
- Mobile drag controls and desktop keyboard controls
- Single-stage victory state

The hosted platform remains available at https://pepepow-game-platform.edisonhuang.chatgpt.site.

## Core loop

1. Move left and right.
2. Shoot automatically.
3. Destroy enemies and dodge pressure.
4. Pick up power, weapon, or shield drops.
5. Survive the escalating wave.
6. Defeat the boss and beat your best score.

## Blockchain boundary

Runner is intentionally playable without PEPEPOW services. Gameplay, moment-to-moment state, and local scores stay off-chain.

Wallet, payment, reward, and tournament features may be introduced later through optional platform-level interfaces. Never request or store a player's private key or seed phrase.

## Next gameplay targets

- Tune weapon balance and drop rates
- Add a second boss pattern / phase
- Add audio and stronger game-feel feedback
- Test common mobile screen sizes and low-frame-rate devices
- Add a compact results summary after each run
