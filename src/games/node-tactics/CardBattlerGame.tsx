"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Card = {
  id: string;
  name: string;
  kind: "ATTACK" | "DEFENSE" | "UTILITY";
  cost: number;
  icon: string;
  text: string;
  attack?: number;
  block?: number;
  heal?: number;
  energy?: number;
};

type EnemyMove = { name: string; icon: string; attack?: number; block?: number; drain?: number };
type Status = "ready" | "playing" | "upgrade" | "won" | "lost";
type Difficulty = "core" | "overclock";
type UpgradeId = "core" | "burst" | "shield" | "battery" | "firewall";

const BASE_CARDS: Card[] = [
  { id: "miner", name: "Hash Miner", kind: "ATTACK", cost: 1, icon: "⛏", text: "Deal 4 damage.", attack: 4 },
  { id: "guard", name: "Masternode", kind: "DEFENSE", cost: 1, icon: "⬡", text: "Gain 5 shield.", block: 5 },
  { id: "wallet", name: "Wallet Patch", kind: "UTILITY", cost: 2, icon: "+", text: "Restore 5 CORE.", heal: 5 },
  { id: "fork", name: "Fork Strike", kind: "ATTACK", cost: 2, icon: "⑂", text: "Deal 7 damage.", attack: 7 },
  { id: "community", name: "Community", kind: "UTILITY", cost: 2, icon: "◎", text: "Deal 3 + gain 4 shield.", attack: 3, block: 4 },
  { id: "hashrate", name: "Hash Boost", kind: "UTILITY", cost: 0, icon: "⚡", text: "Gain 1 energy this turn.", energy: 1 },
  { id: "firewall", name: "Firewall", kind: "DEFENSE", cost: 2, icon: "▦", text: "Gain 9 shield.", block: 9 },
  { id: "overclock", name: "Overclock", kind: "ATTACK", cost: 3, icon: "↯", text: "Deal 11 damage.", attack: 11 },
];

const EARLY_ENEMIES = [
  { name: "POOL SCOUT", hp: 22, color: "#baff00", moves: [
    { name: "Probe", icon: "→", attack: 4 }, { name: "Cache", icon: "□", block: 5 }, { name: "Burst", icon: "≫", attack: 6 },
  ] as EnemyMove[] },
  { name: "MEMPOOL LEECH", hp: 20, color: "#61e7ff", moves: [
    { name: "Nibble", icon: "→", attack: 3 }, { name: "Fee Sip", icon: "−", attack: 2, drain: 1 }, { name: "Packet Rush", icon: "≫", attack: 7 },
  ] as EnemyMove[] },
];

const MID_ENEMIES = [
  { name: "FORK RAIDER", hp: 29, color: "#9d83ff", moves: [
    { name: "Fork Hit", icon: "⑂", attack: 6 }, { name: "Guard", icon: "⬡", block: 7 }, { name: "Fee Jam", icon: "−", attack: 3, drain: 1 }, { name: "Double Ping", icon: "≫", attack: 8 },
  ] as EnemyMove[] },
  { name: "ORPHAN REAPER", hp: 27, color: "#ffcf55", moves: [
    { name: "Reorg", icon: "↺", block: 6 }, { name: "Sweep", icon: "→", attack: 7 }, { name: "Stale Block", icon: "−", attack: 4, drain: 1 }, { name: "Reaper", icon: "✦", attack: 9 },
  ] as EnemyMove[] },
];

const FINAL_ENEMY =
  { name: "CHAIN TYRANT", hp: 38, color: "#ff6e5b", moves: [
    { name: "Sync Slam", icon: "↓", attack: 8 }, { name: "Hard Shield", icon: "▦", block: 9 }, { name: "Network Jam", icon: "−", attack: 5, drain: 1 }, { name: "Hash Storm", icon: "✦", attack: 11 },
  ] as EnemyMove[] };

const UPGRADES: { id: UpgradeId; icon: string; name: string; text: string }[] = [
  { id: "core", icon: "♥", name: "CORE+", text: "+5 max CORE · heal 10" },
  { id: "burst", icon: "↯", name: "OVERCLOCK", text: "Add an 11-damage card" },
  { id: "shield", icon: "⬡", name: "HARDEN", text: "+5 opening shield" },
  { id: "battery", icon: "⚡", name: "BATTERY", text: "+1 energy every turn" },
  { id: "firewall", icon: "▦", name: "FIREWALL+", text: "Add a 9-shield card" },
];

const DIFFICULTY = {
  core: { label: "CORE", hp: 1, attack: 1, score: 1 },
  overclock: { label: "OVERCLOCK", hp: 1.2, attack: 1.2, score: 1.4 },
};

function shuffled<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function makeDeck(extraBurst: number, extraFirewall: number): Card[] {
  const ids = ["miner", "miner", "miner", "guard", "guard", "guard", "fork", "fork", "wallet", "community", "hashrate", "firewall"];
  for (let i = 0; i < extraBurst; i++) ids.push("overclock");
  for (let i = 0; i < extraFirewall; i++) ids.push("firewall");
  return shuffled(ids.map((id, index) => ({ ...BASE_CARDS.find(card => card.id === id)!, uid: `${id}-${index}-${Math.random()}` })));
}

export default function CardBattlerGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [difficulty, setDifficulty] = useState<Difficulty>("core");
  const [runEnemies, setRunEnemies] = useState([EARLY_ENEMIES[0], MID_ENEMIES[0], FINAL_ENEMY]);
  const [battle, setBattle] = useState(0);
  const [turn, setTurn] = useState(1);
  const [maxHp, setMaxHp] = useState(26);
  const [hp, setHp] = useState(26);
  const [shield, setShield] = useState(0);
  const [enemyHp, setEnemyHp] = useState(EARLY_ENEMIES[0].hp);
  const [enemyShield, setEnemyShield] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [enemyMoveIndex, setEnemyMoveIndex] = useState(0);
  const [extraBurst, setExtraBurst] = useState(0);
  const [extraFirewall, setExtraFirewall] = useState(0);
  const [startShield, setStartShield] = useState(0);
  const [energyBonus, setEnergyBonus] = useState(0);
  const [upgradeChoices, setUpgradeChoices] = useState(UPGRADES.slice(0, 3));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("Read the enemy intent, spend energy, then end your turn.");

  const enemy = runEnemies[battle] || FINAL_ENEMY;
  const enemyMove = enemy.moves[enemyMoveIndex % enemy.moves.length];
  const difficultyRule = DIFFICULTY[difficulty];
  const enemyMaxHp = Math.round(enemy.hp * difficultyRule.hp);
  const intentAttack = enemyMove.attack ? Math.ceil(enemyMove.attack * difficultyRule.attack) : 0;

  const drawCards = useCallback((drawDeck: Card[], drawDiscard: Card[], count: number) => {
    let pile = [...drawDeck];
    let usedDiscard = [...drawDiscard];
    const cards: Card[] = [];
    while (cards.length < count) {
      if (!pile.length) {
        if (!usedDiscard.length) break;
        pile = shuffled(usedDiscard);
        usedDiscard = [];
      }
      cards.push(pile.shift()!);
    }
    return { cards, pile, usedDiscard };
  }, []);

  const beginBattle = useCallback((index: number, currentHp: number, burst: number, openingShield: number, firewall: number, battery: number, mode: Difficulty) => {
    const freshDeck = makeDeck(burst, firewall);
    const drawn = drawCards(freshDeck, [], 5);
    const selectedEnemy = runEnemies[index] || FINAL_ENEMY;
    setBattle(index);
    setTurn(1);
    setHp(currentHp);
    setShield(openingShield);
    setEnemyHp(Math.round(selectedEnemy.hp * DIFFICULTY[mode].hp));
    setEnemyShield(0);
    setEnergy(Math.min(3 + battery, 5));
    setDeck(drawn.pile);
    setHand(drawn.cards);
    setDiscard([]);
    setEnemyMoveIndex(0);
    setStatus("playing");
    setMessage(`${selectedEnemy.name} connected. Read its intent, then build your turn.`);
  }, [drawCards, runEnemies]);

  const startGame = useCallback((mode: Difficulty = difficulty) => {
    const storedBest = Number(window.localStorage.getItem("pepepow-card-best") || 0);
    const route = [
      EARLY_ENEMIES[Math.floor(Math.random() * EARLY_ENEMIES.length)],
      MID_ENEMIES[Math.floor(Math.random() * MID_ENEMIES.length)],
      FINAL_ENEMY,
    ];
    setBest(storedBest);
    setDifficulty(mode);
    setRunEnemies(route);
    setMaxHp(26);
    setExtraBurst(0);
    setExtraFirewall(0);
    setStartShield(0);
    setEnergyBonus(0);
    setScore(0);
    const freshDeck = makeDeck(0, 0);
    const drawn = drawCards(freshDeck, [], 5);
    setBattle(0);
    setTurn(1);
    setHp(26);
    setShield(0);
    setEnemyHp(Math.round(route[0].hp * DIFFICULTY[mode].hp));
    setEnemyShield(0);
    setEnergy(3);
    setDeck(drawn.pile);
    setHand(drawn.cards);
    setDiscard([]);
    setEnemyMoveIndex(0);
    setStatus("playing");
    setMessage(`${route[0].name} connected. Read its intent, then build your turn.`);
  }, [difficulty, drawCards]);

  const finishScore = useCallback((value: number) => {
    setBest(current => {
      const next = Math.max(current, value);
      window.localStorage.setItem("pepepow-card-best", String(next));
      return next;
    });
  }, []);

  const damageEnemy = (amount: number) => {
    const absorbed = Math.min(enemyShield, amount);
    const damage = amount - absorbed;
    const hpAfter = Math.max(0, enemyHp - damage);
    setEnemyShield(value => Math.max(0, value - amount));
    setEnemyHp(hpAfter);
    return { damage, hpAfter };
  };

  const playCard = (card: Card, index: number) => {
    if (status !== "playing" || card.cost > energy) return;
    setEnergy(value => value - card.cost + (card.energy || 0));
    let dealt = 0;
    let hpAfter = enemyHp;
    if (card.attack) {
      const result = damageEnemy(card.attack);
      dealt = result.damage;
      hpAfter = result.hpAfter;
    }
    if (card.block) setShield(value => value + card.block!);
    if (card.heal) setHp(value => Math.min(maxHp, value + card.heal!));
    setHand(current => current.filter((_, i) => i !== index));
    setDiscard(current => [...current, card]);
    const gained = Math.round((dealt * 12 + (card.block || 0) * 3 + (card.heal || 0) * 4) * difficultyRule.score);
    setScore(value => value + gained);

    if (hpAfter <= 0) {
      const clearBonus = Math.round((300 + hp * 10 + battle * 150) * difficultyRule.score);
      const newScore = score + gained + clearBonus;
      setScore(newScore);
      if (battle === runEnemies.length - 1) {
        setStatus("won");
        setMessage(`Network secured. Final battle bonus +${clearBonus}.`);
        finishScore(newScore);
      } else {
        setUpgradeChoices(shuffled(UPGRADES).slice(0, 3));
        setStatus("upgrade");
        setMessage(`${enemy.name} defeated. Choose one upgrade before the next node.`);
      }
    } else {
      setMessage(`${card.name}: ${dealt ? `${dealt} damage` : "deployed"}${card.block ? ` · +${card.block} shield` : ""}${card.heal ? ` · +${card.heal} CORE` : ""}.`);
    }
  };

  const endTurn = () => {
    if (status !== "playing") return;
    let playerHp = hp;
    let playerShield = shield;
    let foeShield = enemyShield;
    if (enemyMove.attack) {
      const incoming = Math.ceil(enemyMove.attack * difficultyRule.attack);
      const absorbed = Math.min(playerShield, incoming);
      playerShield -= absorbed;
      playerHp = Math.max(0, playerHp - (incoming - absorbed));
    }
    if (enemyMove.block) foeShield += enemyMove.block;
    setHp(playerHp);
    setShield(0);
    setEnemyShield(foeShield);
    setEnemyMoveIndex(value => value + 1);

    if (playerHp <= 0) {
      setStatus("lost");
      setMessage(`${enemyMove.name} broke your CORE. Rebuild and try a different card order.`);
      finishScore(score);
      return;
    }

    const allDiscard = [...discard, ...hand];
    const drawn = drawCards(deck, allDiscard, 5);
    const nextTurn = turn + 1;
    const baseEnergy = Math.min(3 + energyBonus, 5);
    setDeck(drawn.pile);
    setDiscard(drawn.usedDiscard);
    setHand(drawn.cards);
    setTurn(nextTurn);
    setEnergy(Math.max(1, baseEnergy - (enemyMove.drain || 0)));
    setMessage(`${enemyMove.name} resolved. Shield expires each enemy turn — plan the next exchange.`);
  };

  const chooseUpgrade = (choice: UpgradeId) => {
    let newMax = maxHp;
    let newHp = Math.min(maxHp, hp + 6);
    let burst = extraBurst;
    let firewall = extraFirewall;
    let opening = startShield;
    let battery = energyBonus;
    if (choice === "core") {
      newMax += 5;
      newHp = Math.min(newMax, hp + 10);
      setMaxHp(newMax);
    }
    if (choice === "burst") {
      burst += 1;
      setExtraBurst(burst);
    }
    if (choice === "shield") {
      opening += 5;
      setStartShield(opening);
    }
    if (choice === "battery") {
      battery = Math.min(2, battery + 1);
      setEnergyBonus(battery);
    }
    if (choice === "firewall") {
      firewall += 1;
      setExtraFirewall(firewall);
    }
    beginBattle(battle + 1, newHp, burst, opening, firewall, battery, difficulty);
  };

  const toggleFullscreen = async () => {
    if (!gameRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameRef.current.requestFullscreen();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBest(Number(window.localStorage.getItem("pepepow-card-best") || 0));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const hpPct = useMemo(() => Math.max(0, (hp / maxHp) * 100), [hp, maxHp]);
  const enemyPct = useMemo(() => Math.max(0, (enemyHp / enemyMaxHp) * 100), [enemyHp, enemyMaxHp]);

  return (
    <div className="card-shell" ref={gameRef} id="card-battler">
      <div className="card-topbar">
        <div><small>PEPEPOW ARCADE / GAME 06</small><strong>NODE TACTICS</strong></div>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>

      <div className="card-guide" aria-label="How to play">
        <div><b>1</b><span><strong>CHECK NEXT HIT</strong><small>Yellow panel = what happens after your turn.</small></span></div>
        <div><b>2</b><span><strong>SPEND ⚡</strong><small>Tap cards. Shield only protects this enemy turn.</small></span></div>
        <div><b>3</b><span><strong>BUILD YOUR RUN</strong><small>Clear 3 nodes. Upgrade choices change each run.</small></span></div>
      </div>

      <div className="card-hud">
        <div><small>BATTLE</small><strong>{battle + 1}/3</strong></div>
        <div><small>TURN</small><strong>{turn}</strong></div>
        <div><small>ENERGY</small><strong className="energy">⚡ {energy}</strong></div>
        <div><small>SCORE</small><strong>{score.toString().padStart(4, "0")}</strong></div>
        <div><small>BEST</small><strong>{best.toString().padStart(4, "0")}</strong></div>
      </div>

      <div className="card-arena">
        <div className="fighter player-fighter">
          <span className="fighter-label">YOUR CORE</span>
          <div className="core-orb">PP</div>
          <div className="hp-track"><i style={{ width: `${hpPct}%` }} /></div>
          <strong>{hp}/{maxHp} CORE</strong>
          <small>{shield > 0 ? `⬡ ${shield} SHIELD` : "NO SHIELD"}</small>
        </div>

        <div className="intent-panel">
          <small>NEXT ENEMY MOVE</small>
          <span>{enemyMove.icon}</span>
          <strong>{enemyMove.name}</strong>
          <p>{intentAttack ? `${intentAttack} DMG` : ""}{intentAttack && enemyMove.block ? " + " : ""}{enemyMove.block ? `${enemyMove.block} SHIELD` : ""}{enemyMove.drain ? ` · −${enemyMove.drain} NEXT ENERGY` : ""}</p>
          {intentAttack > 0 && <em>{shield >= intentAttack ? "BLOCKED" : shield > 0 ? `${intentAttack - shield} WILL HIT CORE` : "CORE EXPOSED"}</em>}
        </div>

        <div className="fighter enemy-fighter" style={{ "--enemy": enemy.color } as React.CSSProperties}>
          <span className="fighter-label">{enemy.name}</span>
          <div className="enemy-node"><i/><i/><i/><b>×</b></div>
          <div className="hp-track"><i style={{ width: `${enemyPct}%` }} /></div>
          <strong>{enemyHp}/{enemyMaxHp} NODE</strong>
          <small>{enemyShield > 0 ? `⬡ ${enemyShield} SHIELD` : "EXPOSED"}</small>
        </div>

        {status !== "playing" && status !== "upgrade" && (
          <div className="card-overlay">
            <span>{status === "ready" ? "TACTICAL PROTOTYPE" : status === "won" ? "NETWORK SECURED" : "CORE OFFLINE"}</span>
            <h3>{status === "ready" ? "NODE\nTACTICS" : status === "won" ? "RUN\nCLEAR." : "REBOOT?"}</h3>
            <p>{status === "ready" ? "See the next enemy move, spend your energy, then commit the turn. Each run rolls different nodes and upgrade choices." : message}</p>
            {status === "ready" ? (
              <div className="difficulty-picks">
                <button type="button" onClick={() => startGame("core")}><strong>CORE RUN</strong><small>Recommended · normal score</small></button>
                <button type="button" onClick={() => startGame("overclock")}><strong>OVERCLOCK</strong><small>+20% enemy power · ×1.4 score</small></button>
              </div>
            ) : <button type="button" onClick={() => startGame(difficulty)}>PLAY AGAIN · {difficultyRule.label}</button>}
          </div>
        )}

        {status === "upgrade" && (
          <div className="upgrade-overlay">
            <span>NODE CLEARED · PICK 1</span>
            <h3>UPGRADE</h3>
            <div className="upgrade-grid">
              {upgradeChoices.map(upgrade => <button type="button" key={upgrade.id} onClick={() => chooseUpgrade(upgrade.id)}><b>{upgrade.icon}</b><strong>{upgrade.name}</strong><small>{upgrade.text}</small></button>)}
            </div>
          </div>
        )}
      </div>

      <div className="card-hand-area">
        <div className="hand-label"><span>YOUR HAND · {difficultyRule.label}</span><small>{message}</small></div>
        <div className="card-hand">
          {hand.map((card, index) => (
            <button type="button" className={`battle-card ${card.kind.toLowerCase()}`} key={`${card.id}-${index}`} onClick={() => playCard(card, index)} disabled={status !== "playing" || card.cost > energy}>
              <span className="card-cost">⚡{card.cost}</span>
              <b className="card-icon">{card.icon}</b>
              <strong>{card.name}</strong>
              <small>{card.kind}</small>
              <p>{card.text}</p>
              {card.cost <= energy && status === "playing" && <i className="playable-tag">READY</i>}
            </button>
          ))}
        </div>
        <div className="turn-controls">
          <span>DECK {deck.length} · DISCARD {discard.length} · SHIELD RESETS AFTER ENEMY MOVE</span>
          <button type="button" onClick={endTurn} disabled={status !== "playing"}>COMMIT TURN →</button>
        </div>
      </div>
    </div>
  );
}
