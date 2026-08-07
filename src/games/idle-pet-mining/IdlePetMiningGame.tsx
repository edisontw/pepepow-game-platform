"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
const MUSIC_KEY = "pepepow-idle-pet-music";
const FINDS = ["BLOCK SHARD", "COPPER NODE", "OLD ASIC", "PURPLE CRYSTAL", "LUCKY NONCE"];
const PET_REACTIONS = {
  idle: { emoji: "🙂", label: "ready!" },
  happy: { emoji: "😋", label: "yummy!" },
  excited: { emoji: "⚡", label: "let's go!" },
  level: { emoji: "✨", label: "level up!" },
  curious: { emoji: "👀", label: "what's that?" },
  tired: { emoji: "😴", label: "rest..." },
  love: { emoji: "🥰", label: "you found me!" },
  surprised: { emoji: "😲", label: "whoa!" },
  playful: { emoji: "😜", label: "catch me!" },
  grumpy: { emoji: "😤", label: "hey!" },
  sleepy: { emoji: "🥱", label: "five more mins..." },
  proud: { emoji: "😎", label: "looking good!" },
} as const;

type PetReaction = keyof typeof PET_REACTIONS;
type PetBehavior = "idle" | "walk" | "hop" | "look" | "rest";

const TAP_REACTIONS: PetReaction[] = ["happy", "curious", "love", "surprised", "playful", "grumpy", "sleepy", "proud"];
const AMBIENT_BEHAVIORS: PetBehavior[] = ["walk", "walk", "hop", "look", "rest", "idle"];

const growthStage = (level: number) => {
  if (level >= 8) return { name: "POW MASTER", tier: 4 };
  if (level >= 6) return { name: "NODE EXPLORER", tier: 3 };
  if (level >= 4) return { name: "MINER", tier: 2 };
  if (level >= 2) return { name: "SCOUT", tier: 1 };
  return { name: "HATCHLING", tier: 0 };
};

export default function IdlePetMiningGame() {
  const shellRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [game, setGame] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [petShift, setPetShift] = useState(0);
  const [petFacing, setPetFacing] = useState(1);
  const [petBehavior, setPetBehavior] = useState<PetBehavior>("idle");
  const [petReaction, setPetReaction] = useState<PetReaction>("idle");
  const reactionTimer = useRef<number | null>(null);
  const behaviorTimer = useRef<number | null>(null);

  useEffect(() => {
    setMusicOn(window.localStorage.getItem(MUSIC_KEY) !== "off");
    return () => musicRef.current?.pause();
  }, []);

  const playMusic = useCallback(() => {
    const audio = musicRef.current;
    if (!musicOn || !audio || !audio.paused) return;
    audio.volume = 0.34;
    void audio.play().catch(() => {
      // Browser autoplay policies may require the next player gesture.
    });
  }, [musicOn]);

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    window.localStorage.setItem(MUSIC_KEY, next ? "on" : "off");
    const audio = musicRef.current;
    if (!audio) return;
    if (next) {
      audio.volume = 0.34;
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

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

  useEffect(() => {
    if (!hydrated) return;
    let active = true;

    const scheduleBehavior = () => {
      const delay = 2100 + Math.floor(Math.random() * 2600);
      behaviorTimer.current = window.setTimeout(() => {
        if (!active) return;
        const nextBehavior = AMBIENT_BEHAVIORS[Math.floor(Math.random() * AMBIENT_BEHAVIORS.length)];
        setPetBehavior(nextBehavior);

        if (nextBehavior === "walk") {
          const range = window.innerWidth <= 600 ? 6 : 11;
          const nextShift = Math.round((Math.random() * range * 2 - range) * 10) / 10;
          setPetShift(current => {
            if (Math.abs(nextShift - current) > 0.5) setPetFacing(nextShift >= current ? 1 : -1);
            return nextShift;
          });
        } else if (nextBehavior === "look" && petReaction === "idle") {
          setPetFacing(Math.random() > 0.5 ? 1 : -1);
        }

        scheduleBehavior();
      }, delay);
    };

    scheduleBehavior();
    return () => {
      active = false;
      if (behaviorTimer.current) window.clearTimeout(behaviorTimer.current);
    };
  }, [hydrated, petReaction]);

  useEffect(() => () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    if (behaviorTimer.current) window.clearTimeout(behaviorTimer.current);
  }, []);

  const reactPet = (reaction: PetReaction, duration = 1800) => {
    setPetReaction(reaction);
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setPetReaction("idle"), duration);
  };

  const tapPet = () => {
    const picked = TAP_REACTIONS[Math.floor(Math.random() * TAP_REACTIONS.length)];
    reactPet(picked, picked === "sleepy" ? 2400 : 1900);
    setPetBehavior(picked === "playful" || picked === "surprised" ? "hop" : picked === "sleepy" ? "rest" : "look");
    if (picked === "playful") {
      setPetShift(current => Math.max(-8, Math.min(8, current + (Math.random() > 0.5 ? 2.5 : -2.5))));
    }
  };

  const activeMine = () => {
    setGame(current => {
      const gain = 6 + current.rigLevel * 2;
      return { ...current, hash: current.hash + gain, mined: current.mined + gain, message: `Manual burst +${gain} HASH.` };
    });
  };

  const feed = () => {
    if (game.hash < 30) reactPet("tired");
    else reactPet(petLevel(game.petXp + 10) > petLevel(game.petXp) ? "level" : "happy");
    setGame(current => {
      if (current.hash < 30) return { ...current, message: "Need 30 HASH to prepare a snack." };
      const nextXp = current.petXp + 10;
      const leveledUp = petLevel(nextXp) > petLevel(current.petXp);
      return { ...current, hash: current.hash - 30, mood: Math.min(100, current.mood + 22), petXp: nextXp, message: leveledUp ? `Glowtail reached PET LV ${petLevel(nextXp)}!` : "Snack served. +10 pet XP and +22 mood." };
    });
  };

  const train = () => {
    if (game.hash < 65) reactPet("tired");
    else reactPet(petLevel(game.petXp + 24) > petLevel(game.petXp) ? "level" : "excited");
    setGame(current => {
      if (current.hash < 65) return { ...current, message: "Need 65 HASH for training." };
      const nextXp = current.petXp + 24;
      const leveledUp = petLevel(nextXp) > petLevel(current.petXp);
      return { ...current, hash: current.hash - 65, petXp: nextXp, mood: Math.max(0, current.mood - 8), message: leveledUp ? `Glowtail reached PET LV ${petLevel(nextXp)} — new power unlocked!` : "Training complete. +24 pet XP." };
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
    if (game.expeditionUntil <= 0 && petLevel(game.petXp) >= 2 && game.rigLevel >= 2 && game.hash >= 130) reactPet("curious", 2600);
    setGame(current => {
      if (current.expeditionUntil > 0) return { ...current, message: "Glowtail is already exploring." };
      if (petLevel(current.petXp) < 2 || current.rigLevel < 2) return { ...current, message: "Expedition unlocks at PET LV 2 + RIG LV 2." };
      if (current.hash < 130) return { ...current, message: "Need 130 HASH to pack the expedition." };
      return { ...current, hash: current.hash - 130, expeditionUntil: Date.now() + 7000, message: "Expedition launched — Glowtail returns in 7 seconds." };
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
  const growth = growthStage(level);
  const petScale = Math.min(1.18, 0.82 + (level - 1) * 0.045);
  const expeditionSeconds = game.expeditionUntil > 0 ? Math.max(1, Math.ceil((game.expeditionUntil - Date.now()) / 1000)) : 0;
  const moodReaction: PetReaction = game.mood <= 20 ? "tired" : petReaction;
  const reaction = PET_REACTIONS[moodReaction];

  return (
    <div className="idle-shell" ref={shellRef} id="idle-pet-mining" onPointerDown={playMusic}>
      <audio ref={musicRef} src="/idle-pet/Where_the_Crystals_Grow.mp3" loop preload="auto" />
      <div className="idle-topbar">
        <div><small>PEPEPOW ARCADE / GAME 04</small><strong>IDLE PET &amp; MINING</strong></div>
        <div className="idle-topbar-actions">
          <button type="button" className="idle-music-toggle" onClick={toggleMusic} aria-label={`Turn music ${musicOn ? "off" : "on"}`} aria-pressed={musicOn} title={`Music ${musicOn ? "on" : "off"}`}>♫ {musicOn ? "ON" : "OFF"}</button>
          <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
        </div>
      </div>

      <div className="idle-quickstart" aria-label="How to play">
        <div className="idle-guide-title"><small>HOW TO PLAY</small><strong>Mine → Grow → Explore</strong></div>
        <div><b>1</b><span><strong>MINE</strong><small>Tap for extra HASH. Your rig also mines automatically.</small></span></div>
        <div><b>2</b><span><strong>GROW</strong><small>Feed or train your pet. Levels change its size, look and gear.</small></span></div>
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
        <div className="idle-world-shade" aria-hidden="true" />
        <div className="idle-sky"><span>MINING DISTRICT · SIM BLOCK</span><b>{(4782190 + Math.floor(game.mined / 20)).toLocaleString()}</b></div>
        <div className="idle-rig" aria-label={`Mining rig level ${game.rigLevel}`}>
          <span className="rig-light" />
          <span className="rig-core">P</span>
          <div className="rig-face"><i/><i/><i/></div>
          <strong>RIG {game.rigLevel}</strong><small>{rate} HASH / SEC</small>
        </div>
        <button
          type="button"
          className={`idle-pet growth-${growth.tier} reaction-${moodReaction} behavior-${petBehavior} ${game.expeditionUntil > 0 ? "is-exploring" : ""}`}
          aria-label={`Glowtail, ${growth.name}, level ${level}. Tap for a reaction.`}
          onClick={tapPet}
          style={{ "--pet-shift": `${petShift}%`, "--pet-scale": petScale, "--pet-facing": petFacing } as React.CSSProperties}
        >
          <div className="pet-bubble"><span>{reaction.emoji}</span>{game.expeditionUntil > 0 ? "exploring!" : reaction.label}</div>
          <div className="pet-character">
            <div className="pet-art" aria-hidden="true" />
            <span className="pet-expression" aria-hidden="true">{reaction.emoji}</span>
            <span className="pet-level-medal">LV {level}</span>
          </div>
          <strong>GLOWTAIL · {growth.name}</strong><small>LV {level} · {level >= 9 ? "MAX XP" : `${game.petXp}/${nextXp} XP`} · MOOD {Math.round(game.mood)}%</small>
          <div className="pet-xp"><i style={{ width: `${level >= 9 ? 100 : Math.min(100, ((game.petXp - (level - 1) * 60) / 60) * 100)}%` }} /></div>
        </button>
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
