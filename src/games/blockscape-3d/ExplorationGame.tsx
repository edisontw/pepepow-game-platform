"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number; name: string };
type RunState = "ready" | "playing" | "won" | "lost";
type GhostKind = "sentry" | "drifter" | "hunter";
type GhostSeed = Point & { kind: GhostKind; speed: number };
type Ghost = GhostSeed & { a: number; turnIn: number; homeX: number; homeY: number; hp: number; maxHp: number; respawnAt: number; hitUntil: number };
type Upgrade = "signal" | "speed" | "stealth";
type LevelConfig = {
  name: string;
  callout: string;
  mission: string;
  map: string[];
  start: { x: number; y: number; a: number };
  exit: Point;
  shards: Point[];
  ghosts: GhostSeed[];
  pulse?: Point;
  timeLimit: number;
  colors: Record<string, [number, number, number]>;
  tint: string;
};

const LEVELS: LevelConfig[] = [
  {
    name: "MINING VILLAGE", callout: "THE FIRST DESCENT", mission: "Recover three starter relics and learn the routes.",
    map: [
      "1111111111111111", "1000000000000001", "1000110002222001", "1000010002000001",
      "1000010002002201", "1000000000000201", "1033300033000201", "1000300003000001",
      "1000300000004401", "1000000440000401", "1002200040000401", "1000200000000001",
      "1000200333000001", "1000000300000001", "1000000000000001", "1111111111111111",
    ],
    start: { x: 2.5, y: 2.5, a: 0 }, exit: { x: 13.5, y: 1.5, name: "VILLAGE LIFT" },
    shards: [
      { x: 6.5, y: 2.5, name: "GENESIS SHARD" }, { x: 3.5, y: 9.5, name: "MINER CRYSTAL" },
      { x: 13.5, y: 13.5, name: "NODE CORE" },
    ],
    ghosts: [
      { x: 8.5, y: 7.5, name: "VAULT WARDEN", kind: "sentry", speed: 0 },
      { x: 5.5, y: 13.5, name: "CHAIN WRAITH", kind: "drifter", speed: 0.68 },
    ],
    timeLimit: 120, tint: "rgba(24,133,175,.10)",
    colors: { "1": [35, 105, 150], "2": [38, 43, 47], "3": [35, 146, 180], "4": [176, 120, 36] },
  },
  {
    name: "WALLET CITY", callout: "KEY DISTRICT", mission: "Recover four encrypted keys while the Hash Hunter patrols.",
    map: [
      "1111111111111111", "1000000100000001", "1011100101110101", "1000100000010101",
      "1110101111010101", "1000001000010001", "1011101011110101", "1000101000000101",
      "1010101111100101", "1010000000100001", "1011111100101101", "1000000100000001",
      "1011100111111101", "1000100000000001", "1000000000000001", "1111111111111111",
    ],
    start: { x: 1.5, y: 1.5, a: 0 }, exit: { x: 14.5, y: 14.5, name: "WALLET BRIDGE" },
    shards: [
      { x: 6.5, y: 1.5, name: "PUBLIC KEY" }, { x: 10.5, y: 3.5, name: "SIGNATURE CHIP" },
      { x: 2.5, y: 11.5, name: "VAULT SEAL" }, { x: 12.5, y: 13.5, name: "WALLET CORE" },
    ],
    ghosts: [
      { x: 11.5, y: 8.5, name: "LEDGER WRAITH", kind: "drifter", speed: 0.76 },
      { x: 13.5, y: 5.5, name: "HASH HUNTER", kind: "hunter", speed: 0.88 },
      { x: 5.5, y: 13.5, name: "VAULT WARDEN", kind: "sentry", speed: 0 },
    ],
    timeLimit: 115, tint: "rgba(93,70,195,.13)",
    colors: { "1": [54, 78, 142], "2": [48, 38, 68], "3": [74, 92, 190], "4": [192, 126, 40] },
  },
  {
    name: "BLOCKCHAIN CAVE", callout: "DEEP CHAIN", mission: "Gather five relics. Find the Pulse Core to freeze ghosts for six seconds.",
    map: [
      "1111111111111111", "1000000001000001", "1011110101011101", "1000010101000101",
      "1111010101110101", "1000010000010101", "1011111111010101", "1000000000010001",
      "1011011111111101", "1011000000000001", "1011110111110101", "1000010100010101",
      "1011010101010101", "1000000101000001", "1011111100011101", "1111111111111111",
    ],
    start: { x: 1.5, y: 1.5, a: 0 }, exit: { x: 14.5, y: 13.5, name: "CHAIN PORTAL" },
    shards: [
      { x: 8.5, y: 1.5, name: "BLOCK HEADER" }, { x: 6.5, y: 5.5, name: "MERKLE GEM" },
      { x: 4.5, y: 9.5, name: "NONCE CUBE" }, { x: 12.5, y: 9.5, name: "CHAIN LINK" },
      { x: 6.5, y: 13.5, name: "VALIDATOR CORE" },
    ],
    ghosts: [
      { x: 8.5, y: 7.5, name: "CAVE WARDEN", kind: "sentry", speed: 0 },
      { x: 4.5, y: 9.5, name: "FORK WRAITH", kind: "drifter", speed: 0.82 },
      { x: 12.5, y: 3.5, name: "HASH HUNTER", kind: "hunter", speed: 0.94 },
    ],
    pulse: { x: 10.5, y: 9.5, name: "PULSE CORE" }, timeLimit: 110, tint: "rgba(0,124,111,.14)",
    colors: { "1": [20, 94, 92], "2": [31, 46, 43], "3": [30, 153, 130], "4": [167, 123, 36] },
  },
  {
    name: "MASTERNODE TOWER", callout: "VERTICAL NETWORK", mission: "Climb the node grid, recover five cores and outrun two hunters.",
    map: [
      "1111111111111111", "1000000000000001", "1011111111111101", "1000000000000101",
      "1011111111100101", "1010000000100101", "1010111110100101", "1010100010100101",
      "1010101010100101", "1010101010000101", "1010101011111101", "1010101000000001",
      "1010101111111101", "1000100000000001", "1110001111111001", "1111111111111111",
    ],
    start: { x: 1.5, y: 1.5, a: 0 }, exit: { x: 14.5, y: 14.5, name: "TOWER UPLINK" },
    shards: [
      { x: 13.5, y: 1.5, name: "NODE BADGE" }, { x: 2.5, y: 3.5, name: "UPTIME CELL" },
      { x: 8.5, y: 5.5, name: "QUORUM KEY" }, { x: 7.5, y: 11.5, name: "RELAY CORE" },
      { x: 3.5, y: 13.5, name: "TOWER SEAL" },
    ],
    ghosts: [
      { x: 12.5, y: 3.5, name: "TOWER HUNTER", kind: "hunter", speed: 0.98 },
      { x: 9.5, y: 11.5, name: "UPLINK HUNTER", kind: "hunter", speed: 0.92 },
      { x: 5.5, y: 13.5, name: "NODE WRAITH", kind: "drifter", speed: 0.78 },
    ],
    pulse: { x: 8.5, y: 13.5, name: "PULSE CORE" }, timeLimit: 105, tint: "rgba(205,116,18,.11)",
    colors: { "1": [84, 85, 94], "2": [42, 44, 52], "3": [58, 127, 158], "4": [205, 139, 38] },
  },
  {
    name: "EXCHANGE MARKET", callout: "VOLATILITY FLOOR", mission: "Recover all six market relics before the closing bell.",
    map: [
      "1111111111111111", "1000000010000001", "1011100010111101", "1000100000100001",
      "1100111110101101", "1000000010000101", "1011111011110101", "1000001000010001",
      "1011101111011101", "1010000001000001", "1010111101111101", "1000100000000001",
      "1110101111110101", "1000001000000101", "1000000000000001", "1111111111111111",
    ],
    start: { x: 1.5, y: 1.5, a: 0 }, exit: { x: 14.5, y: 14.5, name: "MARKET GATE" },
    shards: [
      { x: 7.5, y: 1.5, name: "BID CRYSTAL" }, { x: 9.5, y: 3.5, name: "ASK CRYSTAL" },
      { x: 2.5, y: 5.5, name: "LIQUIDITY CELL" }, { x: 7.5, y: 9.5, name: "ORDER CUBE" },
      { x: 2.5, y: 13.5, name: "VOLUME CORE" }, { x: 12.5, y: 13.5, name: "MARKET SEAL" },
    ],
    ghosts: [
      { x: 8.5, y: 7.5, name: "MARKET WARDEN", kind: "sentry", speed: 0 },
      { x: 5.5, y: 11.5, name: "VOLATILITY WRAITH", kind: "drifter", speed: 0.9 },
      { x: 12.5, y: 5.5, name: "RED HUNTER", kind: "hunter", speed: 1.02 },
      { x: 10.5, y: 13.5, name: "LIQUIDATION HUNTER", kind: "hunter", speed: 0.96 },
    ],
    pulse: { x: 7.5, y: 11.5, name: "PULSE CORE" }, timeLimit: 100, tint: "rgba(156,45,74,.12)",
    colors: { "1": [116, 57, 74], "2": [51, 38, 45], "3": [35, 126, 152], "4": [200, 139, 39] },
  },
];

const levelFor = (stage: number) => LEVELS[(stage - 1) % LEVELS.length];
const cycleFor = (stage: number) => Math.floor((stage - 1) / LEVELS.length);
const makeGhosts = (stage: number): Ghost[] => {
  const cycle = cycleFor(stage);
  return levelFor(stage).ghosts.map((ghost, i) => {
    const hp = ghost.kind === "hunter" ? 3 : 2;
    return {
      ...ghost, speed: ghost.speed * (1 + cycle * .12), a: [.4, -1.25, 2.7, -2.2][i % 4], turnIn: 1.1 + i * .55,
      homeX: ghost.x, homeY: ghost.y, hp, maxHp: hp, respawnAt: 0, hitUntil: 0,
    };
  });
};
const timeLimitFor = (stage: number) => Math.max(65, levelFor(stage).timeLimit - cycleFor(stage) * 5);

export default function ExplorationGame() {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const player = useRef({ ...LEVELS[0].start });
  const keys = useRef(new Set<string>());
  const collectedRef = useRef(new Set<number>());
  const pulseCollectedRef = useRef(false);
  const ghostsRef = useRef<Ghost[]>(makeGhosts(1));
  const stageRef = useRef(1);
  const maxShieldsRef = useRef(3);
  const shieldsRef = useRef(3);
  const speedBoostRef = useRef(1);
  const stealthRef = useRef(0);
  const pulseUntilRef = useRef(0);
  const hitCooldownRef = useRef(0);
  const hitFlashRef = useRef(0);
  const fireQueuedRef = useRef(false);
  const attackCooldownRef = useRef(0);
  const meleeSwingRef = useRef(-1000);
  const meleeHitRef = useRef(false);
  const stateRef = useRef<RunState>("ready");
  const startTimeRef = useRef(0);
  const scoreRef = useRef(0);
  const [runState, setRunState] = useState<RunState>("ready");
  const [stage, setStage] = useState(1);
  const [collected, setCollected] = useState(0);
  const [shields, setShields] = useState(3);
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].timeLimit);
  const [pulseActive, setPulseActive] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [message, setMessage] = useState("Five zones, escalating ghosts and upgrade choices await.");

  useEffect(() => {
    setBest(Number(window.localStorage.getItem("pepepow-blockscape-best") || 0));
    setMusicOn(window.localStorage.getItem("pepepow-blockscape-music") !== "off");
    return () => musicRef.current?.pause();
  }, []);

  const beginLevel = useCallback((nextStage: number, newRun = false) => {
    if (newRun) {
      maxShieldsRef.current = 3; speedBoostRef.current = 1; stealthRef.current = 0; scoreRef.current = 0;
      setScore(0);
    }
    const config = levelFor(nextStage);
    stageRef.current = nextStage;
    player.current = { ...config.start };
    collectedRef.current = new Set();
    pulseCollectedRef.current = false;
    ghostsRef.current = makeGhosts(nextStage);
    shieldsRef.current = maxShieldsRef.current;
    pulseUntilRef.current = 0;
    hitCooldownRef.current = 0;
    hitFlashRef.current = 0;
    fireQueuedRef.current = false;
    attackCooldownRef.current = 0;
    meleeSwingRef.current = -1000;
    meleeHitRef.current = false;
    keys.current.clear();
    stateRef.current = "playing";
    startTimeRef.current = performance.now();
    setStage(nextStage); setCollected(0); setShields(maxShieldsRef.current);
    setTimeLeft(timeLimitFor(nextStage)); setPulseActive(false);
    setMessage(`${config.mission} Gate opens after ${config.shards.length}/${config.shards.length}.`);
    setRunState("playing");
  }, []);

  const playMusic = useCallback(() => {
    const music = musicRef.current;
    if (!musicOn || !music) return;
    music.volume = 0.3;
    void music.play().catch(() => {});
  }, [musicOn]);

  const startRun = useCallback(() => {
    beginLevel(1, true);
    playMusic();
  }, [beginLevel, playMusic]);

  const toggleMusic = useCallback(() => {
    const next = !musicOn;
    setMusicOn(next);
    window.localStorage.setItem("pepepow-blockscape-music", next ? "on" : "off");
    const music = musicRef.current;
    if (!music) return;
    if (next) {
      music.volume = 0.3;
      void music.play().catch(() => {});
    } else music.pause();
  }, [musicOn]);

  const chooseUpgrade = useCallback((upgrade: Upgrade) => {
    if (upgrade === "signal") maxShieldsRef.current = Math.min(5, maxShieldsRef.current + 1);
    if (upgrade === "speed") speedBoostRef.current = Math.min(1.45, speedBoostRef.current + .1);
    if (upgrade === "stealth") stealthRef.current = Math.min(3, stealthRef.current + 1);
    beginLevel(stageRef.current + 1);
  }, [beginLevel]);

  const toggleFullscreen = async () => {
    if (!shellRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current.requestFullscreen();
  };

  const setControl = (key: string, down: boolean) => {
    if (stateRef.current !== "playing") return;
    if (down) keys.current.add(key); else keys.current.delete(key);
  };

  const requestFire = () => {
    if (stateRef.current === "playing") fireQueuedRef.current = true;
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(event.key)) {
        if (stateRef.current === "playing") event.preventDefault();
        keys.current.add(event.key.toLowerCase());
      }
      if ((event.code === "Space" || event.key.toLowerCase() === "f") && stateRef.current === "playing") {
        event.preventDefault();
        if (!event.repeat) fireQueuedRef.current = true;
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down, { passive: false }); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const environment = new Image(); environment.src = "/blockscape/blockscape-environment.webp";
    const wallTexture = new Image(); wallTexture.src = "/blockscape/blockscape-wall.webp";
    let frame = 0, last = performance.now(), lastHud = 0;

    const finishRun = (reason: string) => {
      stateRef.current = "lost"; keys.current.clear(); setRunState("lost"); setMessage(reason);
      const nextBest = Math.max(best, scoreRef.current);
      setBest(nextBest); window.localStorage.setItem("pepepow-blockscape-best", String(nextBest));
    };

    const loop = (now: number) => {
      const dt = Math.min(.04, (now - last) / 1000); last = now;
      const p = player.current, currentStage = stageRef.current, config = levelFor(currentStage);
      const isWall = (x: number, y: number) => {
        const gx = Math.floor(x), gy = Math.floor(y);
        return gy < 0 || gy >= config.map.length || gx < 0 || gx >= config.map[0].length || config.map[gy][gx] !== "0";
      };

      if (stateRef.current === "playing") {
        const held = keys.current;
        const turn = (held.has("arrowleft") || held.has("a") ? -1 : 0) + (held.has("arrowright") || held.has("d") ? 1 : 0);
        const walk = (held.has("arrowup") || held.has("w") ? 1 : 0) + (held.has("arrowdown") || held.has("s") ? -1 : 0);
        p.a += turn * 2.15 * dt;
        const speed = walk * 2.35 * speedBoostRef.current * dt;
        const nx = p.x + Math.cos(p.a) * speed, ny = p.y + Math.sin(p.a) * speed;
        if (!isWall(nx + Math.sign(speed) * .15 * Math.cos(p.a), p.y)) p.x = nx;
        if (!isWall(p.x, ny + Math.sign(speed) * .15 * Math.sin(p.a))) p.y = ny;

        ghostsRef.current.forEach((ghost) => {
          if (ghost.hp <= 0 && ghost.respawnAt && now >= ghost.respawnAt) {
            ghost.x = ghost.homeX; ghost.y = ghost.homeY; ghost.hp = ghost.maxHp; ghost.respawnAt = 0; ghost.hitUntil = 0;
          }
        });

        if (fireQueuedRef.current) {
          fireQueuedRef.current = false;
          if (now >= attackCooldownRef.current) {
            const meleeRange = 1.42;
            attackCooldownRef.current = now + 520; meleeSwingRef.current = now; meleeHitRef.current = false;
            let wallDistance = .08;
            while (wallDistance < meleeRange && !isWall(p.x + Math.cos(p.a) * wallDistance, p.y + Math.sin(p.a) * wallDistance)) wallDistance += .045;
            const target = ghostsRef.current
              .filter((ghost) => ghost.hp > 0)
              .map((ghost) => {
                let rel = Math.atan2(ghost.y - p.y, ghost.x - p.x) - p.a;
                while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
                const d = Math.hypot(ghost.x - p.x, ghost.y - p.y), aim = Math.atan2(ghost.y - p.y, ghost.x - p.x);
                let los = .08;
                while (los < d && !isWall(p.x + Math.cos(aim) * los, p.y + Math.sin(aim) * los)) los += .04;
                return { ghost, rel, d, visible: los >= d };
              })
              .filter(({ rel, d, visible }) => visible && Math.abs(rel) < .34 && d <= meleeRange && d < wallDistance + .2)
              .sort((a, b) => a.d - b.d)[0];
            if (target) {
              const ghost = target.ghost; ghost.hp -= 1; ghost.hitUntil = now + 210; meleeHitRef.current = true;
              if (ghost.hp <= 0) {
                ghost.respawnAt = now + 9000; scoreRef.current += 300 * currentStage; setScore(scoreRef.current);
                setMessage(`${ghost.name} SMASHED · +${300 * currentStage} · reforms in 9s`);
              } else setMessage(`${ghost.name} STRUCK · ${ghost.hp}/${ghost.maxHp} PHASE`);
            }
          }
        }

        const frozen = now < pulseUntilRef.current;
        if (!frozen) ghostsRef.current.forEach((ghost) => {
          if (ghost.hp <= 0) return;
          if (ghost.kind === "sentry") return;
          const pd = Math.hypot(p.x - ghost.x, p.y - ghost.y);
          let ghostSpeed = ghost.speed;
          const detection = 6.2 * (1 - stealthRef.current * .12);
          if (ghost.kind === "hunter" && pd < detection) { ghost.a = Math.atan2(p.y - ghost.y, p.x - ghost.x); ghostSpeed *= 1.2; }
          else {
            ghost.turnIn -= dt;
            if (ghost.turnIn <= 0) { ghost.a += (Math.random() - .5) * 2.35; ghost.turnIn = .8 + Math.random() * 2.1; }
          }
          const step = ghostSpeed * dt, gx = ghost.x + Math.cos(ghost.a) * step, gy = ghost.y + Math.sin(ghost.a) * step;
          let blocked = false;
          if (!isWall(gx + Math.cos(ghost.a) * .18, ghost.y)) ghost.x = gx; else blocked = true;
          if (!isWall(ghost.x, gy + Math.sin(ghost.a) * .18)) ghost.y = gy; else blocked = true;
          if (blocked) { ghost.a += Math.PI * (.55 + Math.random() * .45); ghost.turnIn = .35 + Math.random() * .7; }
        });

        if (now > hitCooldownRef.current) {
          const attacker = ghostsRef.current.find((ghost) => ghost.hp > 0 && Math.hypot(p.x - ghost.x, p.y - ghost.y) < .48);
          if (attacker) {
            const next = shieldsRef.current - 1; shieldsRef.current = next; setShields(next);
            hitFlashRef.current = now + 420; hitCooldownRef.current = now + 1200;
            if (next <= 0) finishRun(`${attacker.name} drained the last Signal on level ${currentStage}.`);
            else { player.current = { ...config.start }; ghostsRef.current = makeGhosts(currentStage); setMessage(`${attacker.name} hit you · SIGNAL ${next}/${maxShieldsRef.current} · returned to entrance`); }
          }
        }

        config.shards.forEach((shard, i) => {
          if (!collectedRef.current.has(i) && Math.hypot(p.x - shard.x, p.y - shard.y) < .55) {
            collectedRef.current.add(i); setCollected(collectedRef.current.size);
            scoreRef.current += 250 * currentStage; setScore(scoreRef.current);
            setMessage(`${shard.name} recovered · ${collectedRef.current.size}/${config.shards.length} · +${250 * currentStage}`);
          }
        });
        if (config.pulse && !pulseCollectedRef.current && Math.hypot(p.x - config.pulse.x, p.y - config.pulse.y) < .58) {
          pulseCollectedRef.current = true; pulseUntilRef.current = now + 6000; setPulseActive(true);
          scoreRef.current += 400 * currentStage; setScore(scoreRef.current); setMessage("PULSE CORE ACTIVE · ghosts frozen for 6 seconds");
        }
        if (collectedRef.current.size === config.shards.length && Math.hypot(p.x - config.exit.x, p.y - config.exit.y) < .7) {
          const left = Math.max(0, timeLimitFor(currentStage) - Math.floor((now - startTimeRef.current) / 1000));
          const bonus = currentStage * 1200 + left * 20 + shieldsRef.current * 300;
          scoreRef.current += bonus; setScore(scoreRef.current);
          const nextBest = Math.max(best, scoreRef.current); setBest(nextBest);
          window.localStorage.setItem("pepepow-blockscape-best", String(nextBest));
          stateRef.current = "won"; keys.current.clear(); setRunState("won");
          setMessage(`${config.name} secured · +${bonus} clear bonus`);
        }
        if (stateRef.current === "playing" && now - lastHud > 200) {
          const left = Math.max(0, timeLimitFor(currentStage) - Math.floor((now - startTimeRef.current) / 1000));
          setTimeLeft(left); setPulseActive(now < pulseUntilRef.current); lastHud = now;
          if (left <= 0) finishRun(`The ${config.name.toLowerCase()} gate closed before extraction.`);
        }
      }

      ctx.fillStyle = "#06121b"; ctx.fillRect(0, 0, W, H);
      if (environment.complete && environment.naturalWidth) {
        const iw = environment.naturalWidth, ih = environment.naturalHeight;
        const srcW = Math.min(iw, ih * (W / H) * 1.34), travel = Math.max(0, iw - srcW);
        const heading = ((p.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        ctx.globalAlpha = .78; ctx.drawImage(environment, travel * heading / (Math.PI * 2), 0, srcW, ih, 0, 0, W, H * .61); ctx.globalAlpha = 1;
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, H * .56); sky.addColorStop(0, "#071823"); sky.addColorStop(.55, "#0b3451"); sky.addColorStop(1, "#0f6689");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * .56);
      }
      ctx.fillStyle = config.tint; ctx.fillRect(0, 0, W, H * .62);
      const haze = ctx.createLinearGradient(0, H * .28, 0, H * .62); haze.addColorStop(0, "rgba(4,12,18,0)"); haze.addColorStop(1, "rgba(28,155,220,.25)");
      ctx.fillStyle = haze; ctx.fillRect(0, H * .28, W, H * .36);
      const floor = ctx.createLinearGradient(0, H * .5, 0, H); floor.addColorStop(0, "rgba(20,37,43,.9)"); floor.addColorStop(.25, "#111a1d"); floor.addColorStop(1, "#06090a");
      ctx.fillStyle = floor; ctx.fillRect(0, H * .5, W, H * .5);
      ctx.save(); ctx.strokeStyle = "rgba(48,191,255,.18)"; ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 11, H * .51); ctx.lineTo(W / 2 + i * 105, H); ctx.stroke(); }
      for (let y = .57; y < 1; y += .085) { const py = H * (1 - Math.pow(1 - y, 1.7)); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); }
      ctx.restore();

      // Higher ray density plus face-aware lighting preserves the 1254px wall texture
      // while keeping the render loop light enough for mobile browsers.
      const fov = Math.PI / 3, rayCount = 380, columnW = W / rayCount, stripW = columnW + .65, zBuffer = new Array<number>(rayCount);
      for (let i = 0; i < rayCount; i++) {
        const ra = p.a - fov / 2 + (i / rayCount) * fov; let dist = .03, hit = "1", hitX = 0, hitY = 0;
        while (dist < 18) {
          const rx = p.x + Math.cos(ra) * dist, ry = p.y + Math.sin(ra) * dist, gx = Math.floor(rx), gy = Math.floor(ry);
          if (gy < 0 || gy >= config.map.length || gx < 0 || gx >= config.map[0].length || config.map[gy][gx] !== "0") { hit = config.map[gy]?.[gx] || "1"; hitX = rx; hitY = ry; break; }
          dist += .035;
        }
        const corrected = dist * Math.cos(ra - p.a); zBuffer[i] = corrected;
        const wallH = Math.min(H * 1.5, H * .8 / Math.max(.18, corrected)), [r, g, b] = config.colors[hit] || config.colors["1"];
        const fx = hitX - Math.floor(hitX), fy = hitY - Math.floor(hitY);
        const verticalFace = Math.min(fx, 1 - fx) < Math.min(fy, 1 - fy);
        const distanceShade = Math.max(.3, 1 - corrected / 14), faceShade = verticalFace ? 1 : .78;
        const shade = distanceShade * faceShade, dx = i * columnW, dy = H / 2 - wallH / 2;
        if (wallTexture.complete && wallTexture.naturalWidth) {
          const u = verticalFace ? fy : fx, texX = Math.floor(u * (wallTexture.naturalWidth - 3));
          ctx.globalAlpha = .95 * distanceShade + .05; ctx.drawImage(wallTexture, texX, 0, 3, wallTexture.naturalHeight, dx, dy, stripW + 1.1, wallH);
          ctx.globalAlpha = Math.min(.4, .12 + (1 - shade) * .42); ctx.fillStyle = "#02080c"; ctx.fillRect(dx, dy, stripW + 1.1, wallH);
          const materialAlpha = hit === "3" ? .2 : hit === "4" ? .17 : hit === "2" ? .12 : .075;
          ctx.globalAlpha = materialAlpha; ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(dx, dy, stripW + 1.1, wallH); ctx.globalAlpha = 1;
        } else { ctx.fillStyle = `rgb(${r * shade},${g * shade},${b * shade})`; ctx.fillRect(dx, dy, stripW + 1, wallH); }
      }

      const sprites = [
        ...config.shards.map((s, i) => ({ ...s, kind: "shard" as const, hidden: collectedRef.current.has(i) })),
        ...ghostsRef.current.map((g) => ({ ...g, kind: "ghost" as const, ghostKind: g.kind, hidden: g.hp <= 0 })),
        ...(config.pulse ? [{ ...config.pulse, kind: "pulse" as const, hidden: pulseCollectedRef.current }] : []),
        { ...config.exit, kind: "exit" as const, hidden: false },
      ].filter(s => !s.hidden).map(s => ({ ...s, d: Math.hypot(s.x - p.x, s.y - p.y) })).sort((a, b) => b.d - a.d);
      sprites.forEach((s) => {
        let rel = Math.atan2(s.y - p.y, s.x - p.x) - p.a;
        while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
        if (Math.abs(rel) > fov * .62) return;
        const sx = W / 2 + (rel / (fov / 2)) * W / 2, column = Math.max(0, Math.min(rayCount - 1, Math.floor((sx / W) * rayCount)));
        if (s.d * Math.cos(rel) > zBuffer[column] + .12) return;
        const size = Math.min(145, 150 / Math.max(.55, s.d)), sy = H / 2 + size * .2;
        ctx.save(); ctx.translate(sx, sy);
        if (s.kind === "shard") {
          ctx.translate(0, Math.sin(now * .003 + s.x) * 4 - size * .12); ctx.rotate(Math.sin(now * .0018) * .12); ctx.shadowColor = "#35d9ff"; ctx.shadowBlur = 25;
          const crystal = ctx.createLinearGradient(0, -size * .42, 0, size * .42); crystal.addColorStop(0, "#e8fbff"); crystal.addColorStop(.25, "#42ddff"); crystal.addColorStop(.72, "#0876c6"); crystal.addColorStop(1, "#043863");
          ctx.fillStyle = crystal; ctx.beginPath(); ctx.moveTo(0, -size * .46); ctx.lineTo(size * .25, -size * .08); ctx.lineTo(size * .18, size * .35); ctx.lineTo(0, size * .48); ctx.lineTo(-size * .18, size * .35); ctx.lineTo(-size * .25, -size * .08); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(233,252,255,.75)"; ctx.lineWidth = 1.5; ctx.stroke();
        } else if (s.kind === "pulse") {
          const pulse = size * (1 + Math.sin(now * .008) * .08); ctx.translate(0, -pulse * .15); ctx.shadowColor = "#baff00"; ctx.shadowBlur = 30; ctx.fillStyle = "rgba(186,255,0,.24)";
          ctx.beginPath(); ctx.arc(0, 0, pulse * .42, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#dfff7a"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#baff00"; ctx.fillRect(-pulse * .08, -pulse * .28, pulse * .16, pulse * .56); ctx.fillRect(-pulse * .28, -pulse * .08, pulse * .56, pulse * .16);
        } else if (s.kind === "ghost") {
          const pulse = 1 + Math.sin(now * .006 + s.x) * .055, ghostSize = size * (s.ghostKind === "hunter" ? 1.22 : 1.08) * pulse;
          ctx.translate(0, Math.sin(now * .004 + s.y) * 5 - ghostSize * .13);
          const aura = s.ghostKind === "hunter" ? "#ff426c" : s.ghostKind === "drifter" ? "#9b79ff" : "#efb84c";
          ctx.shadowColor = aura; ctx.shadowBlur = s.ghostKind === "hunter" ? 30 : 22;
          if (s.hitUntil > now) { ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 42; }
          const body = ctx.createLinearGradient(0, -ghostSize * .5, 0, ghostSize * .48); body.addColorStop(0, "rgba(235,249,255,.96)"); body.addColorStop(.35, s.ghostKind === "hunter" ? "rgba(107,18,47,.94)" : "rgba(26,75,94,.92)"); body.addColorStop(1, "rgba(5,16,25,.04)");
          ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-ghostSize * .25, ghostSize * .38); ctx.quadraticCurveTo(-ghostSize * .35, 0, -ghostSize * .23, -ghostSize * .28); ctx.quadraticCurveTo(0, -ghostSize * .58, ghostSize * .23, -ghostSize * .28); ctx.quadraticCurveTo(ghostSize * .35, 0, ghostSize * .25, ghostSize * .38); ctx.lineTo(ghostSize * .12, ghostSize * .26); ctx.lineTo(0, ghostSize * .46); ctx.lineTo(-ghostSize * .1, ghostSize * .27); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#081018"; ctx.beginPath(); ctx.ellipse(0, -ghostSize * .2, ghostSize * .14, ghostSize * .13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = aura; ctx.shadowBlur = 13; ctx.fillRect(-ghostSize * .085, -ghostSize * .22, ghostSize * .048, ghostSize * .034); ctx.fillRect(ghostSize * .037, -ghostSize * .22, ghostSize * .048, ghostSize * .034);
        } else {
          const ready = collectedRef.current.size === config.shards.length; ctx.strokeStyle = ready ? "#35d9ff" : "#efaa35"; ctx.lineWidth = Math.max(3, size * .075); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = ready ? 28 : 14;
          ctx.beginPath(); ctx.arc(0, -size * .15, size * .43, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = "rgba(240,184,70,.72)"; ctx.lineWidth = Math.max(1, size * .026); ctx.beginPath(); ctx.arc(0, -size * .15, size * .32, now * .001, now * .001 + Math.PI * 1.55); ctx.stroke();
          ctx.fillStyle = ready ? "rgba(27,204,255,.18)" : "rgba(239,170,53,.10)"; ctx.beginPath(); ctx.arc(0, -size * .15, size * .29, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });

      const closeGhost = ghostsRef.current.some((ghost) => {
        if (ghost.hp <= 0) return false;
        let rel = Math.atan2(ghost.y - p.y, ghost.x - p.x) - p.a;
        while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
        return Math.abs(rel) < .34 && Math.hypot(ghost.x - p.x, ghost.y - p.y) <= 1.42;
      });
      ctx.strokeStyle = closeGhost ? "rgba(255,195,72,.96)" : "rgba(111,226,255,.78)"; ctx.lineWidth = closeGhost ? 2 : 1;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, closeGhost ? 9 : 6, 0, Math.PI * 2); ctx.stroke();

      // Blocky mining hammer: a short-range swing with the tactile rhythm of a voxel survival tool.
      const swingElapsed = now - meleeSwingRef.current;
      const swingProgress = Math.max(0, Math.min(1, swingElapsed / 360));
      const swingArc = swingElapsed >= 0 && swingElapsed < 360 ? Math.sin(swingProgress * Math.PI) : 0;
      ctx.save();
      ctx.translate(W * .68 - swingArc * W * .12, H * .98 - swingArc * H * .19);
      ctx.rotate(.22 - swingArc * 1.05);
      ctx.fillStyle = "#5b3a21"; ctx.strokeStyle = "#c08b42"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-10, -8, 20, 118, 5); ctx.fill(); ctx.stroke();
      const hammer = ctx.createLinearGradient(-55, -55, 55, 12); hammer.addColorStop(0, "#1b262c"); hammer.addColorStop(.48, "#40535b"); hammer.addColorStop(1, "#0b1013");
      ctx.fillStyle = hammer; ctx.strokeStyle = meleeHitRef.current && swingElapsed < 220 ? "#fff0a8" : "#d49b42"; ctx.lineWidth = 3;
      ctx.shadowColor = meleeHitRef.current && swingElapsed < 220 ? "#fff0a8" : "#35d9ff"; ctx.shadowBlur = swingElapsed < 360 ? 18 : 7;
      ctx.beginPath(); ctx.moveTo(-58, -42); ctx.lineTo(-30, -62); ctx.lineTo(44, -54); ctx.lineTo(59, -28); ctx.lineTo(40, -4); ctx.lineTo(-48, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#36d9ff"; ctx.fillRect(-25, -47, 49, 8); ctx.shadowBlur = 0; ctx.restore();

      const scale = 5.2, ox = W - 100, oy = 15;
      ctx.fillStyle = "rgba(3,10,14,.86)"; ctx.fillRect(ox - 9, oy - 9, 16 * scale + 18, 16 * scale + 18); ctx.strokeStyle = "rgba(238,176,58,.7)"; ctx.strokeRect(ox - 9, oy - 9, 16 * scale + 18, 16 * scale + 18);
      config.map.forEach((row, y) => [...row].forEach((v, x) => { if (v !== "0") { ctx.fillStyle = v === "3" ? "#197da3" : v === "4" ? "#b57c26" : v === "2" ? "#3e4647" : "#164d68"; ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale); } }));
      const px = ox + p.x * scale, py = oy + p.y * scale, mapFov = Math.PI / 3, visionR = 4.5 * scale;
      ctx.fillStyle = "rgba(53,217,255,.13)"; ctx.strokeStyle = "rgba(92,230,255,.48)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, visionR, p.a - mapFov / 2, p.a + mapFov / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      config.shards.forEach((s, i) => { if (!collectedRef.current.has(i)) { ctx.fillStyle = "#35d9ff"; ctx.fillRect(ox + s.x * scale - 1.5, oy + s.y * scale - 1.5, 3, 3); } });
      if (config.pulse && !pulseCollectedRef.current) { ctx.fillStyle = "#baff00"; ctx.beginPath(); ctx.arc(ox + config.pulse.x * scale, oy + config.pulse.y * scale, 2.3, 0, Math.PI * 2); ctx.fill(); }
      ghostsRef.current.forEach((g) => { if (g.hp <= 0) return; ctx.fillStyle = g.kind === "hunter" ? "#ff426c" : g.kind === "drifter" ? "#9b79ff" : "#efb84c"; ctx.beginPath(); ctx.arc(ox + g.x * scale, oy + g.y * scale, 2.2, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = collectedRef.current.size === config.shards.length ? "#35d9ff" : "#efa935"; ctx.fillRect(ox + config.exit.x * scale - 2, oy + config.exit.y * scale - 2, 4, 4);
      ctx.shadowColor = "#7ef2ff"; ctx.shadowBlur = 12; ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#35d9ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 5.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#35d9ff"; ctx.beginPath(); ctx.moveTo(px + Math.cos(p.a) * 10, py + Math.sin(p.a) * 10); ctx.lineTo(px + Math.cos(p.a + 2.5) * 5.5, py + Math.sin(p.a + 2.5) * 5.5); ctx.lineTo(px + Math.cos(p.a - 2.5) * 5.5, py + Math.sin(p.a - 2.5) * 5.5); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      if (now < pulseUntilRef.current) { ctx.fillStyle = "rgba(186,255,0,.10)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#dfff75"; ctx.font = "900 11px monospace"; ctx.fillText("PULSE FIELD ACTIVE", 16, 25); }
      const vignette = ctx.createRadialGradient(W / 2, H * .48, H * .15, W / 2, H * .48, W * .68); vignette.addColorStop(.45, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(0,0,0,.58)"); ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
      if (now < hitFlashRef.current) { const alpha = Math.max(0, (hitFlashRef.current - now) / 420) * .38; ctx.fillStyle = `rgba(255,48,88,${alpha})`; ctx.fillRect(0, 0, W, H); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [best]);

  const config = levelFor(stage);
  const zoneIndex = (stage - 1) % LEVELS.length;
  return (
    <div className="explore-shell" ref={shellRef} id="3d-exploration">
      <audio ref={musicRef} src="/blockscape/Beneath_the_Glass_Floor.mp3" loop preload="auto" />
      <div className="explore-topbar">
        <div><small>GAME 05 · LEVEL {stage} · {config.callout}</small><strong>BLOCKSCAPE 3D / {config.name}</strong></div>
        <span className="explore-score"><small>SCORE</small><b>{score.toLocaleString()}</b><i>BEST {best.toLocaleString()}</i></span>
        <button type="button" className="explore-music-toggle" onClick={toggleMusic} aria-label={`Turn music ${musicOn ? "off" : "on"}`} aria-pressed={musicOn} title={`Music ${musicOn ? "on" : "off"}`}>♫ {musicOn ? "ON" : "OFF"}</button>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>
      <div className="explore-route" aria-label={`Zone ${zoneIndex + 1} of 5 in the current circuit`}>
        {LEVELS.map((level, index) => <span key={level.name} className={index === zoneIndex ? "active" : index < zoneIndex ? "done" : ""}><i>{index + 1}</i><b>{level.name}</b></span>)}
      </div>
      <div className="explore-guide">
        <div><b>1</b><span><strong>EXPLORE 5 ZONES</strong><small>Each maze has a new layout, mission, timer and ghost mix.</small></span></div>
        <div><b>2</b><span><strong>RECOVER RELICS</strong><small>Collect every blue crystal; green Pulse Cores freeze ghosts.</small></span></div>
        <div><b>3</b><span><strong>FIGHT OR EVADE</strong><small>Get close and swing the Mining Hammer; hunters take three solid hits.</small></span></div>
        <div><b>4</b><span><strong>UPGRADE & REPEAT</strong><small>Choose one upgrade after every gate. Circuits continue harder.</small></span></div>
      </div>
      <div className="explore-hud">
        <div><small>LEVEL</small><strong>{stage}</strong></div>
        <div><small>RELICS</small><strong>{collected} / {config.shards.length}</strong></div>
        <div><small>TIME LEFT</small><strong className={timeLeft <= 20 ? "danger" : ""}>{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</strong></div>
        <div><small>SIGNAL</small><strong className={shields === 1 ? "danger" : ""}>{"◆".repeat(shields)}{"◇".repeat(Math.max(0, maxShieldsRef.current - shields))}</strong></div>
        <div><small>PULSE</small><strong className={pulseActive ? "pulse" : ""}>{pulseActive ? "ACTIVE" : config.pulse && !pulseCollectedRef.current ? "AVAILABLE" : "—"}</strong></div>
        <div><small>WEAPON</small><strong className="weapon">MINING HAMMER</strong></div>
        <div><small>GATE</small><strong className={collected === config.shards.length ? "open" : "locked"}>{collected === config.shards.length ? "OPEN" : "LOCKED"}</strong></div>
      </div>
      <div className="explore-view">
        <canvas ref={canvasRef} width={760} height={470} aria-label={`First person exploration of ${config.name}`} />
        {runState !== "playing" && <div className="explore-overlay">
          <span>{runState === "won" ? `LEVEL ${stage} COMPLETE · CHOOSE ONE UPGRADE` : runState === "lost" ? `RUN ENDED · LEVEL ${stage}` : "GAME 05 · ENDLESS 3D EXPEDITION"}</span>
          <h3>{runState === "won" ? "ZONE\nSECURED." : runState === "lost" ? "SIGNAL\nLOST." : "FIVE ZONES.\nONE SIGNAL."}</h3>
          <p>{runState === "won" ? `${config.name} is synchronized. ${message} Continue to ${levelFor(stage + 1).name}.` : runState === "lost" ? `${message} Final score ${score.toLocaleString()} · best ${best.toLocaleString()}.` : "Cross Mining Village, Wallet City, Blockchain Cave, Masternode Tower and Exchange Market. Recover relics, evade three ghost types and choose an upgrade after every level."}</p>
          {runState === "won" ? <div className="explore-upgrades">
            <button type="button" onClick={() => chooseUpgrade("signal")}><b>◆+</b><strong>REINFORCED SIGNAL</strong><small>+1 maximum Signal, up to five.</small></button>
            <button type="button" onClick={() => chooseUpgrade("speed")}><b>»</b><strong>MINER BOOTS</strong><small>Move 10% faster for this run.</small></button>
            <button type="button" onClick={() => chooseUpgrade("stealth")}><b>◌</b><strong>STEALTH CIRCUIT</strong><small>Red hunters detect you 12% later.</small></button>
          </div> : <button type="button" onClick={startRun}>{runState === "lost" ? "NEW EXPEDITION" : "START LEVEL 1"}</button>}
        </div>}
      </div>
      <div className="explore-controls" aria-label="Movement and weapon controls">
        <div className="explore-pad">
          <button type="button" onPointerDown={() => setControl("arrowleft", true)} onPointerUp={() => setControl("arrowleft", false)} onPointerCancel={() => setControl("arrowleft", false)} onPointerLeave={() => setControl("arrowleft", false)} aria-label="Turn left">↶</button>
          <button type="button" onPointerDown={() => setControl("arrowup", true)} onPointerUp={() => setControl("arrowup", false)} onPointerCancel={() => setControl("arrowup", false)} onPointerLeave={() => setControl("arrowup", false)} aria-label="Move forward">▲</button>
          <button type="button" onPointerDown={() => setControl("arrowdown", true)} onPointerUp={() => setControl("arrowdown", false)} onPointerCancel={() => setControl("arrowdown", false)} onPointerLeave={() => setControl("arrowdown", false)} aria-label="Move backward">▼</button>
          <button type="button" onPointerDown={() => setControl("arrowright", true)} onPointerUp={() => setControl("arrowright", false)} onPointerCancel={() => setControl("arrowright", false)} onPointerLeave={() => setControl("arrowright", false)} aria-label="Turn right">↷</button>
        </div>
        <button type="button" className="explore-fire" onPointerDown={requestFire} aria-label="Swing Mining Hammer"><span>⚒</span> SWING</button>
        <p>{message}</p>
        <b>W/S MOVE · A/D TURN · SPACE/F SWING · MELEE RANGE 1.4</b>
      </div>
    </div>
  );
}
