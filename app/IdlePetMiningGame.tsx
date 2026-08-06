"use client";

import { useEffect, useRef, useState } from "react";

type GameState = {
  hash: number;
  rigLevel: number;
  petXp: number;
  mood: number;
  mined: number;
  discoveries: number;
  expeditionUntil: number;
  lastFind: string;
  message: string;
};

const initialState: GameState = {
  hash: 40,
  rigLevel: 1,
  petXp: 0,
  mood: 78,
  mined: 0,
  discoveries: 0,
  expeditionUntil: 0,
  lastFind: "NONE YET",
  message: "First goal: reach RIG 2 + PET 2 to unlock your first expedition.",
};

const petLevel = (xp: number) => Math.min(9, 1 + Math.floor(xp / 60));
const rigRate = (level: number) => 2 + (level - 1) * 3;
const rigCost = (level: number) => Math.round(150 * Math.pow(1.7, level - 1));
const SAVE_KEY = "pepepow-idle-pet-v1";
const FINDS = ["BLOCK SHARD", "COPPER NODE", "OLD ASIC", "PURPLE CRYSTAL", "LUCKY NONCE"];

export default function IdlePetMiningGame() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const saved = JSON.parse(raw) as Partial<GameState> & { savedAt?: number };
      const restored: GameState = { ...initialState, ...saved };
      const awaySeconds = Math.min(7200, Math.max(0, Math.floor((Date.now() - (saved.savedAt || Date.now())) / 1000)));
      const offlineGain = awaySeconds * rigRate(restored.rigLevel);
      setGame({
        ...restored,
        hash: restored.hash + offlineGain,
        mined: restored.mined + offlineGain,
        mood: Math.max(0, restored.mood - awaySeconds * 0.006),
        message: offlineGain >= 10 ? `Welcome back — the rig mined ${offlineGain} HASH while you were away.` : restored.message,
      });
    } catch {
      window.localStorage.removeItem(SAVE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...game, savedAt: Date.now() }));
  }, [game, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setInterval(() => {
      setGame(current => {
        const rate = rigRate(current.rigLevel);
        let next = { ...current, hash: current.hash + rate, mined: current.mined + rate, mood: Math.max(0, current.mood - 0.08) };
        if (current.expeditionUntil > 0 && Date.now() >= current.expeditionUntil) {
          const find = FINDS[current.discoveries % FINDS.length];
          const reward = 220 + current.rigLevel * 45 + (current.discoveries % 3) * 30;
          next = {
            ...next,
            hash: next.hash + reward,
            petXp: current.petXp + 30,
            mood: Math.max(0, next.mood - 7),
            discoveries: current.discoveries + 1,
            expeditionUntil: 0,
            lastFind: find,
            message: `Expedition returned with ${find} and +${reward} HASH.`,
          };
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  const activeMine = () => {
    setGame(current => {
      const gain = 6 + current.rigLevel * 2;
      return { ...current, hash: current.hash + gain, mined: current.mined + gain, message: `Manual burst +${gain} HASH.` };
    });
  };

  const feed = () => {
    setGame(current => {
      if (current.hash < 30) return { ...current, message: "Need 30 HASH to prepare a snack." };
      const nextXp = current.petXp + 10;
      const leveledUp = petLevel(nextXp) > petLevel(current.petXp);
      return { ...current, hash: current.hash - 30, mood: Math.min(100, current.mood + 22), petXp: nextXp, message: leveledUp ? `Hash Hopper reached PET LV ${petLevel(nextXp)}!` : "Snack served. +10 pet XP and +22 mood." };
    });
  };

  const train = () => {
    setGame(current => {
      if (current.hash < 65) return { ...current, message: "Need 65 HASH for training." };
      const nextXp = current.petXp + 24;
      const leveledUp = petLevel(nextXp) > petLevel(current.petXp);
      return { ...current, hash: current.hash - 65, petXp: nextXp, mood: Math.max(0, current.mood - 8), message: leveledUp ? `Hash Hopper reached PET LV ${petLevel(nextXp)} — new power unlocked!` : "Training complete. +24 pet XP." };
    });
  };

  const upgradeRig = () => {
    setGame(current => {
      const cost = rigCost(current.rigLevel);
      if (current.hash < cost) return { ...current, message: `Rig upgrade needs ${cost} HASH.` };
      return { ...current, hash: current.hash - cost, rigLevel: current.rigLevel + 1, message: `Rig upgraded to level ${current.rigLevel + 1}. Passive mining increased.` };
    });
  };

  const expedition = () => {
    setGame(current => {
      if (current.expeditionUntil > 0) return { ...current, message: "Hash Hopper is already exploring." };
      if (petLevel(current.petXp) < 2 || current.rigLevel < 2) return { ...current, message: "Expedition unlocks at PET LV 2 + RIG LV 2." };
      if (current.hash < 130) return { ...current, message: "Need 130 HASH to pack the expedition." };
      return { ...current, hash: current.hash - 130, expeditionUntil: Date.now() + 7000, message: "Expedition launched — Hash Hopper returns in 7 seconds." };
    });
  };

  const toggleFullscreen = async () => {
    if (!shellRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current.requestFullscreen();
  };

  const level = petLevel(game.petXp);
  const rate = rigRate(game.rigLevel);
  const nextXp = level * 60;
  const expeditionSeconds = game.expeditionUntil > 0 ? Math.max(1, Math.ceil((game.expeditionUntil - Date.now()) / 1000)) : 0;

  return (
    <div className="idle-shell" ref={shellRef} id="idle-pet-mining">
      <div className="idle-topbar">
        <div><small>PEPEPOW ARCADE / GAME 04</small><strong>IDLE PET &amp; MINING</strong></div>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>

      <div className="idle-quickstart" aria-label="How to play">
        <div className="idle-guide-title"><small>HOW TO PLAY</small><strong>Mine → Grow → Explore</strong></div>
        <div><b>1</b><span><strong>MINE</strong><small>Tap for extra HASH. Your rig also mines automatically.</small></span></div>
        <div><b>2</b><span><strong>GROW</strong><small>Feed or train your pet, and upgrade the mining rig.</small></span></div>
        <div><b>3</b><span><strong>EXPLORE</strong><small>Reach Pet LV 2 + Rig LV 2 to find collectible loot.</small></span></div>
      </div>

      <div className="idle-stats" aria-label="Idle Pet and Mining game status">
        <div><small>HASH BALANCE</small><strong>{Math.floor(game.hash).toString().padStart(4, "0")}</strong></div>
        <div><small>AUTO MINE</small><strong>+{rate}/s</strong></div>
        <div><small>RIG LEVEL</small><strong>LV {game.rigLevel}</strong></div>
        <div><small>PET LEVEL</small><strong>LV {level}</strong></div>
        <div><small>FINDS</small><strong>{game.discoveries}</strong></div>
      </div>

      <div className="idle-world">
        <div className="idle-sky"><span>SIM BLOCK</span><b>{(4782190 + Math.floor(game.mined / 20)).toLocaleString()}</b></div>
        <div className="idle-rig" aria-label={`Mining rig level ${game.rigLevel}`}>
          <span className="rig-light" />
          <div className="rig-face"><i/><i/><i/></div>
          <strong>RIG {game.rigLevel}</strong><small>{rate} HASH / SEC</small>
        </div>
        <div className="idle-pet" aria-label={`Hash Hopper level ${level}`}>
          <div className="pet-bubble">{game.mood > 65 ? "POW!" : game.mood > 30 ? "snack?" : "..."}</div>
          <div className="pet-body"><i className="eye left"/><i className="eye right"/><b>⌣</b></div>
          <strong>HASH HOPPER</strong><small>LV {level} · {game.petXp}/{nextXp} XP · MOOD {Math.round(game.mood)}%</small>
          <div className="pet-xp"><i style={{ width: `${Math.min(100, ((game.petXp - (level - 1) * 60) / 60) * 100)}%` }} /></div>
        </div>
        <button className="mine-button" type="button" onClick={activeMine} aria-label={`Mine ${6 + game.rigLevel * 2} HASH`}><span>⛏</span><strong>MINE</strong><small>+{6 + game.rigLevel * 2} HASH / TAP</small></button>
      </div>

      <div className="idle-actions">
        <button type="button" onClick={feed}><span>●</span><strong>FEED PET</strong><small>30 HASH · +22 MOOD · +10 XP</small></button>
        <button type="button" onClick={train}><span>▲</span><strong>TRAIN PET</strong><small>65 HASH · +24 XP · −8 MOOD</small></button>
        <button type="button" onClick={upgradeRig}><span>▦</span><strong>UPGRADE RIG</strong><small>{rigCost(game.rigLevel)} HASH · AUTO +3/s</small></button>
        <button type="button" className={`expedition-action ${level < 2 || game.rigLevel < 2 ? "locked" : ""}`} onClick={expedition}><span>◆</span><strong>{game.expeditionUntil > 0 ? `EXPLORING · ${expeditionSeconds}s` : "EXPLORE"}</strong><small>{level >= 2 && game.rigLevel >= 2 ? "130 HASH · FIND LOOT" : "UNLOCK: PET 2 + RIG 2"}</small></button>
      </div>
      <div className="idle-collection"><span>COLLECTION · LAST FIND</span><strong>{game.lastFind}</strong><i>{game.discoveries ? `${game.discoveries} expedition find${game.discoveries === 1 ? "" : "s"} collected` : "No finds yet · unlock Explore to start collecting"}</i></div>
      <div className="idle-message"><span>{hydrated ? "SAVED" : "LOADING"}</span><p>{game.message}</p><b>HASH is game-only · progress saves on this device · offline mining max 2h</b></div>
    </div>
  );
}
