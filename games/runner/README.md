# Auto-Shooting Runner

The Runner is the first playable prototype for PEPEPOW Game Platform.

## Core loop

1. The player moves left and right.
2. The character shoots automatically.
3. Enemies and obstacles create pressure.
4. Pickups increase firepower or change the run.
5. The stage becomes harder over a short session.
6. A boss encounter ends the stage.

## Prototype features

The current live prototype includes:

- Desktop keyboard and mobile drag controls
- Automatic shooting
- Standard and tougher enemies
- Firepower pickups
- Health and scoring
- Local high score
- Boss encounter and victory state

Live prototype: https://pepepow-game-platform.edisonhuang.chatgpt.site

## v0.2 focus

Before adding PEPEPOW integration, improve the game itself:

- Multiple weapon behaviors
- More distinct enemy patterns
- Boss attack patterns
- Better hit and pickup feedback
- Better difficulty pacing
- Stronger replay value
- Mobile feel and performance

## Blockchain boundary

Runner gameplay must remain playable without PEPEPOW services.

Wallet, payment, reward, or tournament features should be introduced through optional platform-level interfaces later. Never request or store a player's private key or seed phrase.

## Source status

The playable prototype currently lives in the hosted site. Its source implementation will be brought into this directory in the next development step.
