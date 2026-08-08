"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArcadeFullscreen } from "../../platform/useArcadeFullscreen";

type Side = "player" | "enemy";
type Owner = Side | "neutral" | "corrupt";
type Status = "ready" | "playing" | "upgrade" | "won" | "lost";
type Difficulty = "core" | "overclock";
type UnitKind = "miner" | "masternode" | "firewall" | "hacker" | "developer" | "sniper" | "bot";
type EnemyBrain = "berserker" | "hacker" | "defender" | "assassin" | "swarm" | "commander";
type ObjectiveKey = "elimination" | "capture" | "defense" | "escort" | "survival" | "boss";
type UpgradeId = "miner" | "harden" | "viral" | "glass" | "mesh" | "battery";

type Unit = {
  id: string;
  side: Side;
  kind: UnitKind;
  hp: number;
  maxHp: number;
  shield: number;
};

type BoardNode = {
  owner: Owner;
  unit?: Unit;
  fortified?: boolean;
};

type NodeDef = { id: string; x: number; y: number; label: string; core?: Side; uplink?: boolean };
type StagePlan = { objective: ObjectiveKey; brain: EnemyBrain };

const NODES: NodeDef[] = [
  { id: "A1", x: 10, y: 20, label: "A1" },
  { id: "B1", x: 36, y: 15, label: "B1" },
  { id: "C1", x: 64, y: 15, label: "C1" },
  { id: "D1", x: 90, y: 20, label: "D1" },
  { id: "A2", x: 8, y: 50, label: "CORE", core: "player" },
  { id: "B2", x: 35, y: 48, label: "B2" },
  { id: "C2", x: 65, y: 48, label: "UPLINK", uplink: true },
  { id: "D2", x: 92, y: 50, label: "CORE", core: "enemy" },
  { id: "A3", x: 10, y: 80, label: "A3" },
  { id: "B3", x: 36, y: 84, label: "B3" },
  { id: "C3", x: 64, y: 84, label: "C3" },
  { id: "D3", x: 90, y: 80, label: "D3" },
];

const EDGES: [string, string][] = [
  ["A1", "B1"], ["B1", "C1"], ["C1", "D1"],
  ["A2", "B2"], ["B2", "C2"], ["C2", "D2"],
  ["A3", "B3"], ["B3", "C3"], ["C3", "D3"],
  ["A1", "A2"], ["A2", "A3"], ["B1", "B2"], ["B2", "B3"],
  ["C1", "C2"], ["C2", "C3"], ["D1", "D2"], ["D2", "D3"],
  ["B1", "C2"], ["B3", "C2"],
];

const NODE_BY_ID = Object.fromEntries(NODES.map(node => [node.id, node])) as Record<string, NodeDef>;
const CAPTURE_NODES = ["B1", "C2", "C3"] as const;
const BOSS_QUORUM_NODES = ["B1", "B2", "C1", "C2", "C3"] as const;

const UNIT_DEFS: Record<UnitKind, { name: string; icon: string; art: string; ap: number; energy: number; hp: number; attack: number; role: string }> = {
  miner: { name: "Miner", icon: "⛏", art: "/node-tactics/cards/doge.webp", ap: 1, energy: 2, hp: 5, attack: 1, role: "+1 Energy / turn" },
  masternode: { name: "Masternode", icon: "⬡", art: "/node-tactics/cards/turtle.webp", ap: 2, energy: 3, hp: 9, attack: 2, role: "Fortifies nearby Nodes" },
  firewall: { name: "Firewall", icon: "▦", art: "/node-tactics/cards/owl.webp", ap: 1, energy: 3, hp: 7, attack: 1, role: "Shields adjacent units" },
  hacker: { name: "Hacker", icon: "⚡", art: "/node-tactics/cards/dragon.webp", ap: 2, energy: 3, hp: 4, attack: 2, role: "Steals a nearby Node" },
  developer: { name: "Developer", icon: "🔧", art: "/node-tactics/cards/penguin.webp", ap: 1, energy: 2, hp: 5, attack: 1, role: "Repairs corrupted Nodes" },
  sniper: { name: "Sniper", icon: "◎", art: "/node-tactics/cards/cat.webp", ap: 2, energy: 4, hp: 3, attack: 6, role: "Range 2 · fragile" },
  bot: { name: "Bot", icon: "◆", art: "/node-tactics/cards/bull.webp", ap: 1, energy: 1, hp: 3, attack: 2, role: "Cheap pressure unit" },
};

const ENEMY_ART: Record<EnemyBrain, string> = {
  berserker: "/node-tactics/enemies/raider.webp",
  hacker: "/node-tactics/enemies/malware.webp",
  defender: "/node-tactics/enemies/drill.webp",
  assassin: "/node-tactics/enemies/rogue.webp",
  swarm: "/node-tactics/enemies/breaker.webp",
  commander: "/node-tactics/enemies/ogre.webp",
};

const BRAIN_LABEL: Record<EnemyBrain, { name: string; cue: string }> = {
  berserker: { name: "BERSERKER", cue: "rushes your CORE" },
  hacker: { name: "HACKER", cue: "steals and corrupts Nodes" },
  defender: { name: "DEFENDER", cue: "holds key Network positions" },
  assassin: { name: "ASSASSIN", cue: "hunts Miner / Developer" },
  swarm: { name: "SWARM", cue: "surrounds the Network" },
  commander: { name: "COMMANDER", cue: "pushes the central uplink" },
};

const OBJECTIVES: Record<ObjectiveKey, { icon: string; name: string; text: string }> = {
  elimination: { icon: "⚔", name: "ELIMINATION", text: "Remove every hostile unit." },
  capture: { icon: "⚑", name: "CAPTURE", text: "Hold B1, C2 and C3 through the enemy response." },
  defense: { icon: "⬡", name: "DEFENSE", text: "Keep your CORE online through turn 6." },
  escort: { icon: "▣", name: "PACKET ESCORT", text: "Build a blue route and escort the packet to D1." },
  survival: { icon: "◷", name: "SURVIVAL", text: "Stay online through turn 7." },
  boss: { icon: "♛", name: "THE 51% ATTACK", text: "Break the enemy CORE. Hold 3/5 quorum Nodes every third turn." },
};

const UPGRADES: { id: UpgradeId; icon: string; name: string; text: string }[] = [
  { id: "miner", icon: "⚡", name: "OVERCLOCK", text: "Every Miner produces +1 extra Energy." },
  { id: "harden", icon: "⬡", name: "HARDENED NODE", text: "Friendly Nodes reduce incoming unit damage by 1." },
  { id: "viral", icon: "☠", name: "VIRAL CHAIN", text: "A defeated enemy deals 2 damage to adjacent enemies." },
  { id: "glass", icon: "◎", name: "GLASS CANNON", text: "All attacks gain +2 damage." },
  { id: "mesh", icon: "⌘", name: "MESH RECOVERY", text: "A Network of 4+ heals +2 CORE each turn." },
  { id: "battery", icon: "▣", name: "RESERVE CELL", text: "+3 starting Energy in every battle." },
];

const DIFFICULTY = {
  core: { label: "CORE RUN", enemyHp: 1, enemyDamage: 1, score: 1 },
  overclock: { label: "OVERCLOCK", enemyHp: 1.25, enemyDamage: 1.25, score: 1.4 },
};

function shuffled<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function neighbors(id: string) {
  return EDGES.flatMap(([a, b]) => a === id ? [b] : b === id ? [a] : []);
}

function graphDistance(from: string, to: string) {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let distance = 0;
  while (frontier.length) {
    distance += 1;
    const next: string[] = [];
    for (const id of frontier) {
      for (const adjacent of neighbors(id)) {
        if (adjacent === to) return distance;
        if (!seen.has(adjacent)) { seen.add(adjacent); next.push(adjacent); }
      }
    }
    frontier = next;
  }
  return 99;
}

function largestNetwork(board: Record<string, BoardNode>, owner: Side) {
  const available = NODES.map(node => node.id).filter(id => board[id]?.owner === owner);
  const seen = new Set<string>();
  let largest = 0;
  for (const start of available) {
    if (seen.has(start)) continue;
    let size = 0;
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const id = queue.shift()!;
      size += 1;
      for (const next of neighbors(id)) {
        if (board[next]?.owner === owner && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    largest = Math.max(largest, size);
  }
  return largest;
}

function hasLoop(board: Record<string, BoardNode>, owner: Side) {
  const controlled = new Set(NODES.filter(node => board[node.id]?.owner === owner).map(node => node.id));
  const seen = new Set<string>();
  const walk = (id: string, parent: string | null): boolean => {
    seen.add(id);
    for (const next of neighbors(id)) {
      if (!controlled.has(next) || next === parent) continue;
      if (seen.has(next) || walk(next, id)) return true;
    }
    return false;
  };
  for (const id of controlled) if (!seen.has(id) && walk(id, null)) return true;
  return false;
}

function makeUnit(side: Side, kind: UnitKind, index: number, hpScale = 1): Unit {
  const def = UNIT_DEFS[kind];
  const maxHp = Math.ceil(def.hp * hpScale);
  return { id: `${side}-${kind}-${index}-${Math.random().toString(36).slice(2, 6)}`, side, kind, hp: maxHp, maxHp, shield: 0 };
}

function createBoard(stage: number, brain: EnemyBrain, mode: Difficulty) {
  const board = Object.fromEntries(NODES.map(node => [node.id, { owner: "neutral" as Owner }])) as Record<string, BoardNode>;
  board.A2.owner = "player";
  board.A1 = { owner: "player", unit: makeUnit("player", "miner", 1) };
  board.D2.owner = "enemy";
  board.D3 = { owner: "enemy", unit: makeUnit("enemy", brain === "hacker" ? "hacker" : brain === "defender" ? "masternode" : "bot", 1, DIFFICULTY[mode].enemyHp) };
  const extraSpawns = stage >= 1 ? 1 : 0;
  if (extraSpawns) board.D1 = { owner: "enemy", unit: makeUnit("enemy", brain === "assassin" ? "sniper" : brain === "commander" ? "masternode" : "bot", 2, DIFFICULTY[mode].enemyHp) };
  if (stage >= 3) board.C1 = { owner: "enemy", unit: makeUnit("enemy", brain === "swarm" ? "bot" : "firewall", 3, DIFFICULTY[mode].enemyHp) };
  if (brain === "hacker") board.C3.owner = "corrupt";
  return board;
}

export default function CardBattlerGame() {
  const { shellRef: gameRef, immersive, toggleFullscreen } = useArcadeFullscreen<HTMLDivElement>();
  const musicRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [musicOn, setMusicOn] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("core");
  const [route, setRoute] = useState<StagePlan[]>([]);
  const [stage, setStage] = useState(0);
  const [turn, setTurn] = useState(1);
  const [ap, setAp] = useState(3);
  const [energy, setEnergy] = useState(5);
  const [coreHp, setCoreHp] = useState(20);
  const [maxCoreHp, setMaxCoreHp] = useState(20);
  const [bossHp, setBossHp] = useState(18);
  const [board, setBoard] = useState<Record<string, BoardNode>>(() => createBoard(0, "berserker", "core"));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activatedUnitIds, setActivatedUnitIds] = useState<string[]>([]);
  const [captureHeld, setCaptureHeld] = useState(false);
  const [packetNode, setPacketNode] = useState("A2");
  const [upgrades, setUpgrades] = useState<UpgradeId[]>([]);
  const [upgradeChoices, setUpgradeChoices] = useState(UPGRADES.slice(0, 3));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("Deploy, connect and control the Network.");
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    // Restore this device's audio preference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMusicOn(window.localStorage.getItem("pepepow-tactics-music") !== "off");
    const music = musicRef.current;
    return () => music?.pause();
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music || !musicOn) return;
    music.volume = 0.3;
    void music.play().catch(() => {
      // Browsers may require the first user gesture before starting audio.
    });
  }, [musicOn]);

  const playMusic = () => {
    const music = musicRef.current;
    if (!musicOn || !music || !music.paused) return;
    music.volume = 0.3;
    void music.play().catch(() => {});
  };

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    window.localStorage.setItem("pepepow-tactics-music", next ? "on" : "off");
    const music = musicRef.current;
    if (!music) return;
    if (next) {
      music.volume = 0.3;
      void music.play().catch(() => {});
    } else {
      music.pause();
    }
  };

  const plan = route[stage] ?? { objective: "elimination" as ObjectiveKey, brain: "berserker" as EnemyBrain };
  const objective = OBJECTIVES[plan.objective];
  const brain = BRAIN_LABEL[plan.brain];
  const networkSize = useMemo(() => largestNetwork(board, "player"), [board]);
  const networkLoop = useMemo(() => hasLoop(board, "player"), [board]);
  const enemyCount = useMemo(() => NODES.reduce((sum, node) => sum + (board[node.id]?.unit?.side === "enemy" ? 1 : 0), 0), [board]);
  const captureCount = CAPTURE_NODES.filter(id => board[id]?.owner === "player").length;
  const bossQuorum = BOSS_QUORUM_NODES.filter(id => board[id]?.owner === "player").length;
  const selected = selectedNode ? board[selectedNode] : undefined;
  const selectedUnit = selected?.unit?.side === "player" ? selected.unit : undefined;
  const rule = DIFFICULTY[difficulty];
  const isBoss = plan.objective === "boss";

  const networkBonuses = useMemo(() => [
    { active: networkSize >= 2, label: "2 LINK", text: "+1 Energy / turn" },
    { active: networkSize >= 3, label: "3 LINK", text: "+1 Attack" },
    { active: networkSize >= 4, label: "4 LINK", text: "+1 CORE / turn" },
    { active: networkLoop, label: "LOOP", text: "+2 unit Shield / turn" },
  ], [networkLoop, networkSize]);

  const finishScore = useCallback((value: number) => {
    setBest(current => {
      const next = Math.max(current, value);
      window.localStorage.setItem("pepepow-tactics-best", String(next));
      return next;
    });
  }, []);

  const startRun = useCallback((mode: Difficulty) => {
    const objectives = shuffled<ObjectiveKey>(["elimination", "capture", "defense", "escort", "survival"]);
    const brains = shuffled<EnemyBrain>(["berserker", "hacker", "defender", "assassin", "swarm"]);
    const nextRoute = objectives.map((objectiveKey, index) => ({ objective: objectiveKey, brain: brains[index] }));
    nextRoute.push({ objective: "boss", brain: "commander" });
    const first = nextRoute[0];
    setDifficulty(mode);
    setRoute(nextRoute);
    setStage(0);
    setTurn(1);
    setAp(3);
    setEnergy(5);
    setCoreHp(20);
    setMaxCoreHp(20);
    setBossHp(Math.ceil(18 * DIFFICULTY[mode].enemyHp));
    setBoard(createBoard(0, first.brain, mode));
    setSelectedNode(null);
    setActivatedUnitIds([]);
    setCaptureHeld(false);
    setPacketNode("A2");
    setUpgrades([]);
    setScore(0);
    setBest(Number(window.localStorage.getItem("pepepow-tactics-best") || 0));
    setStatus("playing");
    setMessage(`${OBJECTIVES[first.objective].name}: ${OBJECTIVES[first.objective].text}`);
  }, []);

  const applyDamage = useCallback((targetNode: string, amount: number, draft: Record<string, BoardNode>) => {
    const target = draft[targetNode];
    if (!target.unit) return false;
    const reduction = (upgrades.includes("harden") && target.owner === "player" ? 1 : 0) + (target.fortified ? 1 : 0);
    let damage = Math.max(0, amount - reduction);
    const absorbed = Math.min(target.unit.shield, damage);
    damage -= absorbed;
    const hp = target.unit.hp - damage;
    target.unit = { ...target.unit, shield: target.unit.shield - absorbed, hp };
    if (hp > 0) return false;
    const defeatedSide = target.unit.side;
    delete target.unit;
    if (defeatedSide === "enemy" && upgrades.includes("viral")) {
      for (const adjacent of neighbors(targetNode)) {
        const splash = draft[adjacent]?.unit;
        if (splash?.side === "enemy") {
          const splashHp = splash.hp - 2;
          if (splashHp <= 0) delete draft[adjacent].unit;
          else draft[adjacent].unit = { ...splash, hp: splashHp };
        }
      }
    }
    return true;
  }, [upgrades]);

  const handleNode = (id: string) => {
    if (status !== "playing") return;
    const target = board[id];
    if (!selectedNode) {
      if (target.owner === "player" || target.unit?.side === "player") { setSelectedNode(id); setMessage(target.unit ? `${UNIT_DEFS[target.unit.kind].name} selected · choose a highlighted target.` : `${id} selected · choose a unit below to deploy.`); }
      else setMessage("Start by tapping a blue Node or one of your units.");
      return;
    }
    if (id === selectedNode) { setSelectedNode(null); return; }
    const origin = board[selectedNode];
    const unit = origin.unit?.side === "player" ? origin.unit : undefined;
    if (!unit) {
      if (target.owner === "player" || target.unit?.side === "player") {
        setSelectedNode(id);
        setMessage(target.unit?.side === "player" ? `${UNIT_DEFS[target.unit.kind].name} selected · choose a highlighted target.` : `${id} selected · choose a unit below to deploy.`);
      } else setMessage("That Node is not a deployment point. Tap another blue Node.");
      return;
    }

    if (target.unit?.side === "player") {
      setSelectedNode(id);
      setMessage(`${UNIT_DEFS[target.unit.kind].name} selected · choose a highlighted target.`);
      return;
    }

    if (activatedUnitIds.includes(unit.id)) { setMessage(`${UNIT_DEFS[unit.kind].name} already acted this turn. Select another unit or COMMIT TURN.`); return; }
    if (ap < 1) { setMessage("No AP left. COMMIT TURN to resolve the enemy and refresh AP."); return; }

    const distance = graphDistance(selectedNode, id);
    if (target.unit?.side === "enemy" && distance <= (unit.kind === "sniper" ? 2 : 1)) {
      const draft = structuredClone(board) as Record<string, BoardNode>;
      const attackBonus = (networkSize >= 3 ? 1 : 0) + (upgrades.includes("glass") ? 2 : 0);
      const damage = UNIT_DEFS[unit.kind].attack + attackBonus;
      const defeated = applyDamage(id, damage, draft);
      setBoard(draft);
      setAp(value => value - 1);
      setActivatedUnitIds(value => [...value, unit.id]);
      setScore(value => value + Math.round((damage * 18 + (defeated ? 80 : 0)) * rule.score));
      setMessage(`${UNIT_DEFS[unit.kind].name} → ${id}: ${damage} damage${defeated ? " · hostile removed" : ""}.`);
      return;
    }

    if (!target.unit && distance === 1 && id !== "D2") {
      if (target.owner === "corrupt" && unit.kind !== "developer") {
        setMessage("Corrupt Nodes block normal capture. Move a Developer next to it and use REPAIR, or move the Developer onto it.");
        return;
      }
      const draft = structuredClone(board) as Record<string, BoardNode>;
      const wasCorrupt = draft[id].owner === "corrupt";
      draft[id].unit = { ...unit };
      draft[id].owner = "player";
      draft[id].fortified = wasCorrupt ? false : draft[id].fortified;
      delete draft[selectedNode].unit;
      if (selectedNode !== "A2") draft[selectedNode].owner = "player";
      setBoard(draft);
      setAp(value => value - 1);
      setActivatedUnitIds(value => [...value, unit.id]);
      setSelectedNode(id);
      setScore(value => value + Math.round(25 * rule.score));
      setMessage(`${UNIT_DEFS[unit.kind].name} moved to ${id} · ${wasCorrupt && unit.kind === "developer" ? "corruption repaired" : "Node secured"}.`);
      return;
    }
    setMessage(unit.kind === "sniper" ? "Choose a highlighted Node or enemy within 2 links." : "Choose a highlighted adjacent Node or enemy.");
  };

  const deploy = (kind: UnitKind) => {
    if (status !== "playing" || !selectedNode) { setMessage("Select an empty blue Node first."); return; }
    const node = board[selectedNode];
    const def = UNIT_DEFS[kind];
    if (node.owner !== "player" || node.unit) { setMessage("Deploy only on an empty blue Node."); return; }
    if (def.ap > ap || def.energy > energy) { setMessage(`Need ${def.ap} AP + ${def.energy} Energy for ${def.name}.`); return; }
    const draft = structuredClone(board) as Record<string, BoardNode>;
    const deployed = makeUnit("player", kind, turn + stage * 20);
    draft[selectedNode].unit = deployed;
    setBoard(draft);
    setAp(value => value - def.ap);
    setEnergy(value => value - def.energy);
    setActivatedUnitIds(value => [...value, deployed.id]);
    setScore(value => value + Math.round(30 * rule.score));
    setMessage(`${def.name} deployed at ${selectedNode}. Deployment uses its activation this turn.`);
  };

  const specialAction = () => {
    if (!selectedNode || !selectedUnit || ap < 1 || status !== "playing") return;
    if (activatedUnitIds.includes(selectedUnit.id)) { setMessage(`${UNIT_DEFS[selectedUnit.kind].name} already acted this turn.`); return; }
    const draft = structuredClone(board) as Record<string, BoardNode>;
    const adjacent = neighbors(selectedNode);
    if (selectedUnit.kind === "miner") {
      setEnergy(value => value + 2);
      setAp(value => value - 1);
      setActivatedUnitIds(value => [...value, selectedUnit.id]);
      setMessage("Miner burst: +2 Energy.");
      return;
    }
    if (selectedUnit.kind === "masternode") {
      [selectedNode, ...adjacent].forEach(id => { if (draft[id].owner === "player") draft[id].fortified = true; });
      setBoard(draft); setAp(value => value - 1); setActivatedUnitIds(value => [...value, selectedUnit.id]); setMessage("Masternode fortified nearby blue Nodes: -1 incoming damage on units there."); return;
    }
    if (selectedUnit.kind === "firewall") {
      adjacent.forEach(id => { const unit = draft[id].unit; if (unit?.side === "player") draft[id].unit = { ...unit, shield: unit.shield + 2 }; });
      setBoard(draft); setAp(value => value - 1); setActivatedUnitIds(value => [...value, selectedUnit.id]); setMessage("Firewall pulse: adjacent units gain +2 Shield."); return;
    }
    if (selectedUnit.kind === "hacker") {
      const target = adjacent.find(id => draft[id].owner === "enemy" && id !== "D2" && !draft[id].unit);
      if (!target) { setMessage("Hacker needs an adjacent empty red Node."); return; }
      draft[target].owner = "player";
      draft[target].fortified = false;
      setBoard(draft); setAp(value => value - 1); setActivatedUnitIds(value => [...value, selectedUnit.id]); setScore(value => value + 55); setMessage(`Hacker hijacked ${target}.`); return;
    }
    if (selectedUnit.kind === "developer") {
      const target = [selectedNode, ...adjacent].find(id => draft[id].owner === "corrupt");
      if (!target) { setMessage("No corrupted Node in repair range."); return; }
      draft[target].owner = "player";
      setBoard(draft); setAp(value => value - 1); setActivatedUnitIds(value => [...value, selectedUnit.id]); setMessage(`Developer restored ${target}.`); return;
    }
    if (selectedUnit.kind === "sniper") { setMessage("Sniper passive: click an enemy up to 2 links away to fire."); return; }
    const target = adjacent.find(id => draft[id].unit?.side === "enemy");
    if (!target) { setMessage("Bot rush needs an adjacent enemy."); return; }
    applyDamage(target, 3 + (networkSize >= 3 ? 1 : 0), draft);
    const bot = draft[selectedNode].unit;
    if (bot) draft[selectedNode].unit = { ...bot, hp: Math.max(1, bot.hp - 1) };
    setBoard(draft); setAp(value => value - 1); setActivatedUnitIds(value => [...value, selectedUnit.id]); setMessage("Bot rush: 3 damage, 1 recoil.");
  };

  const specialLabel = selectedUnit ? ({
    miner: "MINE +2⚡", masternode: "FORTIFY", firewall: "SHIELD PULSE", hacker: "HACK NODE", developer: "REPAIR", sniper: "RANGE 2", bot: "BOT RUSH",
  } as Record<UnitKind, string>)[selectedUnit.kind] : "SELECT UNIT";

  const enemyIntent = useMemo(() => {
    const reinforcement = stage >= 2 && (turn % 2 === 0 || (plan.brain === "swarm" && turn >= 3)) ? " · reinforcement ready" : "";
    if (plan.brain === "hacker") {
      const target = ["C2", "B2", "C3", "B1"].find(id => board[id]?.owner === "player") ?? "C2";
      return `Hacker → cutting ${target}${reinforcement}`;
    }
    if (plan.brain === "assassin") {
      const prey = NODES.filter(node => ["miner", "developer"].includes(board[node.id]?.unit?.kind ?? "")).sort((a, b) => (board[a.id].unit?.hp ?? 99) - (board[b.id].unit?.hp ?? 99))[0];
      return `Assassin → hunting ${prey?.label ?? "your support units"}${reinforcement}`;
    }
    if (plan.brain === "defender") return `Defender → locking ${board.C2.owner === "enemy" ? "UPLINK" : "central Network"}${reinforcement}`;
    if (plan.brain === "swarm") return `Swarm → surrounding your CORE${reinforcement}`;
    if (plan.brain === "commander") return turn % 3 === 0 ? `⚠ 51% ATTACK → quorum ${bossQuorum}/5; need 3${reinforcement}` : `Commander → breaking quorum (${bossQuorum}/5)${reinforcement}`;
    return `Berserker → rushing your CORE${reinforcement}`;
  }, [board, bossQuorum, plan.brain, stage, turn]);

  const advancePacket = (draft: Record<string, BoardNode>) => {
    if (plan.objective !== "escort" || packetNode === "D1") return packetNode;
    const target = "D1";
    const queue: string[][] = [[packetNode]];
    const seen = new Set([packetNode]);
    while (queue.length) {
      const path = queue.shift()!;
      const at = path[path.length - 1];
      if (at === target) return path[1] ?? packetNode;
      for (const next of neighbors(at)) {
        if (!seen.has(next) && draft[next].owner === "player") { seen.add(next); queue.push([...path, next]); }
      }
    }
    return packetNode;
  };

  const resolveEnemyTurn = (source: Record<string, BoardNode>) => {
    const draft = structuredClone(source) as Record<string, BoardNode>;
    let nextCore = coreHp;
    const actions: string[] = [];
    const enemyNodes = NODES.filter(node => draft[node.id]?.unit?.side === "enemy").map(node => node.id);

    const attackPriority = (id: string) => {
      const target = draft[id].unit;
      if (!target) return -999;
      let value = (target.maxHp - target.hp) * 2;
      if (plan.brain === "assassin" && ["miner", "developer"].includes(target.kind)) value += 40;
      if (plan.brain === "hacker" && ["developer", "hacker"].includes(target.kind)) value += 18;
      if (target.kind === "sniper") value += 12;
      if (target.kind === "miner") value += 8;
      return value;
    };

    const preferredGoal = () => {
      if (plan.objective === "capture") {
        const block = CAPTURE_NODES.find(id => draft[id].owner === "player");
        if (block) return block;
      }
      if (plan.objective === "escort") return packetNode;
      if (plan.brain === "assassin") {
        const prey = NODES.filter(node => draft[node.id].unit?.side === "player" && ["miner", "developer"].includes(draft[node.id].unit?.kind ?? ""))
          .sort((a, b) => (draft[a.id].unit?.hp ?? 99) - (draft[b.id].unit?.hp ?? 99))[0];
        if (prey) return prey.id;
      }
      if (plan.brain === "hacker") return BOSS_QUORUM_NODES.find(id => draft[id].owner === "player") ?? "C2";
      if (plan.brain === "defender") return "C2";
      if (plan.brain === "commander") return BOSS_QUORUM_NODES.find(id => draft[id].owner === "player") ?? "C2";
      return "A2";
    };

    for (const from of enemyNodes) {
      const unit = draft[from].unit;
      if (!unit) continue;
      const adjacent = neighbors(from);

      if (plan.brain === "hacker") {
        const steal = adjacent
          .filter(id => draft[id].owner === "player" && id !== "A2" && !draft[id].unit)
          .sort((a, b) => (a === "C2" ? -1 : 0) - (b === "C2" ? -1 : 0))[0];
        if (steal) {
          draft[steal].owner = "corrupt";
          draft[steal].fortified = false;
          actions.push(`Hacker corrupted ${steal}`);
          continue;
        }
      }

      const playerTarget = adjacent.filter(id => draft[id].unit?.side === "player").sort((a, b) => attackPriority(b) - attackPriority(a))[0];
      if (playerTarget) {
        const brainBonus = plan.brain === "berserker" || plan.brain === "assassin" ? 1 : 0;
        const stageBonus = stage >= 4 ? 1 : 0;
        const damage = Math.ceil((UNIT_DEFS[unit.kind].attack + brainBonus + stageBonus) * rule.enemyDamage);
        applyDamage(playerTarget, damage, draft);
        actions.push(`${BRAIN_LABEL[plan.brain].name} hit ${playerTarget} for ${damage}`);
        continue;
      }
      if (adjacent.includes("A2")) {
        const coreDamage = 2 + (plan.brain === "berserker" ? 2 : 0) + (stage >= 4 ? 1 : 0);
        nextCore = Math.max(0, nextCore - Math.ceil(coreDamage * rule.enemyDamage));
        actions.push(`${BRAIN_LABEL[plan.brain].name} hit CORE`);
        continue;
      }
      if (plan.brain === "defender" && ["C1", "C2", "C3"].includes(from)) { actions.push(`Defender held ${from}`); continue; }

      const prey = preferredGoal();
      const move = adjacent
        .filter(id => !draft[id].unit && id !== "A2" && id !== "D2")
        .sort((a, b) => {
          const score = (id: string) => {
            let value = -graphDistance(id, prey) * 10;
            if (draft[id].owner === "player") value += 9;
            if (id === "C2") value += plan.brain === "defender" || plan.brain === "commander" ? 14 : 5;
            if (plan.objective === "capture" && CAPTURE_NODES.includes(id as typeof CAPTURE_NODES[number])) value += 14;
            if (plan.brain === "commander" && BOSS_QUORUM_NODES.includes(id as typeof BOSS_QUORUM_NODES[number])) value += 10;
            return value;
          };
          return score(b) - score(a);
        })[0];
      if (move) {
        draft[move].unit = unit;
        draft[move].owner = "enemy";
        draft[move].fortified = false;
        delete draft[from].unit;
        if (from !== "D2") draft[from].owner = "enemy";
        actions.push(`${BRAIN_LABEL[plan.brain].name} advanced to ${move}`);
      }
    }

    if (plan.brain === "commander" && turn % 3 === 0) {
      const quorum = BOSS_QUORUM_NODES.filter(id => draft[id].owner === "player").length;
      if (quorum < 3) {
        nextCore = Math.max(0, nextCore - Math.ceil(8 * rule.enemyDamage));
        actions.push(`51% ATTACK landed (${quorum}/5 quorum)`);
      } else {
        const disrupt = BOSS_QUORUM_NODES.find(id => draft[id].owner === "player" && !draft[id].unit);
        if (disrupt) { draft[disrupt].owner = "corrupt"; draft[disrupt].fortified = false; actions.push(`51% blocked · ${disrupt} disrupted`); }
        else actions.push(`51% ATTACK blocked (${quorum}/5 quorum)`);
      }
    }

    const reinforcementDue = stage >= 2 && (turn % 2 === 0 || (plan.brain === "swarm" && turn >= 3));
    if (reinforcementDue) {
      const spawn = ["D1", "D3", "C1"].find(id => !draft[id].unit && draft[id].owner !== "player");
      if (spawn) {
        const kind: UnitKind = plan.brain === "hacker" ? "hacker" : plan.brain === "assassin" ? "sniper" : plan.brain === "defender" ? "firewall" : plan.brain === "commander" ? "masternode" : "bot";
        draft[spawn].owner = "enemy";
        draft[spawn].fortified = false;
        draft[spawn].unit = makeUnit("enemy", kind, turn + stage * 20, rule.enemyHp);
        actions.push(`Reinforcement deployed at ${spawn}`);
      }
    }
    return { draft, nextCore, actions };
  };

  const endTurn = () => {
    if (status !== "playing") return;
    const { draft, nextCore, actions } = resolveEnemyTurn(board);
    if (nextCore <= 0 || draft.A2.owner === "enemy") {
      setBoard(draft); setCoreHp(0); setStatus("lost"); setMessage("CORE OFFLINE. The enemy broke your chain."); finishScore(score); return;
    }

    const miners = NODES.filter(node => draft[node.id].unit?.side === "player" && draft[node.id].unit?.kind === "miner").length;
    const nextNetwork = largestNetwork(draft, "player");
    const loop = hasLoop(draft, "player");
    const minerYield = miners * (1 + (upgrades.includes("miner") ? 1 : 0));
    const networkEnergy = nextNetwork >= 2 ? 1 : 0;
    let healedCore = nextCore + (nextNetwork >= 4 ? 1 : 0) + (nextNetwork >= 4 && upgrades.includes("mesh") ? 2 : 0);
    healedCore = Math.min(maxCoreHp, healedCore);
    if (loop) {
      for (const node of NODES) {
        const unit = draft[node.id].unit;
        if (unit?.side === "player") draft[node.id].unit = { ...unit, shield: unit.shield + 2 };
      }
    }
    for (const node of NODES) {
      const unit = draft[node.id].unit;
      if (unit?.side === "player" && unit.kind === "firewall") {
        for (const adjacent of neighbors(node.id)) {
          const friend = draft[adjacent].unit;
          if (friend?.side === "player") draft[adjacent].unit = { ...friend, shield: friend.shield + 1 };
        }
      }
    }
    const nextPacket = advancePacket(draft);
    setPacketNode(nextPacket);
    setBoard(draft);
    setCaptureHeld(CAPTURE_NODES.every(id => draft[id].owner === "player"));
    setCoreHp(healedCore);
    setEnergy(value => Math.min(20, value + minerYield + networkEnergy));
    setTurn(value => value + 1);
    setAp(3 + (draft.C2.owner === "player" ? 1 : 0));
    setActivatedUnitIds([]);
    setSelectedNode(null);
    setScore(value => value + Math.round((25 + nextNetwork * 8) * rule.score));
    const enemyReport = actions.length ? actions.slice(0, 3).join(" · ") : "Enemy held position";
    setMessage(`${enemyReport} · +${minerYield + networkEnergy} Energy · ${3 + (draft.C2.owner === "player" ? 1 : 0)} AP ready.`);
  };

  const attackBoss = () => {
    if (!isBoss || status !== "playing" || ap < 1 || !selectedNode || !selectedUnit) return;
    if (activatedUnitIds.includes(selectedUnit.id)) { setMessage(`${UNIT_DEFS[selectedUnit.kind].name} already acted this turn.`); return; }
    if (graphDistance(selectedNode, "D2") > (selectedUnit.kind === "sniper" ? 2 : 1)) { setMessage("Move into attack range of the enemy CORE."); return; }
    const damage = UNIT_DEFS[selectedUnit.kind].attack + (networkSize >= 3 ? 1 : 0) + (upgrades.includes("glass") ? 2 : 0);
    setBossHp(value => Math.max(0, value - damage));
    setAp(value => value - 1);
    setActivatedUnitIds(value => [...value, selectedUnit.id]);
    setScore(value => value + Math.round(damage * 25 * rule.score));
    setMessage(`${UNIT_DEFS[selectedUnit.kind].name} hits the enemy CORE for ${damage}.`);
  };

  const objectiveComplete = useMemo(() => {
    if (status !== "playing") return false;
    if (plan.objective === "elimination") return enemyCount === 0;
    if (plan.objective === "capture") return captureHeld;
    if (plan.objective === "defense") return turn >= 7;
    if (plan.objective === "escort") return packetNode === "D1";
    if (plan.objective === "survival") return turn >= 8;
    return bossHp <= 0;
  }, [bossHp, captureHeld, enemyCount, packetNode, plan.objective, status, turn]);

  useEffect(() => {
    if (!objectiveComplete || status !== "playing") return;
    const timer = window.setTimeout(() => {
      const bonus = Math.round((450 + stage * 140 + coreHp * 9) * rule.score);
      const nextScore = score + bonus;
      setScore(nextScore);
      setSelectedNode(null);
      if (stage >= 5) {
        setStatus("won");
        setMessage(`Network secured · run score ${nextScore.toLocaleString()}.`);
        finishScore(nextScore);
      } else {
        setUpgradeChoices(shuffled(UPGRADES.filter(upgrade => !upgrades.includes(upgrade.id))).slice(0, 3));
        setStatus("upgrade");
        setMessage(`${objective.name} complete · choose one protocol upgrade.`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // Completion intentionally snapshots the score once when status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectiveComplete]);

  const chooseUpgrade = (id: UpgradeId) => {
    const nextUpgrades = [...upgrades, id];
    setUpgrades(nextUpgrades);
    const nextStage = stage + 1;
    const nextPlan = route[nextStage];
    setBoard(createBoard(nextStage, nextPlan.brain, difficulty));
    setStage(nextStage);
    setTurn(1);
    setAp(3);
    setActivatedUnitIds([]);
    setCaptureHeld(false);
    setEnergy(5 + (nextUpgrades.includes("battery") ? 3 : 0));
    setCoreHp(Math.min(maxCoreHp, coreHp + 4));
    setBossHp(Math.ceil((18 + nextStage * 2) * rule.enemyHp));
    setPacketNode("A2");
    setSelectedNode(null);
    setStatus("playing");
    setMessage(`${OBJECTIVES[nextPlan.objective].name}: ${OBJECTIVES[nextPlan.objective].text}`);
  };

  const restartStage = () => {
    const current = route[stage] ?? plan;
    setBoard(createBoard(stage, current.brain, difficulty));
    setTurn(1); setAp(3); setActivatedUnitIds([]); setCaptureHeld(false); setEnergy(5 + (upgrades.includes("battery") ? 3 : 0)); setCoreHp(maxCoreHp); setPacketNode("A2"); setSelectedNode(null); setStatus("playing");
    setMessage(`${OBJECTIVES[current.objective].name}: ${OBJECTIVES[current.objective].text}`);
  };

  const selectedDef = selectedUnit ? UNIT_DEFS[selectedUnit.kind] : null;
  const selectedSpent = Boolean(selectedUnit && activatedUnitIds.includes(selectedUnit.id));
  const nodeAction = (id: string) => {
    if (!selectedNode || !selectedUnit || id === selectedNode) return "";
    const target = board[id];
    if (target.unit?.side === "player") return "switch";
    if (selectedSpent || ap < 1) return "";
    const distance = graphDistance(selectedNode, id);
    if (target.unit?.side === "enemy" && distance <= (selectedUnit.kind === "sniper" ? 2 : 1)) return "attack";
    if (!target.unit && distance === 1 && id !== "D2" && (target.owner !== "corrupt" || selectedUnit.kind === "developer")) return "move";
    return "";
  };
  const emptyBlueSelected = Boolean(selectedNode && board[selectedNode]?.owner === "player" && !board[selectedNode]?.unit);

  return (
    <div className={`card-shell tactics-shell${immersive ? " is-immersive" : ""}`} ref={gameRef} id="card-battler" onPointerDown={playMusic}>
      <audio ref={musicRef} src="/node-tactics/Point_to_Point.mp3" loop preload="auto" />
      <div className="card-topbar tactics-topbar">
        <div><small>PEPEPOW ARCADE / GAME 06 · TACTICAL ROGUELITE</small><strong>NODE TACTICS</strong><em>Build the network. Break the enemy chain.</em></div>
        <div className="tactics-topbar-actions">
          <button type="button" onClick={toggleMusic} aria-label={`Turn music ${musicOn ? "off" : "on"}`} aria-pressed={musicOn} title={`Music ${musicOn ? "on" : "off"}`}>♫ {musicOn ? "ON" : "OFF"}</button>
          <button type="button" className="rules-button" onClick={() => setShowRules(true)} aria-label="Open game rules">? RULES</button>
          <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
        </div>
      </div>

      <div className="card-guide tactics-guide" aria-label="How to play">
        <div><b>1</b><span><strong>3 AP · ONE ACTIVATION</strong><small>Each unit acts once per turn. Deploy also uses that unit&apos;s activation.</small></span></div>
        <div><b>2</b><span><strong>CONNECT THE NODES</strong><small>Blue links create Energy, Attack, healing and loop Shield bonuses.</small></span></div>
        <div><b>3</b><span><strong>COMMIT → ENEMY ACTS</strong><small>Read Intent first. Energy persists between turns, then resets next battle.</small></span></div>
      </div>

      {showRules && (
        <div className="rules-overlay" role="dialog" aria-modal="true" aria-label="Node Tactics rules">
          <div className="rules-panel">
            <div className="rules-head"><span><small>NODE TACTICS · QUICK RULEBOOK</small><strong>HOW TO PLAY</strong></span><button type="button" onClick={() => setShowRules(false)} aria-label="Close rules">CLOSE ×</button></div>
            <div className="rules-grid">
              <section><h4>YOUR TURN</h4><ol><li>Select a blue Node/unit.</li><li>Spend AP to deploy, move, attack or use a skill.</li><li>Each unit gets one activation per turn. A newly deployed unit is already activated.</li><li>Press COMMIT TURN. The enemy acts, then income, Network healing/shields and AP refresh resolve.</li></ol><p><b>Move / Attack / Skill:</b> 1 AP. <b>Deploy:</b> card AP + Energy shown below. UPLINK gives +1 AP next turn.</p></section>
              <section><h4>NODE NETWORK</h4><ul><li><b>2 linked:</b> +1 Energy / turn</li><li><b>3 linked:</b> +1 Attack</li><li><b>4 linked:</b> +1 CORE / turn</li><li><b>Closed loop:</b> +2 Shield to units / turn</li></ul><p>Moving onto an empty Node captures it. Corrupt Nodes require a Developer to restore. Fortified Nodes reduce damage by 1.</p></section>
              <section><h4>UNIT CARDS</h4><ul>{(Object.keys(UNIT_DEFS) as UnitKind[]).map(kind => { const def = UNIT_DEFS[kind]; return <li key={kind}><b>{def.icon} {def.name}</b> · HP {def.hp} · ATK {def.attack} · {def.ap} AP / {def.energy}⚡<br/><span>{def.role}</span></li>; })}</ul></section>
              <section><h4>WIN CONDITIONS</h4><ul><li><b>Elimination:</b> remove all hostiles.</li><li><b>Capture:</b> hold B1 + C2 + C3 through the enemy response.</li><li><b>Defense:</b> keep CORE online through turn 6.</li><li><b>Packet Escort:</b> connect a blue path so the Packet advances to D1 after each enemy turn.</li><li><b>Survival:</b> stay online through turn 7.</li><li><b>51% Boss:</b> destroy the enemy CORE; every third turn hold at least 3 of B1/B2/C1/C2/C3 or take major CORE damage.</li></ul></section>
              <section><h4>READ THE AI</h4><ul><li><b>Berserker:</b> rushes CORE.</li><li><b>Hacker:</b> corrupts open blue Nodes.</li><li><b>Defender:</b> anchors central/Uplink positions.</li><li><b>Assassin:</b> hunts Miner/Developer first.</li><li><b>Swarm:</b> surrounds and reinforces.</li><li><b>Commander:</b> breaks Boss quorum.</li></ul><p>The Intent panel previews its priority. From Stage 3, reinforcements can arrive on enemy-controlled spawn Nodes.</p></section>
              <section><h4>RUN & BUILD</h4><p>A run has 6 battles. After each of the first 5 wins, choose one upgrade. Build around Miner economy, Network defense, recovery, or attack. Energy resets each battle; upgrades persist for the run.</p><p><b>Overclock:</b> +25% enemy HP/damage and ×1.4 score.</p></section>
            </div>
          </div>
        </div>
      )}

      <div className="tactics-hud">
        <div><small>STAGE</small><strong>{Math.min(stage + 1, 6)}/6</strong></div>
        <div><small>TURN</small><strong>{turn}</strong></div>
        <div className="ap-meter"><small>ACTION POINTS</small><strong>{Array.from({ length: 4 }).map((_, index) => <i key={index} className={index < ap ? "on" : ""} />)} <b>{ap}</b></strong></div>
        <div><small>ENERGY</small><strong className="energy">⚡ {energy}</strong></div>
        <div><small>NETWORK</small><strong>{networkSize} LINK{networkSize === 1 ? "" : "S"}</strong></div>
        <div><small>CORE</small><strong>{coreHp}/{maxCoreHp}</strong></div>
      </div>

      <div className="objective-strip">
        <span className="objective-icon">{objective.icon}</span>
        <span><small>OBJECTIVE · {plan.objective === "capture" ? `${captureCount}/3` : plan.objective === "elimination" ? `${enemyCount} HOSTILES` : plan.objective === "escort" ? `PACKET ${packetNode}` : plan.objective === "boss" ? `BOSS ${bossHp} HP · QUORUM ${bossQuorum}/5` : `TURN ${turn}`}</small><strong>{objective.name}</strong><em>{objective.text}</em></span>
        <div className="run-pips" aria-label={`Stage ${stage + 1} of 6`}>{Array.from({ length: 6 }).map((_, index) => <i key={index} className={index < stage ? "done" : index === stage ? "active" : ""}>{index + 1}</i>)}</div>
      </div>

      <div className="tactics-main">
        <div className="network-board" aria-label="Node network battlefield">
          <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {EDGES.map(([a, b]) => {
              const left = NODE_BY_ID[a], right = NODE_BY_ID[b];
              const owner = board[a]?.owner === board[b]?.owner && ["player", "enemy"].includes(board[a]?.owner) ? board[a].owner : "neutral";
              return <line key={`${a}-${b}`} x1={left.x} y1={left.y} x2={right.x} y2={right.y} className={`edge ${owner}`} />;
            })}
          </svg>
          {NODES.map(node => {
            const state = board[node.id];
            const unit = state?.unit;
            const unitDef = unit ? UNIT_DEFS[unit.kind] : null;
            const target = ["B1", "C2", "C3"].includes(node.id) && plan.objective === "capture";
            const action = nodeAction(node.id);
            return (
              <button
                type="button"
                key={node.id}
                className={`network-node ${state?.owner ?? "neutral"} ${selectedNode === node.id ? "selected" : ""} ${action ? `action-${action}` : ""} ${target ? "objective-target" : ""} ${state?.fortified ? "fortified" : ""} ${node.uplink ? "uplink" : ""}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => handleNode(node.id)}
                aria-label={`${node.label}, ${state?.owner ?? "neutral"}${unitDef ? `, ${unitDef.name}` : ""}${action ? `, ${action}` : ""}`}
              >
                <span className="node-core"><i>{node.label}</i>{node.uplink && <b>+AP</b>}</span>
                {unit && <span className={`board-unit ${unit.side} ${unit.side === "player" && activatedUnitIds.includes(unit.id) ? "spent" : ""}`}><img src={unit.side === "player" ? UNIT_DEFS[unit.kind].art : ENEMY_ART[plan.brain]} alt="" /><b>{unitDef?.icon}</b><em>{unit.hp}{unit.shield > 0 ? `+${unit.shield}` : ""}</em></span>}
                {plan.objective === "escort" && packetNode === node.id && <span className="packet-token">▣</span>}
                {action === "move" && <span className="node-action-tag">MOVE</span>}
                {action === "attack" && <span className="node-action-tag">ATTACK</span>}
              </button>
            );
          })}
          {isBoss && <button type="button" className="boss-core-button" onClick={attackBoss} aria-label="Attack enemy core">51%<small>{bossHp} HP</small></button>}
          <div className="board-legend"><span><i className="blue" />YOU</span><span><i className="red" />ENEMY</span><span><i className="grey" />NEUTRAL</span><span><i className="purple" />CORRUPT</span></div>
          {status === "playing" && <div className="board-action-hint" role="status"><b>{selectedUnit ? `${selectedDef?.icon} ${selectedDef?.name}${selectedSpent ? " · ACTED" : " · READY"}` : selectedNode ? `NODE ${selectedNode}` : "TAP TO SELECT"}</b><span>{selectedUnit ? selectedSpent ? "Choose another unit or COMMIT" : ap > 0 ? "Tap MOVE / ATTACK or use SKILL" : "No AP · COMMIT TURN" : selectedNode ? "Deploy a unit below" : "Blue = yours · then choose a target"}</span></div>}

          {status !== "playing" && status !== "upgrade" && (
            <div className="card-overlay tactics-overlay">
              <span>{status === "ready" ? "TACTICAL ROGUELITE · v0.6" : status === "won" ? "NETWORK SECURED" : "CORE OFFLINE"}</span>
              <h3>{status === "ready" ? "NODE\nTACTICS" : status === "won" ? "RUN\nCLEAR." : "CHAIN\nBROKEN."}</h3>
              <p>{status === "ready" ? "Six short tactical battles. Spend AP across unit activations, connect Nodes, read enemy intent and build a different protocol each run." : message}</p>
              {status === "ready" ? (
                <div className="difficulty-picks">
                  <button type="button" onClick={() => startRun("core")}><strong>CORE RUN</strong><small>Recommended · learn the Network</small></button>
                  <button type="button" onClick={() => startRun("overclock")}><strong>OVERCLOCK</strong><small>+25% enemy power · ×1.4 score</small></button>
                </div>
              ) : status === "won" ? <button type="button" onClick={() => startRun(difficulty)}>NEW RUN · {rule.label}</button> : <button type="button" onClick={restartStage}>RETRY STAGE</button>}
            </div>
          )}

          {status === "upgrade" && (
            <div className="upgrade-overlay tactics-upgrade">
              <span>{objective.name} COMPLETE · PROTOCOL {stage + 1}/5</span>
              <h3>CHOOSE ONE UPGRADE</h3>
              <div className="upgrade-grid">
                {upgradeChoices.map(upgrade => <button type="button" key={upgrade.id} onClick={() => chooseUpgrade(upgrade.id)}><b>{upgrade.icon}</b><strong>{upgrade.name}</strong><small>{upgrade.text}</small></button>)}
              </div>
            </div>
          )}
        </div>

        <aside className="tactics-side">
          <div className="intent-card">
            <small>⚠ ENEMY INTENT</small>
            <strong>{brain.name}</strong>
            <p>{enemyIntent}</p>
            <em>{brain.cue}</em>
          </div>
          <div className="network-bonus-card">
            <small>NETWORK EFFECTS</small>
            {networkBonuses.map(item => <span className={item.active ? "active" : ""} key={item.label}><b>{item.active ? "✓" : "○"} {item.label}</b><em>{item.text}</em></span>)}
          </div>
          <div className="selection-card">
            <small>SELECTED</small>
            <strong>{selectedUnit ? `${selectedDef?.name} · ${selectedSpent ? "ACTED" : "READY"}` : selectedNode ? `NODE ${selectedNode}` : "NONE"}</strong>
            <p>{selectedUnit ? `${selectedDef?.role}. HP ${selectedUnit.hp}/${selectedUnit.maxHp} · ATK ${selectedDef?.attack}.` : selectedNode ? "Choose a unit card below to deploy here." : "Tap a blue Node or unit."}</p>
            <div className="selection-actions">
              <button type="button" onClick={specialAction} disabled={!selectedUnit || selectedSpent || ap < 1 || selectedUnit.kind === "sniper"}>{specialLabel} · 1 AP</button>
              <button type="button" className="clear-selection" onClick={() => { setSelectedNode(null); setMessage("Selection cleared."); }} disabled={!selectedNode}>CANCEL</button>
            </div>
          </div>
        </aside>
      </div>

      <div className="tactics-command">
        <div className="command-head"><span>UNIT CARDS · select an empty blue Node, then deploy</span><small>{message}</small></div>
        <div className="unit-roster">
          {(Object.keys(UNIT_DEFS) as UnitKind[]).map(kind => {
            const def = UNIT_DEFS[kind];
            const affordable = status === "playing" && ap >= def.ap && energy >= def.energy;
            const deployable = affordable && emptyBlueSelected;
            return <button type="button" key={kind} className={`${affordable ? "ready" : ""} ${deployable ? "deployable" : ""}`} onClick={() => deploy(kind)} disabled={status !== "playing"} aria-label={`${def.name}, ${def.ap} AP, ${def.energy} Energy${deployable ? ", ready to deploy" : ""}`}>
              <span className="unit-art"><img src={def.art} alt="" /><b>{def.icon}</b></span>
              <span><strong>{def.name}</strong><small>{def.role}</small><i className="unit-stats">HP {def.hp} · ATK {def.attack}{kind === "sniper" ? " · RNG 2" : ""}</i></span>
              <em>{def.ap} AP · {def.energy}⚡</em>
            </button>;
          })}
        </div>
        <div className="tactics-footer">
          <div className="build-strip"><small>RUN BUILD</small>{upgrades.length ? upgrades.map(id => { const upgrade = UPGRADES.find(item => item.id === id)!; return <span key={id}>{upgrade.icon} {upgrade.name}</span>; }) : <em>No upgrades yet</em>}</div>
          <div className="score-strip"><small>SCORE</small><strong>{score.toString().padStart(4, "0")}</strong><small>BEST</small><strong>{best.toString().padStart(4, "0")}</strong></div>
          <button type="button" className="commit-button" onClick={endTurn} disabled={status !== "playing"} title="Enemy acts, then Network income and AP refresh resolve">COMMIT TURN →</button>
        </div>
      </div>
    </div>
  );
}
