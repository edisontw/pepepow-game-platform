"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_ENERGY_CAP,
  COLS,
  FROG_FIRE_TICKS,
  getArmorScale,
  getEnemyAttack,
  getEnemyKind,
  getEnemyMaxHp,
  getEnemyRow,
  getEnemySpeed,
  getEnergyCap,
  getMinerIncome,
  getProjectileDamage,
  getSpawnEvery,
  getStage,
  getStageWave,
  getWaveTarget,
  getWaveTrait,
  isBossWave,
  killBounty,
  killScore,
  levelScale,
  MINER_INCOME_TICKS,
  PROJECTILE_STEP,
  ROWS,
  STARTING_ENERGY,
  unitInfo,
  unitInvestedCost,
  upgradeCost,
} from "./balance-model.mjs";

type UnitType = "miner" | "frog" | "wall";
type BuildChoice = UnitType | "recycle";
type Unit = { id: number; row: number; col: number; type: UnitType; hp: number; maxHp: number; level: number };
type EnemyKind = "drone" | "glitch" | "brute" | "shield" | "crusher" | "boss";
type Enemy = { id: number; row: number; x: number; hp: number; maxHp: number; kind: EnemyKind };
type Projectile = { id: number; row: number; x: number; damage: number };
type HitFx = { id: number; row: number; x: number; damage: number; ttl: number };
type Status = "ready" | "playing" | "won" | "lost";
type GameState = {
  status: Status;
  energy: number;
  score: number;
  kills: number;
  stageStartScore: number;
  stageStartKills: number;
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

const initialState = (): GameState => ({
  status: "ready", energy: STARTING_ENERGY, score: 0, kills: 0, stageStartScore: 0, stageStartKills: 0,
  core: 3, wave: 1, tick: 0, spawned: 0,
  units: [], enemies: [], projectiles: [], hits: [], nextId: 1,
  message: "Generate energy, build a defense, protect all 3 core nodes.",
});

export default function PlantDefenseGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<GameState>(() => initialState());
  const [selected, setSelected] = useState<BuildChoice>("frog");
  const [best, setBest] = useState(0);
  const [bestStage, setBestStage] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [waveAlert, setWaveAlert] = useState<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const soundOnRef = useRef(true);
  const previousStatusRef = useRef<Status>("ready");
  const previousCoreRef = useRef(3);
  const lastHitIdRef = useRef(0);
  const lastHitSoundAtRef = useRef(0);

  const playSfx = useCallback((kind: "select" | "place" | "upgrade" | "recycle" | "wave" | "boss" | "hit" | "breach" | "clear" | "lost") => {
    if (!soundOnRef.current || typeof window === "undefined") return;
    const context = audioRef.current ?? new window.AudioContext();
    audioRef.current = context;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime + 0.01;
    const tone = (frequency: number, start: number, duration: number, volume: number, type: OscillatorType = "sine", endFrequency = frequency) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now + start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, endFrequency), now + start + duration);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + duration + 0.02);
    };

    if (kind === "select") tone(520, 0, 0.07, 0.022, "triangle", 650);
    if (kind === "place") { tone(210, 0, 0.11, 0.035, "square", 320); tone(520, 0.07, 0.1, 0.025, "triangle", 720); }
    if (kind === "upgrade") { tone(420, 0, 0.1, 0.028, "triangle", 520); tone(620, 0.09, 0.12, 0.03, "triangle", 830); }
    if (kind === "recycle") { tone(380, 0, 0.08, 0.025, "square", 230); tone(190, 0.07, 0.11, 0.022, "triangle", 310); }
    if (kind === "wave") { tone(185, 0, 0.18, 0.045, "sawtooth", 150); tone(245, 0.25, 0.2, 0.045, "sawtooth", 185); }
    if (kind === "boss") { tone(105, 0, 0.28, 0.055, "sawtooth", 72); tone(105, 0.34, 0.3, 0.055, "sawtooth", 62); }
    if (kind === "hit") tone(780, 0, 0.055, 0.013, "square", 360);
    if (kind === "breach") { tone(125, 0, 0.32, 0.055, "square", 48); tone(72, 0.08, 0.36, 0.045, "sawtooth", 42); }
    if (kind === "clear") { tone(360, 0, 0.14, 0.035, "triangle", 480); tone(520, 0.12, 0.16, 0.036, "triangle", 700); tone(780, 0.27, 0.24, 0.04, "triangle", 980); }
    if (kind === "lost") { tone(260, 0, 0.22, 0.045, "sawtooth", 180); tone(170, 0.2, 0.36, 0.05, "sawtooth", 72); }
  }, []);

  const playMusic = useCallback(() => {
    if (!soundOnRef.current || typeof window === "undefined") return;
    const music = musicRef.current ?? new Audio("/plant-defense/Defending_the_Morning_Bloom.mp3");
    if (!musicRef.current) {
      music.loop = true;
      music.preload = "auto";
      music.volume = 0.22;
      musicRef.current = music;
    }
    void music.play().catch(() => {
      // Browsers may defer playback until the player's next direct interaction.
    });
  }, []);

  const pauseMusic = useCallback(() => {
    musicRef.current?.pause();
  }, []);

  const saveBest = useCallback((score: number) => {
    setBest(current => {
      const next = Math.max(current, score);
      window.localStorage.setItem("pepepow-defense-best", String(next));
      return next;
    });
  }, []);

  const saveStage = useCallback((stage: number) => {
    setBestStage(current => {
      const next = Math.max(current, stage);
      window.localStorage.setItem("pepepow-defense-stage", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      const storedSound = window.localStorage.getItem("pepepow-defense-sound") !== "off";
      soundOnRef.current = storedSound;
      setSoundOn(storedSound);
      setBest(Number(window.localStorage.getItem("pepepow-defense-best") || 0));
      setBestStage(Number(window.localStorage.getItem("pepepow-defense-stage") || 1));
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  useEffect(() => {
    if (game.status === "playing" && soundOn) playMusic();
    else pauseMusic();
  }, [game.status, soundOn, playMusic, pauseMusic]);

  useEffect(() => () => {
    musicRef.current?.pause();
  }, []);

  useEffect(() => {
    if (game.status !== "playing") {
      const clearAlert = window.setTimeout(() => setWaveAlert(null), 0);
      return () => window.clearTimeout(clearAlert);
    }
    const showAlert = window.setTimeout(() => setWaveAlert(game.wave), 0);
    playSfx(isBossWave(game.wave) ? "boss" : "wave");
    const timeout = window.setTimeout(() => setWaveAlert(null), 1800);
    return () => {
      window.clearTimeout(showAlert);
      window.clearTimeout(timeout);
    };
  }, [game.status, game.wave, playSfx]);

  useEffect(() => {
    if (previousStatusRef.current !== game.status) {
      if (game.status === "won") playSfx("clear");
      if (game.status === "lost") playSfx("lost");
      previousStatusRef.current = game.status;
    }
    if (game.core < previousCoreRef.current && game.status === "playing") playSfx("breach");
    previousCoreRef.current = game.core;
  }, [game.status, game.core, playSfx]);

  useEffect(() => {
    const newestHit = game.hits.reduce((latest, hit) => Math.max(latest, hit.id), 0);
    if (newestHit > lastHitIdRef.current) {
      const now = performance.now();
      if (now - lastHitSoundAtRef.current > 105) {
        playSfx("hit");
        lastHitSoundAtRef.current = now;
      }
      lastHitIdRef.current = newestHit;
    }
  }, [game.hits, playSfx]);

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
        let kills = previous.kills;
        let core = previous.core;
        let spawned = previous.spawned;
        let nextId = previous.nextId;
        let message = previous.message;

        const target = getWaveTarget(previous.wave);
        const bossWave = isBossWave(previous.wave);
        const stage = getStage(previous.wave);

        // Hash Miners remain useful, but stacking them has diminishing returns.
        // Mining difficulty also rises gradually with each cleared stage, while
        // BLACKOUT/BOSS waves temporarily reduce production further.
        if (next.tick % MINER_INCOME_TICKS === 0) {
          if (units.some(unit => unit.type === "miner")) {
            const mined = getMinerIncome(units, previous.wave);
            energy = Math.min(getEnergyCap(previous.wave), energy + mined);
          }
        }

        const spawnEvery = getSpawnEvery(previous.wave);
        if (spawned < target && next.tick >= 8 && next.tick % spawnEvery === 0) {
          const kind = getEnemyKind(previous.wave, spawned) as EnemyKind;
          const maxHp = getEnemyMaxHp(previous.wave, kind);
          const row = getEnemyRow(previous.wave, spawned);
          enemies.push({ id: nextId++, row, x: 6.72, hp: maxHp, maxHp, kind });
          spawned += 1;
          if (bossWave) message = `NODE BREAKER MK.${stage} ONLINE — destroy it to secure this sector.`;
        }

        // POW Frogs launch visible projectiles once per second. Damage is applied only on impact.
        if (next.tick % FROG_FIRE_TICKS === 0) {
          for (const frog of units.filter(unit => unit.type === "frog")) {
            const targets = enemies.filter(enemy => enemy.row === frog.row && enemy.x > frog.col - 0.2).sort((a, b) => a.x - b.x);
            if (targets[0]) {
              const damage = getProjectileDamage(frog.level);
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
          const newX = oldX + PROJECTILE_STEP;
          const hitEnemy = enemies
            .filter(enemy => enemy.hp > 0 && enemy.row === projectile.row && enemy.x >= oldX - 0.18 && enemy.x <= newX + 0.28)
            .sort((a, b) => a.x - b.x)[0];
          if (hitEnemy) {
            const armorScale = getArmorScale(hitEnemy.kind);
            const impactDamage = projectile.damage * armorScale;
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
            blocker.hp -= getEnemyAttack(previous.wave, enemy.kind, blocker.type);
          } else {
            enemy.x -= getEnemySpeed(previous.wave, enemy.kind);
          }
        }

        const killed = enemies.filter(enemy => enemy.hp <= 0);
        if (killed.length) {
          kills += killed.length;
          score += killed.reduce((sum, enemy) => sum + killScore(enemy.kind), 0);
          const bounty = killed.reduce((sum, enemy) => sum + killBounty(enemy.kind), 0) + killed.filter(enemy => enemy.kind === "boss").length * stage * 20;
          energy = Math.min(getEnergyCap(previous.wave), energy + bounty);
        }
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
          return { ...next, energy, score, kills, core: 0, spawned, units, enemies, projectiles: [], hits, nextId, status: "lost", message: "All core nodes were breached. Your high score is safe — rebuild a stronger formation and try again." };
        }

        if (spawned >= target && enemies.length === 0) {
          if (bossWave) {
            const finalScore = score + core * 750 + energy + previous.wave * 100;
            window.setTimeout(() => saveBest(finalScore), 0);
            window.setTimeout(() => saveStage(getStage(previous.wave)), 0);
            return { ...next, energy, score: finalScore, kills, core, spawned, units, enemies, projectiles: [], hits, nextId, status: "won", message: `Node Breaker destroyed. Your formation carries forward with repairs, bonus energy and one restored core.` };
          }
          const newWave = previous.wave + 1;
          const waveBonus = 55 + Math.min(previous.wave * 8, 70);
          return {
            ...next,
            energy: Math.min(getEnergyCap(newWave), energy + waveBonus),
            score,
            kills,
            core,
            wave: newWave,
            tick: 0,
            spawned: 0,
            units,
            enemies,
            projectiles: [],
            hits,
            nextId,
            message: isBossWave(newWave)
              ? `STAGE ${getStage(newWave)} · BOSS WAVE 5/5 — Node Breaker approaching.`
              : `STAGE ${getStage(newWave)} · WAVE ${getStageWave(newWave)}/5 — +${waveBonus} energy.`,
          };
        }

        return { ...next, energy, score, kills, core, spawned, units, enemies, projectiles, hits, nextId, message };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [game.status, saveBest, saveStage]);

  const start = () => {
    lastHitIdRef.current = 0;
    previousCoreRef.current = 3;
    playSfx("select");
    playMusic();
    setGame({ ...initialState(), status: "playing", message: `STAGE 1 · WAVE 1/5 — ${STARTING_ENERGY} energy. Opening raid uses the center 3 lanes; build firepower before expanding.` });
  };

  const nextStage = () => {
    playMusic();
    setGame(previous => ({
      ...previous,
      status: "playing",
      wave: previous.wave + 1,
      tick: 0,
      spawned: 0,
      energy: Math.min(getEnergyCap(previous.wave + 1), previous.energy + 120),
      core: Math.min(3, previous.core + 1),
      stageStartScore: previous.score,
      stageStartKills: previous.kills,
      units: previous.units.map(unit => ({ ...unit, hp: Math.min(unit.maxHp, unit.hp + unit.maxHp * 0.35) })),
      projectiles: [],
      hits: [],
      message: `STAGE ${getStage(previous.wave + 1)} · WAVE 1/5 — stronger enemies. +120 energy · defenses repaired · +1 core.`,
    }));
    saveStage(getStage(game.wave + 1));
  };

  const placeUnit = (row: number, col: number) => {
    if (game.status !== "playing") return;
    setGame(previous => {
      const existing = previous.units.find(unit => unit.row === row && unit.col === col);
      if (selected === "recycle") {
        if (!existing) return { ...previous, message: "RECYCLE selected — tap a deployed unit to remove it." };
        const refund = Math.max(1, Math.round(unitInvestedCost(existing) * 0.35));
        window.setTimeout(() => playSfx("recycle"), 0);
        return {
          ...previous,
          energy: Math.min(getEnergyCap(previous.wave), previous.energy + refund),
          units: previous.units.filter(unit => unit.id !== existing.id),
          message: `${unitInfo[existing.type].name} recycled. +${refund} energy recovered (35%).`,
        };
      }
      if (existing) {
        if (existing.type !== selected) return { ...previous, message: `Cell occupied by ${unitInfo[existing.type].name}. Select the same unit to upgrade it.` };
        if (existing.level >= 3) return { ...previous, message: `${unitInfo[existing.type].name} is already MAX Lv.3.` };
        const cost = upgradeCost(existing.type, existing.level);
        if (previous.energy < cost) return { ...previous, message: `Need ${cost} energy to upgrade ${unitInfo[existing.type].name}.` };
        const newLevel = existing.level + 1;
        const newMaxHp = Math.round(unitInfo[existing.type].hp * levelScale(newLevel));
        const upgraded = previous.units.map(unit => unit.id === existing.id ? { ...unit, level: newLevel, maxHp: newMaxHp, hp: Math.min(newMaxHp, unit.hp + (newMaxHp - unit.maxHp)) } : unit);
        window.setTimeout(() => playSfx("upgrade"), 0);
        return { ...previous, energy: previous.energy - cost, units: upgraded, message: `${unitInfo[existing.type].name} upgraded to Lv.${newLevel} for ${cost} energy.` };
      }
      const info = unitInfo[selected];
      if (previous.energy < info.cost) return { ...previous, message: `Need ${info.cost} energy for ${info.name}.` };
      window.setTimeout(() => playSfx("place"), 0);
      return {
        ...previous,
        energy: previous.energy - info.cost,
        nextId: previous.nextId + 1,
        units: [...previous.units, { id: previous.nextId, row, col, type: selected, hp: info.hp, maxHp: info.hp, level: 1 }],
        message: `${info.name} deployed in lane ${row + 1}.`,
      };
    });
  };

  const chooseUnit = (type: BuildChoice) => {
    setSelected(type);
    playSfx("select");
  };

  const toggleSound = () => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    window.localStorage.setItem("pepepow-defense-sound", next ? "on" : "off");
    if (next) {
      playSfx("select");
      if (game.status === "playing") playMusic();
    } else {
      pauseMusic();
    }
  };

  const toggleFullscreen = async () => {
    if (!gameRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameRef.current.requestFullscreen();
  };

  const minerIncome = getMinerIncome(game.units, game.wave);

  return (
    <div className="defense-shell" ref={gameRef} id="plant-defense">
      <div className="defense-topbar">
        <div><small>PEPEPOW ARCADE / GAME 03</small><strong>PLANT DEFENSE</strong></div>
        <div className="defense-topbar-actions">
          <button type="button" onClick={toggleSound} aria-label={soundOn ? "Mute sound" : "Enable sound"}><span>{soundOn ? "SOUND ON" : "SOUND OFF"}</span>{soundOn ? "♪" : "×"}</button>
          <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen"><span>FULLSCREEN</span>⛶</button>
        </div>
      </div>

      <div className="defense-stats" aria-label="Plant Defense game status">
        <div><small>ENERGY / CAP</small><strong className="energy">⚡ {game.energy} / {getEnergyCap(game.wave)}</strong></div>
        <div title="Combined estimated Hash Miner output after stacking, stage difficulty and current wave modifiers."><small>MINER INCOME</small><strong className="miner-income">⛏ +{minerIncome} / 8s</strong></div>
        <div><small>STAGE</small><strong>{getStage(game.wave)}</strong></div>
        <div><small>WAVE</small><strong>{isBossWave(game.wave) ? "5/5 BOSS" : `${getStageWave(game.wave)}/5`}</strong></div>
        <div><small>CORE</small><strong>{"◆".repeat(game.core)}<i>{"◇".repeat(3 - game.core)}</i></strong></div>
        <div><small>SCORE</small><strong>{game.score.toString().padStart(5, "0")}</strong></div>
        <div><small>BEST / STAGE</small><strong>{best.toString().padStart(5, "0")} <i>S{bestStage}</i></strong></div>
      </div>

      <div className="defense-stage">
        <div className="defense-board">
          <div className="defense-grid" role="grid" aria-label="Defense placement grid">
          {Array.from({ length: ROWS * COLS }, (_, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const unit = game.units.find(item => item.row === row && item.col === col);
            return (
              <button key={index} type="button" className={`defense-cell ${unit ? `has-unit ${unit.type}` : ""} ${selected === "recycle" ? "recycle-mode" : ""}`} onClick={() => placeUnit(row, col)} aria-label={`Lane ${row + 1}, cell ${col + 1}${unit ? `, ${unitInfo[unit.type].name}` : ""}`}>
                {unit && <><span className={`defense-unit-art defense-unit-art-${unit.type} ${unit.type === "frog" ? `frog-level-${unit.level}` : ""} ${unit.type === "frog" && game.tick % 4 === 0 && game.enemies.some(enemy => enemy.row === unit.row && enemy.x > unit.col - 0.2) ? "is-firing" : ""} ${unit.type === "miner" && game.status === "playing" ? "is-mining" : ""} ${unit.type === "miner" && game.tick > 0 && game.tick % 32 <= 2 ? "is-yielding" : ""}`} aria-hidden="true"><b className="unit-level">{unit.level === 3 ? "MAX" : `L${unit.level}`}</b></span><i style={{ width: `${Math.max(0, unit.hp / unit.maxHp) * 100}%` }} /></>}
              </button>
            );
          })}
          </div>

          <div className="core-rail" aria-hidden="true">{Array.from({ length: ROWS }, (_, row) => <span key={row}>◆</span>)}</div>
          <div className="enemy-layer" aria-hidden="true">
          {game.enemies.map(enemy => (
            <div key={enemy.id} className={`defense-enemy ${enemy.kind}`} style={{ top: `${(enemy.row + 0.5) * 20}%`, left: `${((enemy.x + 0.5) / COLS) * 100}%` }}>
              <span className={`enemy-art enemy-art-${enemy.kind}`} />
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
        </div>

        {game.status === "playing" && waveAlert === game.wave && (
          <div className={`wave-alert ${isBossWave(game.wave) ? "boss" : ""}`} role="status" aria-live="assertive">
            <span>STAGE {getStage(game.wave)} / WAVE {getStageWave(game.wave)}</span>
            <strong>{isBossWave(game.wave) ? "NODE BREAKER INBOUND" : `WAVE ${getStageWave(game.wave)} INCOMING`}</strong>
            <small>{isBossWave(game.wave) ? "Boss-class drill miner detected in the center lane — brace the front line." : `${getWaveTrait(game.wave).name}: ${getWaveTrait(game.wave).detail}${getStage(game.wave) >= 2 ? " · Crushers deal extra damage to Crystal Walls." : ""}`}</small>
          </div>
        )}

        {(game.status === "ready" || game.status === "won" || game.status === "lost") && (
          <div className={`defense-overlay ${game.status === "ready" ? "intro-overlay" : "result-overlay"} ${game.status}`}>
            <span>{game.status === "ready" ? "LANE DEFENSE / INFINITE STAGES" : game.status === "won" ? `STAGE ${getStage(game.wave)} CLEAR` : "CORE LOST"}</span>
            <h3>{game.status === "ready" ? <>HOLD THE<br/>CRYSTAL MINE.</> : game.status === "won" ? <>STAGE<br/>CLEARED.</> : <>REBUILD.<br/>RETRY.</>}</h3>
            <p>{game.status === "ready" ? `Start with ${STARTING_ENERGY} Energy and a ${BASE_ENERGY_CAP} Energy cap. Wave 1 attacks only the center 3 lanes, then the battlefield opens to all five. Every stage has 5 waves and ends with a Node Breaker; stages continue without a final limit.` : game.message}</p>
            {game.status !== "ready" && (
              <div className="defense-summary" aria-label="Battle score summary">
                <div className="summary-score"><small>TOTAL SCORE</small><strong>{game.score.toLocaleString()}</strong><em>{game.score >= best && game.score > 0 ? "BEST RUN" : `BEST ${best.toLocaleString()}`}</em></div>
                <div><small>STAGE SCORE</small><strong>+{Math.max(0, game.score - game.stageStartScore).toLocaleString()}</strong></div>
                <div><small>ENEMIES</small><strong>{game.kills - game.stageStartKills}</strong></div>
                <div><small>CORE STATUS</small><strong>{game.core} / 3</strong></div>
                <div><small>ENERGY LEFT</small><strong>{game.energy}</strong></div>
              </div>
            )}
            {game.status === "won" && <div className="defense-next-note"><b>NEXT STAGE:</b> formation retained · 35% repair · +120 energy · +1 core · higher mining difficulty · stronger enemies</div>}
            {game.status === "lost" && <div className="defense-next-note lost"><b>TIP:</b> 2–4 Miners are usually enough. Enemy kills also return energy, so invest in firepower early.</div>}
            <div className="defense-overlay-actions">
              {game.status === "won" && <button type="button" onClick={nextStage}>NEXT STAGE →</button>}
              <button type="button" className={game.status === "won" ? "secondary" : ""} onClick={start}>{game.status === "ready" ? "START DEFENSE" : "PLAY AGAIN"}</button>
            </div>
          </div>
        )}
      </div>

      <div className="defense-shop" aria-label="Choose a defense unit">
        {(Object.keys(unitInfo) as UnitType[]).map(type => {
          const info = unitInfo[type];
          return <button type="button" key={type} className={selected === type ? "selected" : ""} onClick={() => chooseUnit(type)}><span className={`shop-art unit-art-${type}`} aria-hidden="true"/><div><strong>{info.name}</strong><small>⚡ {info.cost}</small><em>{info.description}</em></div></button>;
        })}
        <button type="button" className={`recycle-tool ${selected === "recycle" ? "selected" : ""}`} onClick={() => chooseUnit("recycle")} aria-label="Recycle a deployed unit"><span aria-hidden="true">↺</span><div><strong>RECYCLE</strong><small>35% REFUND</small><em>Tap deployed unit to remove</em></div></button>
      </div>
      <div className="defense-message"><span>STAGE {getStage(game.wave)}</span><p>{game.message}</p><b>Miner estimate: +{minerIncome}/8s · 4+ Miners lose efficiency · Kills earn energy.</b></div>
    </div>
  );
}
