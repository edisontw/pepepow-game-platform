# Auto-Shooting Runner

The Runner is the first playable game prototype for PEPEPOW Game Platform.

## Run it

No build step, wallet, node, or backend is required.

1. Download or clone this repository.
2. Open `standalone/runner/index.html` in a modern browser.
3. Play with `Left / Right` or `A / D` on desktop, or drag on a phone.

Any static web server can host this folder as-is.

## v0.7 gameplay

- Automatic shooting
- `PULSE`, `SPREAD`, and `RAPID` weapon behavior
- Firepower level upgrades
- Shield pickups
- Detailed player, enemy, boss, and pickup sprites
- Armed enemies and progressively denser projectile pressure
- Three spaced mini-boss encounters before the final fortress
- Tougher fixed-position final boss with doubled health
- Flashing pickups and sound effects for combat, warnings, and rewards
- Hit, destruction, and pickup particle feedback
- Three real lives, shield-first damage, brief hit invulnerability, score, and device-local high score
- Mobile drag controls and desktop keyboard controls
- Fullscreen toggle plus automatic best-fit fullscreen on mobile at run start
- Extended single-run victory state

The hosted platform remains available at https://pepepow-game-platform.edisonhuang.chatgpt.site.

## Core loop

1. Move left and right.
2. Shoot automatically.
3. Destroy enemies and dodge pressure.
4. Pick up power, weapon, or shield drops.
5. Survive the escalating wave.
6. Defeat three mini-bosses, survive the escalating sectors, then destroy the final fortress.

## Blockchain boundary

Runner is intentionally playable without PEPEPOW services. Gameplay, moment-to-moment state, and local scores stay off-chain.

Wallet, payment, reward, and tournament features may be introduced later through optional platform-level interfaces. Never request or store a player's private key or seed phrase.

## Next gameplay targets

- Tune weapon balance and drop rates
- Add a second final-boss pattern / phase
- Test common mobile screen sizes and low-frame-rate devices
- Expand the results summary after each run
