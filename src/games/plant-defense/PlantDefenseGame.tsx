"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ROWS = 5;
const COLS = 7;
type UnitType = "miner" | "frog" | "wall";
type Unit = { id: number; row: number; col: number; type: UnitType; hp: number; maxHp: number; level: number };
type Enemy = { id: number; row: number; x: number; hp: number; maxHp: number; kind: "drone" | "glitch" | "brute" | "boss" };
type Projectile = { id: number; row: number; x: number; damage: number };
type HitFx = { id: number; row: number; x: number; damage: number; ttl: number };
type Status = "ready" | "playing" | "won" | "lost";
type GameState = {
  status: Status;
  energy: number;
  score: number;
  core: number;
  wave: number;
  tick: number;
  spawned: number;
  units: Unit[];
  enemies: Enemy[];
  projectiles: Projectile[];
  hits: HitFx[];
  nextId: number;
  message: string;
};

const unitInfo: Record<UnitType, { name: string; cost: number; hp: number; icon: string; description: string }> = {
  miner: { name: "HASH MINER", cost: 50, hp: 95, icon: "⛏", description: "+25 energy / 6s · Lv.3" },
  frog: { name: "POW FROG", cost: 100, hp: 120, icon: "🐸", description: "Auto-fire lane · Lv.3" },
  wall: { name: "FIREWALL", cost: 75, hp: 360, icon: "▰", description: "High HP · Lv.3" },
};

const isBossWave = (wave: number) => wave % 5 === 0;
const getWaveTarget = (wave: number) => isBossWave(wave) ? 1 : 6 + ((wave - 1) % 5) * 2 + Math.floor((wave - 1) / 5) * 2;
const upgradeCost = (type: UnitType, level: number) => Math.ceil(unitInfo[type].cost * (0.65 + level * 0.25));
const levelScale = (level: number) => 1 + (level - 1) * 0.55;

const initialState = (): GameState => ({
  status: "ready", energy: 200, score: 0, core: 3, wave: 1, tick: 0, spawned: 0,
  units: [], enemies: [], projectiles: [], hits: [], nextId: 1,
  message: "Generate energy, build a defense, protect all 3 core nodes.",
});

export default function PlantDefenseGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<GameState>(() => initialState());
  const [selected, setSelected] = useState<UnitType>("frog");
  const [best, setBest] = useState(0);

  const saveBest = useCallback((score: number) => {
    setBest(current => {
      const next = Math.max(current, score);
      window.localStorage.setItem("pepepow-defense-best", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (game.status !== "playing") return;
    const timer = window.setInterval(() => {
      setGame(previous => {
        if (previous.status !== "playing") return previous;
        const next: GameState = { ...previous, tick: previous.tick + 1 };
        let units = previous.units.map(unit => ({ ...unit }));
        let enemies = previous.enemies.map(enemy => ({ ...enemy }));
        let projectiles = previous.projectiles.map(projectile => ({ ...projectile }));
        const hits = previous.hits.map(hit => ({ ...hit, ttl: hit.ttl - 1 })).filter(hit => hit.ttl > 0);
        let energy = previous.energy;
        let score = previous.score;
        let core = previous.core;
        let spawned = previous.spawned;
        let nextId = previous.nextId;
        let message = previous.message;

        // Hash Miners create more energy as they are upgraded.
        if (next.tick % 24 === 0) {
          const minerPower = units.filter(unit => unit.type === "miner").reduce((sum, unit) => sum + unit.level, 0);
          if (minerPower) energy += minerPower * 25;
        }

        const target = getWaveTarget(previous.wave);
        const bossWave = isBossWave(previous.wave);
        const sector = Math.floor((previous.wave - 1) / 5);
        const step = (previous.wave - 1) % 5;
        const spawnEvery = bossWave ? 1 : Math.max(7, 14 - step * 2 - Math.min(sector, 2));
        if (spawned < target && next.tick % spawnEvery === 0) {
          const kind: Enemy["kind"] = bossWave ? "boss" : previous.wave >= 3 && spawned % 5 === 2 ? "glitch" : previous.wave >= 2 && spawned % 4 === 3 ? "brute" : "drone";
          const maxHp = kind === "boss" ? 1700 + sector * 650 : kind === "brute" ? 180 + previous.wave * 34 : kind === "glitch" ? 55 + previous.wave * 18 : 72 + previous.wave * 28;
          const row = bossWave ? 2 : (spawned * 3 + previous.wave + sector) % ROWS;
          enemies.push({ id: nextId++, row, x: 6.72, hp: maxHp, maxHp, kind });
          spawned += 1;
          if (bossWave) message = `NODE BREAKER MK.${sector + 1} ONLINE — destroy it to secure this sector.`;
        }

        // POW Frogs launch visible projectiles once per second. Damage is applied only on impact.
        if (next.tick % 4 === 0) {
          for (const frog of units.filter(unit => unit.type === "frog")) {
            const targets = enemies.filter(enemy => enemy.row === frog.row && enemy.x > frog.col - 0.2).sort((a, b) => a.x - b.x);
            if (targets[0]) {
              const damage = 42 * levelScale(frog.level);
              projectiles.push({
                id: nextId++,
                row: frog.row,
                x: frog.col + 0.34,
                damage,
              });
            }
          }
        }

        // Move shots across the lane and resolve the first enemy they physically reach.
        const flying: Projectile[] = [];
        for (const projectile of projectiles) {
          const oldX = projectile.x;
          const newX = oldX + 0.72;
          const hitEnemy = enemies
            .filter(enemy => enemy.hp > 0 && enemy.row === projectile.row && enemy.x >= oldX - 0.18 && enemy.x <= newX + 0.28)
            .sort((a, b) => a.x - b.x)[0];
          if (hitEnemy) {
            const impactDamage = hitEnemy.kind === "boss" ? projectile.damage * 0.78 : projectile.damage;
            hitEnemy.hp -= impactDamage;
            hits.push({ id: nextId++, row: projectile.row, x: hitEnemy.x, damage: impactDamage, ttl: 3 });
          } else if (newX < COLS + 0.55) {
            flying.push({ ...projectile, x: newX });
          }
        }
        projectiles = flying;

        // Enemies advance unless a placed unit blocks their cell.
        for (const enemy of enemies) {
          if (enemy.hp <= 0) continue;
          const blocker = units
            .filter(unit => unit.row === enemy.row && unit.col <= enemy.x + 0.25)
            .sort((a, b) => b.col - a.col)
            .find(unit => Math.abs(enemy.x - unit.col) < 0.52);
          if (blocker) {
            blocker.hp -= enemy.kind === "boss" ? 28 : enemy.kind === "brute" ? 18 : enemy.kind === "glitch" ? 9 : 12;
          } else {
            const baseSpeed = Math.min(0.064, 0.034 + step * 0.006 + sector * 0.003);
            const speed = enemy.kind === "boss" ? 0.019 + sector * 0.002 : enemy.kind === "brute" ? baseSpeed * 0.72 : enemy.kind === "glitch" ? baseSpeed * 1.42 : baseSpeed;
            enemy.x -= speed;
          }
        }

        const killed = enemies.filter(enemy => enemy.hp <= 0);
        if (killed.length) score += killed.reduce((sum, enemy) => sum + (enemy.kind === "boss" ? 3000 : enemy.kind === "brute" ? 260 : 120), 0);
        enemies = enemies.filter(enemy => enemy.hp > 0);
        units = units.filter(unit => unit.hp > 0);

        const breached = enemies.filter(enemy => enemy.x < -0.25);
        if (breached.length) {
          core = Math.max(0, core - breached.length);
          enemies = enemies.filter(enemy => enemy.x >= -0.25);
          message = core ? `CORE HIT — ${core} node${core === 1 ? "" : "s"} still online.` : "NETWORK CORE OFFLINE.";
        }

        if (core <= 0) {
          window.setTimeout(() => saveBest(score), 0);
          return { ...next, energy, score, core: 0, spawned, units, enemies, projectiles: [], hits, nextId, status: "lost", message: "Network breached. Rebuild the grid and try again." };
        }

        if (spawned >= target && enemies.length === 0) {
          if (bossWave) {
            const finalScore = score + core * 750 + energy + previous.wave * 100;
            window.setTimeout(() => saveBest(finalScore), 0);
            return { ...next, energy, score: finalScore, core, spawned, units, enemies, projectiles: [], hits, nextId, status: "won", message: `NODE BREAKER DESTROYED — SECTOR ${Math.ceil(previous.wave / 5)} SECURED. Continue for a harder endless sector.` };
          }
          const newWave = previous.wave + 1;
          const waveBonus = 70 + Math.min(previous.wave * 10, 80);
          return { ...next, energy: energy + waveBonus, score, core, wave: newWave, tick: 0, spawned: 0, units, enemies, projectiles: [], hits, nextId, message: isBossWave(newWave) ? `BOSS WAVE ${newWave} — Node Breaker is approaching.` : `WAVE ${newWave} INBOUND — +${waveBonus} energy.` };
        }

        return { ...next, energy, score, core, spawned, units, enemies, projectiles, hits, nextId, message };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [game.status, saveBest]);

  const start = () => {
    setBest(Number(window.localStorage.getItem("pepepow-defense-best") || 0));
    setGame({ ...initialState(), status: "playing", message: "WAVE 1 · WARM-UP — 200 energy to build your first defense." });
  };

  const continueEndless = () => {
    setGame(previous => ({
      ...previous,
      status: "playing",
      wave: previous.wave + 1,
      tick: 0,
      spawned: 0,
      energy: previous.energy + 125,
      projectiles: [],
      hits: [],
      message: `ENDLESS SECTOR ${Math.floor(previous.wave / 5) + 1} — enemies are stronger. +125 energy.`,
    }));
  };

  const placeUnit = (row: number, col: number) => {
    if (game.status !== "playing") return;
    setGame(previous => {
      const existing = previous.units.find(unit => unit.row === row && unit.col === col);
      if (existing) {
        if (existing.type !== selected) return { ...previous, message: `Cell occupied by ${unitInfo[existing.type].name}. Select the same unit to upgrade it.` };
        if (existing.level >= 3) return { ...previous, message: `${unitInfo[existing.type].name} is already MAX Lv.3.` };
        const cost = upgradeCost(existing.type, existing.level);
        if (previous.energy < cost) return { ...previous, message: `Need ${cost} energy to upgrade ${unitInfo[existing.type].name}.` };
        const newLevel = existing.level + 1;
        const newMaxHp = Math.round(unitInfo[existing.type].hp * levelScale(newLevel));
        const upgraded = previous.units.map(unit => unit.id === existing.id ? { ...unit, level: newLevel, maxHp: newMaxHp, hp: Math.min(newMaxHp, unit.hp + (newMaxHp - unit.maxHp)) } : unit);
        return { ...previous, energy: previous.energy - cost, units: upgraded, message: `${unitInfo[existing.type].name} upgraded to Lv.${newLevel} for ${cost} energy.` };
      }
      const info = unitInfo[selected];
      if (previous.energy < info.cost) return { ...previous, message: `Need ${info.cost} energy for ${info.name}.` };
      return {
        ...previous,
        energy: previous.energy - info.cost,
        nextId: previous.nextId + 1,
        units: [...previous.units, { id: previous.nextId, row, col, type: selected, hp: info.hp, maxHp: info.hp, level: 1 }],
        message: `${info.name} deployed in lane ${row + 1}.`,
      };
    });
  };

  const toggleFullscreen = async () => {
    if (!gameRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameRef.current.requestFullscreen();
  };

  return (
    <div className="defense-shell" ref={gameRef} id="plant-defense">
      <div className="defense-topbar">
        <div><small>PEPEPOW ARCADE / GAME 03</small><strong>PLANT DEFENSE</strong></div>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>

      <div className="defense-stats" aria-label="Plant Defense game status">
        <div><small>ENERGY</small><strong className="energy">⚡ {game.energy}</strong></div>
        <div><small>WAVE</small><strong>{isBossWave(game.wave) ? `${game.wave} BOSS` : game.wave}</strong></div>
        <div><small>CORE</small><strong>{"◆".repeat(game.core)}<i>{"◇".repeat(3 - game.core)}</i></strong></div>
        <div><small>SCORE</small><strong>{game.score.toString().padStart(5, "0")}</strong></div>
        <div><small>BEST</small><strong>{best.toString().padStart(5, "0")}</strong></div>
      </div>

      <div className="defense-stage">
        <div className="defense-grid" role="grid" aria-label="Defense placement grid">
          {Array.from({ length: ROWS * COLS }, (_, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const unit = game.units.find(item => item.row === row && item.col === col);
            return (
              <button key={index} type="button" className={`defense-cell ${unit ? `has-unit ${unit.type}` : ""}`} onClick={() => placeUnit(row, col)} aria-label={`Lane ${row + 1}, cell ${col + 1}${unit ? `, ${unitInfo[unit.type].name}` : ""}`}>
                {unit && <><span>{unitInfo[unit.type].icon}<b className="unit-level">{unit.level === 3 ? "MAX" : `L${unit.level}`}</b></span><i style={{ width: `${Math.max(0, unit.hp / unit.maxHp) * 100}%` }} /></>}
              </button>
            );
          })}
        </div>

        <div className="core-rail" aria-hidden="true">{Array.from({ length: ROWS }, (_, row) => <span key={row}>◆</span>)}</div>
        <div className="enemy-layer" aria-hidden="true">
          {game.enemies.map(enemy => (
            <div key={enemy.id} className={`defense-enemy ${enemy.kind}`} style={{ top: `${(enemy.row + 0.5) * 20}%`, left: `${((enemy.x + 0.5) / COLS) * 100}%` }}>
              <span>{enemy.kind === "boss" ? "☠" : enemy.kind === "brute" ? "⬢" : enemy.kind === "glitch" ? "⚡" : "●"}</span>
              <i><b style={{ width: `${Math.max(0, enemy.hp / enemy.maxHp) * 100}%` }} /></i>
            </div>
          ))}
        </div>
        <div className="projectile-layer" aria-hidden="true">
          {game.projectiles.map(projectile => (
            <span key={projectile.id} className="frog-shot" style={{ top: `${(projectile.row + 0.5) * 20}%`, left: `${((projectile.x + 0.5) / COLS) * 100}%` }} />
          ))}
          {game.hits.map(hit => (
            <span key={hit.id} className="frog-hit" style={{ top: `${(hit.row + 0.5) * 20}%`, left: `${((hit.x + 0.5) / COLS) * 100}%` }}>−{Math.round(hit.damage)}</span>
          ))}
        </div>

        {(game.status === "ready" || game.status === "won" || game.status === "lost") && (
          <div className="defense-overlay">
            <span>{game.status === "ready" ? "LANE DEFENSE / PROTOTYPE 0.3" : game.status === "won" ? "SECTOR CLEAR" : "CORE LOST"}</span>
            <h3>{game.status === "ready" ? <>HOLD THE<br/>NETWORK.</> : game.status === "won" ? <>NODE BREAKER<br/>DOWN.</> : <>REBUILD.<br/>RETRY.</>}</h3>
            <p>{game.status === "ready" ? "Build across five lanes. Tap an existing unit with the same unit selected to upgrade it to Lv.3. Fast Glitches arrive from wave 3, and every 5th wave is a Node Breaker boss." : game.message}</p>
            <div className="defense-overlay-actions">
              {game.status === "won" && <button type="button" onClick={continueEndless}>CONTINUE ENDLESS</button>}
              <button type="button" className={game.status === "won" ? "secondary" : ""} onClick={start}>{game.status === "ready" ? "START DEFENSE" : "PLAY AGAIN"}</button>
            </div>
          </div>
        )}
      </div>

      <div className="defense-shop" aria-label="Choose a defense unit">
        {(Object.keys(unitInfo) as UnitType[]).map(type => {
          const info = unitInfo[type];
          return <button type="button" key={type} className={selected === type ? "selected" : ""} onClick={() => setSelected(type)}><span>{info.icon}</span><div><strong>{info.name}</strong><small>⚡ {info.cost}</small><em>{info.description}</em></div></button>;
        })}
      </div>
      <div className="defense-message"><span>STATUS</span><p>{game.message}</p><b>Tap same unit again to upgrade · Boss every 5 waves.</b></div>
    </div>
  );
}
