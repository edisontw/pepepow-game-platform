"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArcadeFullscreen } from "../../platform/useArcadeFullscreen";

const ROWS = 6;
const COLS = 8;
const PETS = [
  { id: "frog-miner", name: "Frog miner", x: 0, y: 0 },
  { id: "dog-miner", name: "Dog miner", x: 50, y: 0 },
  { id: "penguin-miner", name: "Penguin miner", x: 100, y: 0 },
  { id: "bull-miner", name: "Bull miner", x: 0, y: 50 },
  { id: "cat-miner", name: "Cat engineer", x: 50, y: 50 },
  { id: "turtle-miner", name: "Turtle miner", x: 100, y: 50 },
  { id: "bear-miner", name: "Bear miner", x: 0, y: 100 },
  { id: "owl-miner", name: "Owl engineer", x: 50, y: 100 },
  { id: "dragon-miner", name: "Dragon miner", x: 100, y: 100 },
] as const;
const PET_BY_ID = Object.fromEntries(PETS.map((pet) => [pet.id, pet])) as Record<string, (typeof PETS)[number]>;

type Cell = string | null;
type Point = { r: number; c: number };

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function typesForLevel(level: number) {
  return Math.min(PETS.length, 5 + Math.floor((level - 1) / 2));
}

function timeForLevel(level: number) {
  return Math.max(64, 92 - Math.min(28, (level - 1) * 2));
}

function hintsForLevel(level: number) {
  return Math.max(1, 3 - Math.floor((level - 1) / 4));
}

function makeBoard(level = 1, randomize = true): Cell[] {
  const tiles: string[] = [];
  const activePets = PETS.slice(0, typesForLevel(level));
  for (let pair = 0; pair < (ROWS * COLS) / 2; pair++) {
    const pet = activePets[pair % activePets.length].id;
    tiles.push(pet, pet);
  }
  return randomize ? shuffle(tiles) : tiles;
}

function samePoint(a: Point, b: Point) {
  return a.r === b.r && a.c === b.c;
}

function canLink(board: Cell[], from: Point, to: Point): boolean {
  if (samePoint(from, to)) return false;
  const paddedRows = ROWS + 2;
  const paddedCols = COLS + 2;
  const start = { r: from.r + 1, c: from.c + 1 };
  const goal = { r: to.r + 1, c: to.c + 1 };
  const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]] as const;
  const minTurns = Array.from({ length: paddedRows }, () =>
    Array.from({ length: paddedCols }, () => [3, 3, 3, 3])
  );
  const queue: Array<{ r: number; c: number; dir: number; turns: number }> = [];

  for (let dir = 0; dir < 4; dir++) {
    const [dr, dc] = dirs[dir];
    const r = start.r + dr;
    const c = start.c + dc;
    if (r < 0 || c < 0 || r >= paddedRows || c >= paddedCols) continue;
    const isGoal = r === goal.r && c === goal.c;
    const original = r > 0 && r <= ROWS && c > 0 && c <= COLS
      ? board[(r - 1) * COLS + (c - 1)]
      : null;
    if (original !== null && !isGoal) continue;
    minTurns[r][c][dir] = 0;
    queue.push({ r, c, dir, turns: 0 });
  }

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.r === goal.r && current.c === goal.c) return true;
    for (let dir = 0; dir < 4; dir++) {
      const turns = current.turns + (dir === current.dir ? 0 : 1);
      if (turns > 2) continue;
      const [dr, dc] = dirs[dir];
      const r = current.r + dr;
      const c = current.c + dc;
      if (r < 0 || c < 0 || r >= paddedRows || c >= paddedCols) continue;
      const isGoal = r === goal.r && c === goal.c;
      const original = r > 0 && r <= ROWS && c > 0 && c <= COLS
        ? board[(r - 1) * COLS + (c - 1)]
        : null;
      if (original !== null && !isGoal) continue;
      if (turns >= minTurns[r][c][dir]) continue;
      minTurns[r][c][dir] = turns;
      queue.push({ r, c, dir, turns });
    }
  }
  return false;
}

function findMove(board: Cell[]): [Point, Point] | null {
  for (let a = 0; a < board.length; a++) {
    if (!board[a]) continue;
    for (let b = a + 1; b < board.length; b++) {
      if (board[a] !== board[b]) continue;
      const from = { r: Math.floor(a / COLS), c: a % COLS };
      const to = { r: Math.floor(b / COLS), c: b % COLS };
      if (canLink(board, from, to)) return [from, to];
    }
  }
  return null;
}

function reshuffleRemaining(board: Cell[]): Cell[] {
  const remaining = shuffle(board.filter((cell): cell is string => cell !== null));
  let cursor = 0;
  return board.map(cell => cell === null ? null : remaining[cursor++]);
}

export default function PetMatchingGame() {
  const { shellRef: gameRef, immersive, toggleFullscreen } = useArcadeFullscreen<HTMLDivElement>();
  const musicRef = useRef<HTMLAudioElement>(null);
  const [board, setBoard] = useState<Cell[]>(() => makeBoard(1, false));
  const [selected, setSelected] = useState<Point | null>(null);
  const [hinted, setHinted] = useState<number[]>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(() => timeForLevel(1));
  const [hints, setHints] = useState(3);
  const [status, setStatus] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [message, setMessage] = useState("Match identical pets with a path of 2 turns or fewer.");
  const [best, setBest] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [continueUsed, setContinueUsed] = useState(false);

  useEffect(() => {
    setMusicOn(window.localStorage.getItem("pepepow-pet-match-music") !== "off");
  }, []);

  useEffect(() => () => musicRef.current?.pause(), []);

  const playMusic = useCallback(() => {
    if (!musicOn || !musicRef.current) return;
    musicRef.current.volume = 0.42;
    void musicRef.current.play().catch(() => {
      // Start/Next are direct user gestures and will retry if autoplay is blocked.
    });
  }, [musicOn]);

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => {
      setTime(current => {
        if (current <= 1) {
          setStatus("lost");
          setMessage(`Level ${level} timed out. Your endless run reached level ${level}.`);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [level, status]);

  const remaining = useMemo(() => board.filter(Boolean).length, [board]);

  const saveBest = useCallback((value: number) => {
    setBest(current => {
      const next = Math.max(current, value);
      window.localStorage.setItem("pepepow-pet-match-best", String(next));
      return next;
    });
  }, []);

  const beginLevel = useCallback((targetLevel: number, resetScore: boolean) => {
    setBest(Number(window.localStorage.getItem("pepepow-pet-match-best") || 0));
    let next = makeBoard(targetLevel);
    let tries = 0;
    while (!findMove(next) && tries++ < 12) next = reshuffleRemaining(next);
    setBoard(next);
    setSelected(null);
    setHinted([]);
    if (resetScore) setScore(0);
    setLevel(targetLevel);
    setCombo(0);
    setTime(timeForLevel(targetLevel));
    setHints(hintsForLevel(targetLevel));
    setContinueUsed(false);
    setStatus("playing");
    setMessage(`Level ${targetLevel} · ${typesForLevel(targetLevel)} miner types · outside-edge paths are allowed.`);
  }, []);

  const startGame = useCallback(() => {
    playMusic();
    beginLevel(1, true);
  }, [beginLevel, playMusic]);
  const nextLevel = useCallback(() => {
    playMusic();
    beginLevel(level + 1, false);
  }, [beginLevel, level, playMusic]);

  const continueLevel = useCallback(() => {
    if (status !== "lost" || continueUsed) return;
    playMusic();
    setSelected(null);
    setHinted([]);
    setTime(30);
    setContinueUsed(true);
    setStatus("playing");
    setMessage(`Level ${level} continued · +30 seconds. Make them count!`);
  }, [continueUsed, level, playMusic, status]);

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    window.localStorage.setItem("pepepow-pet-match-music", next ? "on" : "off");
    if (!musicRef.current) return;
    if (next) {
      musicRef.current.volume = 0.42;
      void musicRef.current.play().catch(() => {});
    } else {
      musicRef.current.pause();
    }
  };

  const handleTile = (index: number) => {
    if (status !== "playing" || !board[index]) return;
    const point = { r: Math.floor(index / COLS), c: index % COLS };
    setHinted([]);
    if (!selected) {
      setSelected(point);
      return;
    }
    if (samePoint(selected, point)) {
      setSelected(null);
      return;
    }
    const firstIndex = selected.r * COLS + selected.c;
    if (board[firstIndex] !== board[index]) {
      setSelected(point);
      setCombo(0);
      setMessage("Different pets — keep looking.");
      return;
    }
    if (!canLink(board, selected, point)) {
      setSelected(point);
      setCombo(0);
      setMessage("That pair is blocked. Try a route with ≤ 2 turns.");
      return;
    }

    const next = [...board];
    next[firstIndex] = null;
    next[index] = null;
    const nextCombo = combo + 1;
    const gained = 100 + Math.min(nextCombo - 1, 10) * 20;
    const nextScore = score + gained;
    setScore(nextScore);
    setCombo(nextCombo);
    setSelected(null);

    if (next.every(cell => cell === null)) {
      const timeBonus = time * 15 * level;
      const finalScore = nextScore + timeBonus;
      setScore(finalScore);
      saveBest(finalScore);
      setStatus("won");
      setMessage(`Level ${level} clear! +${timeBonus} time bonus. Level ${level + 1} is ready.`);
      setBoard(next);
      return;
    }

    if (!findMove(next)) {
      let mixed = reshuffleRemaining(next);
      let tries = 0;
      while (!findMove(mixed) && tries++ < 20) mixed = reshuffleRemaining(mixed);
      setBoard(mixed);
      setMessage(`+${gained} · No moves left, so the pets reshuffled.`);
    } else {
      setBoard(next);
      setMessage(`+${gained} · Combo ×${nextCombo} · Level ${level}`);
    }
  };

  const useHint = () => {
    if (status !== "playing" || hints <= 0) return;
    const move = findMove(board);
    if (!move) return;
    const [a, b] = move;
    setHinted([a.r * COLS + a.c, b.r * COLS + b.c]);
    setHints(value => value - 1);
    setCombo(0);
    setMessage("Hint shown — hints break the combo streak.");
  };

  const shuffleBoard = () => {
    if (status !== "playing") return;
    let next = reshuffleRemaining(board);
    let tries = 0;
    while (!findMove(next) && tries++ < 20) next = reshuffleRemaining(next);
    setBoard(next);
    setSelected(null);
    setHinted([]);
    setCombo(0);
    setScore(value => Math.max(0, value - 150));
    setMessage("Board shuffled · −150 points.");
  };

  return (
    <div className={`match-shell${immersive ? " is-immersive" : ""}`} ref={gameRef} id="pet-matching">
      <audio ref={musicRef} src="/pet-match/Morning_Puzzle_Wins.mp3" loop preload="auto" />
      <div className="match-topbar">
        <div><small>PEPEPOW ARCADE / GAME 02</small><strong>PET MATCH</strong></div>
        <button type="button" className="match-music-toggle" onClick={toggleMusic} aria-label={`Turn music ${musicOn ? "off" : "on"}`} aria-pressed={musicOn} title={`Music ${musicOn ? "on" : "off"}`}>♫ {musicOn ? "ON" : "OFF"}</button>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>
      <div className="match-stats" aria-label="Game status">
        <div><small>LEVEL</small><strong>{level}</strong></div>
        <div><small>SCORE</small><strong>{score.toString().padStart(5, "0")}</strong></div>
        <div><small>TIME</small><strong className={time <= 15 ? "danger" : ""}>{time}s</strong></div>
        <div><small>COMBO</small><strong>×{combo}</strong></div>
        <div><small>LEFT</small><strong>{remaining}</strong></div>
        <div><small>BEST</small><strong>{best.toString().padStart(5, "0")}</strong></div>
      </div>
      <div className="match-board-wrap">
        <div className="match-board" role="grid" aria-label="Pet matching board">
          {board.map((pet, index) => {
            const point = { r: Math.floor(index / COLS), c: index % COLS };
            const isSelected = selected ? samePoint(selected, point) : false;
            const isHinted = hinted.includes(index);
            const petMeta = pet ? PET_BY_ID[pet] : null;
            return (
              <button type="button" role="gridcell" className={`pet-tile ${pet ? `pet-${pet}` : "empty"} ${isSelected ? "selected" : ""} ${isHinted ? "hinted" : ""}`} key={index} disabled={!pet || status !== "playing"} onClick={() => handleTile(index)} aria-label={petMeta ? `${petMeta.name}, row ${point.r + 1}, column ${point.c + 1}` : "Empty"}>
                {petMeta && <span className="miner-pet" style={{ backgroundPosition: `${petMeta.x}% ${petMeta.y}%` }} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {status !== "playing" && (
          <div className="match-overlay">
            <span>{status === "ready" ? "ENDLESS MINER MATCH" : status === "won" ? `LEVEL ${level} CLEAR` : "RUN OVER"}</span>
            <h3>{status === "ready" ? "MINER\nMATCH" : status === "won" ? `NEXT\nLEVEL ${level + 1}` : "TRY\nAGAIN?"}</h3>
            <p>{status === "ready" ? "Match identical PEPEPOW miners through paths with no more than two turns. Clear a board to advance — levels continue without an end." : message}</p>
            {status === "lost" ? (
              <div className="match-overlay-actions">
                {!continueUsed && <button type="button" onClick={continueLevel}>CONTINUE +30s</button>}
                <button type="button" className="secondary" onClick={startGame}>NEW RUN</button>
              </div>
            ) : (
              <button type="button" onClick={status === "won" ? nextLevel : startGame}>{status === "ready" ? "START ENDLESS RUN" : `ENTER LEVEL ${level + 1}`}</button>
            )}
          </div>
        )}
      </div>
      <div className="match-controls">
        <p>{message}</p>
        <div>
          <button type="button" onClick={useHint} disabled={status !== "playing" || hints <= 0}>HINT {hints}/{hintsForLevel(level)}</button>
          <button type="button" onClick={shuffleBoard} disabled={status !== "playing"}>SHUFFLE −150</button>
        </div>
      </div>
    </div>
  );
}
