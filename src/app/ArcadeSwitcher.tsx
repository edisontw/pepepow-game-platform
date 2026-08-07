"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RunnerGame from "@/games/runner/RunnerGame";
import PetMatchingGame from "@/games/pet-matching/PetMatchingGame";
import PlantDefenseGame from "@/games/plant-defense/PlantDefenseGame";
import IdlePetMiningGame from "@/games/idle-pet-mining/IdlePetMiningGame";
import ExplorationGame from "@/games/blockscape-3d/ExplorationGame";
import CardBattlerGame from "@/games/node-tactics/CardBattlerGame";

const games = [
  { id: "01", hash: "play-game", title: "Auto-Shooting Runner", short: "Runner", genre: "ACTION", time: "1–5 MIN", controls: "A/D · ←/→ · DRAG", component: <RunnerGame /> },
  { id: "02", hash: "play-pet-match", title: "Pet Matching", short: "Pet Match", genre: "PUZZLE", time: "ENDLESS", controls: "TAP / CLICK", component: <PetMatchingGame /> },
  { id: "03", hash: "play-plant-defense", title: "Plant Defense", short: "Defense", genre: "STRATEGY", time: "ENDLESS", controls: "TAP / CLICK", component: <PlantDefenseGame /> },
  { id: "04", hash: "play-idle-pet", title: "Idle Pet & Mining", short: "Pet & Mine", genre: "IDLE", time: "OPEN ENDED", controls: "TAP / CLICK", component: <IdlePetMiningGame /> },
  { id: "05", hash: "play-3d-world", title: "Blockscape 3D", short: "Blockscape", genre: "EXPLORE", time: "5–10 MIN", controls: "WASD · ARROWS", component: <ExplorationGame /> },
  { id: "06", hash: "play-card-battler", title: "Node Tactics", short: "Tactics", genre: "TACTICAL ROGUELITE", time: "8–15 MIN", controls: "TAP / CLICK", component: <CardBattlerGame /> },
] as const;

const descriptions: Record<string, string> = {
  "01": "Move left and right, auto-fire, stack upgrades and survive the run. Three lives are real; shields absorb one hit. Beat the mini-boss, then destroy the final boss.",
  "02": "Match identical PEPEPOW miners through paths with no more than two turns. Clear each board to enter the next level in an endless run as the timer, character mix and hints gradually get tougher.",
  "03": "Build a PEPEPOW crystal defense with miners, plants and crystal barriers. Clear five waves and a Node Breaker to enter the next stage; stages continue forever and grow harder as you climb.",
  "04": "Mine HASH and raise Glowtail, an original luminous cave pet that grows, changes gear, wanders and reacts as it levels. Upgrade the fictional rig, unlock short expeditions and collect finds; progress saves on this device.",
  "05": "Explore five distinct PEPEPOW zones in an endless run. Recover relics, evade three ghost types, use Pulse Cores and choose an upgrade after every Node Gate.",
  "06": "Build the network. Break the enemy chain. Spend 3 AP to deploy, move, attack and control linked Nodes across six changing objectives, then shape a new build with roguelite upgrades.",
};

export default function ArcadeSwitcher() {
  const [active, setActive] = useState(0);
  const game = games[active];

  const selectGame = useCallback((index: number, updateHash = true) => {
    setActive(index);
    if (updateHash) history.replaceState(null, "", `#${games[index].hash}`);
    requestAnimationFrame(() => {
      document.getElementById("play")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById(`arcade-tab-${games[index].id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  }, []);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.slice(1);
      const index = games.findIndex((entry) => entry.hash === hash);
      if (index >= 0) selectGame(index, false);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [selectGame]);

  const next = useMemo(() => (active + 1) % games.length, [active]);
  const previous = useMemo(() => (active - 1 + games.length) % games.length, [active]);

  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target = index;
    if (event.key === "ArrowRight") target = (index + 1) % games.length;
    else if (event.key === "ArrowLeft") target = (index - 1 + games.length) % games.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = games.length - 1;
    else return;

    event.preventDefault();
    selectGame(target);
    requestAnimationFrame(() => document.getElementById(`arcade-tab-${games[target].id}`)?.focus());
  };

  return (
    <section className="arcade-stage section" id="play" aria-label="PEPEPOW Arcade player">
      <div className="arcade-switcher">
        <div className="arcade-switcher-label"><span>NOW PLAYING</span><strong>{game.id} / 06</strong></div>
        <div className="arcade-tabs" role="tablist" aria-label="Choose a game">
          {games.map((entry, index) => (
            <button
              key={entry.id}
              id={`arcade-tab-${entry.id}`}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-controls="arcade-game-panel"
              tabIndex={active === index ? 0 : -1}
              className={active === index ? "active" : ""}
              onClick={() => selectGame(index)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              <b>{entry.id}</b><span>{entry.short}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="arcade-heading">
        <div>
          <span className="section-kicker">GAME {game.id} · {game.genre}</span>
          <h2>{game.title}</h2>
        </div>
        <p>{descriptions[game.id]}</p>
      </div>

      <div className="arcade-meta" aria-label="Current game information">
        <span><small>TYPE</small><strong>{game.genre}</strong></span>
        <span><small>SESSION</small><strong>{game.time}</strong></span>
        <span><small>CONTROLS</small><strong>{game.controls}</strong></span>
        <span><small>BUILD</small><strong>PLAYABLE</strong></span>
      </div>

      <div
        className="arcade-game"
        id="arcade-game-panel"
        role="tabpanel"
        aria-labelledby={`arcade-tab-${game.id}`}
      >
        <span id={game.hash} className="arcade-anchor" aria-hidden="true" />
        {game.component}
      </div>

      <div className="arcade-pager" aria-label="Switch games">
        <button type="button" onClick={() => selectGame(previous)}>← <span>PREV</span><strong>{games[previous].short}</strong></button>
        <a href="#top">TOP ↑</a>
        <button type="button" onClick={() => selectGame(next)}><span>NEXT</span><strong>{games[next].short}</strong> →</button>
      </div>
    </section>
  );
}
