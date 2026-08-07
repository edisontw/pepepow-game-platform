"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number; name: string };
type RunState = "ready" | "playing" | "won";

const MAP = [
  "1111111111111111",
  "1000000000000001",
  "1000110002222001",
  "1000010002000001",
  "1000010002002201",
  "1000000000000201",
  "1033300033000201",
  "1000300003000001",
  "1000300000004401",
  "1000000440000401",
  "1002200040000401",
  "1000200000000001",
  "1000200333000001",
  "1000000300000001",
  "1000000000000001",
  "1111111111111111",
];

const SHARDS: Point[] = [
  { x: 6.5, y: 2.5, name: "GENESIS SHARD" },
  { x: 12.5, y: 5.5, name: "WALLET KEY" },
  { x: 3.5, y: 9.5, name: "MINER CRYSTAL" },
  { x: 9.5, y: 11.5, name: "NONCE CUBE" },
  { x: 13.5, y: 13.5, name: "NODE CORE" },
];
const EXIT = { x: 13.5, y: 1.5 };
const WALL_COLORS: Record<string, [number, number, number]> = {
  "1": [91, 69, 205],
  "2": [47, 43, 38],
  "3": [181, 219, 46],
  "4": [204, 142, 58],
};

export default function ExplorationGame() {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = useRef({ x: 2.5, y: 2.5, a: 0 });
  const keys = useRef(new Set<string>());
  const collectedRef = useRef(new Set<number>());
  const stateRef = useRef<RunState>("ready");
  const startTimeRef = useRef(0);
  const [runState, setRunState] = useState<RunState>("ready");
  const [collected, setCollected] = useState(0);
  const [time, setTime] = useState(0);
  const [message, setMessage] = useState("Find all 5 Block Relics, then reach the glowing Node Gate.");

  const restart = useCallback(() => {
    player.current = { x: 2.5, y: 2.5, a: 0 };
    collectedRef.current = new Set();
    keys.current.clear();
    stateRef.current = "playing";
    startTimeRef.current = performance.now();
    setCollected(0);
    setTime(0);
    setMessage("Explore the maze. Relics glow acid green when they are nearby.");
    setRunState("playing");
  }, []);

  const toggleFullscreen = async () => {
    if (!shellRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current.requestFullscreen();
  };

  const setControl = (key: string, down: boolean) => {
    if (stateRef.current !== "playing") return;
    if (down) keys.current.add(key);
    else keys.current.delete(key);
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(event.key)) {
        if (stateRef.current === "playing") event.preventDefault();
        keys.current.add(event.key.toLowerCase());
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    let frame = 0;
    let last = performance.now();
    let lastHud = 0;

    const isWall = (x: number, y: number) => {
      const gx = Math.floor(x), gy = Math.floor(y);
      return gy < 0 || gy >= MAP.length || gx < 0 || gx >= MAP[0].length || MAP[gy][gx] !== "0";
    };

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const p = player.current;
      if (stateRef.current === "playing") {
        const held = keys.current;
        const turn = (held.has("arrowleft") || held.has("a") ? -1 : 0) + (held.has("arrowright") || held.has("d") ? 1 : 0);
        const walk = (held.has("arrowup") || held.has("w") ? 1 : 0) + (held.has("arrowdown") || held.has("s") ? -1 : 0);
        p.a += turn * 2.15 * dt;
        const speed = walk * 2.35 * dt;
        const nx = p.x + Math.cos(p.a) * speed;
        const ny = p.y + Math.sin(p.a) * speed;
        if (!isWall(nx + Math.sign(speed) * 0.15 * Math.cos(p.a), p.y)) p.x = nx;
        if (!isWall(p.x, ny + Math.sign(speed) * 0.15 * Math.sin(p.a))) p.y = ny;

        SHARDS.forEach((s, i) => {
          if (!collectedRef.current.has(i) && Math.hypot(p.x - s.x, p.y - s.y) < 0.55) {
            collectedRef.current.add(i);
            setCollected(collectedRef.current.size);
            setMessage(`${s.name} recovered · ${collectedRef.current.size}/5 relics`);
          }
        });
        if (collectedRef.current.size === SHARDS.length && Math.hypot(p.x - EXIT.x, p.y - EXIT.y) < 0.7) {
          stateRef.current = "won";
          const total = Math.max(1, Math.floor((now - startTimeRef.current) / 1000));
          setTime(total);
          setMessage(`Node Gate synchronized in ${total}s. Exploration complete.`);
          setRunState("won");
        }
        if (now - lastHud > 250) {
          setTime(Math.floor((now - startTimeRef.current) / 1000));
          lastHud = now;
        }
      }

      // Sky + ground.
      const sky = ctx.createLinearGradient(0, 0, 0, H * .52);
      sky.addColorStop(0, "#765cff"); sky.addColorStop(1, "#ab9aff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * .52);
      const floor = ctx.createLinearGradient(0, H * .5, 0, H);
      floor.addColorStop(0, "#443f38"); floor.addColorStop(1, "#171613");
      ctx.fillStyle = floor; ctx.fillRect(0, H * .5, W, H * .5);
      ctx.fillStyle = "rgba(216,255,89,.9)"; ctx.beginPath(); ctx.arc(W * .16, H * .18, 42, 0, Math.PI * 2); ctx.fill();

      // Ray-cast low-poly walls.
      const fov = Math.PI / 3;
      const rayCount = 190;
      const stripW = W / rayCount + 1;
      const zBuffer = new Array<number>(rayCount);
      for (let i = 0; i < rayCount; i++) {
        const ra = p.a - fov / 2 + (i / rayCount) * fov;
        let dist = .03;
        let hit = "1";
        while (dist < 18) {
          const rx = p.x + Math.cos(ra) * dist;
          const ry = p.y + Math.sin(ra) * dist;
          const gx = Math.floor(rx), gy = Math.floor(ry);
          if (gy < 0 || gy >= MAP.length || gx < 0 || gx >= MAP[0].length || MAP[gy][gx] !== "0") {
            hit = MAP[gy]?.[gx] || "1"; break;
          }
          dist += .035;
        }
        const corrected = dist * Math.cos(ra - p.a);
        zBuffer[i] = corrected;
        const wallH = Math.min(H * 1.5, H * .8 / Math.max(.18, corrected));
        const [r, g, b] = WALL_COLORS[hit] || WALL_COLORS["1"];
        const shade = Math.max(.28, 1 - corrected / 12);
        ctx.fillStyle = `rgb(${r * shade},${g * shade},${b * shade})`;
        ctx.fillRect(i * stripW, H / 2 - wallH / 2, stripW + 1, wallH);
      }

      // Billboard relics and the exit portal.
      const sprites = [
        ...SHARDS.map((s, i) => ({ ...s, kind: "shard", hidden: collectedRef.current.has(i) })),
        { ...EXIT, name: "NODE GATE", kind: "exit", hidden: false },
      ].filter(s => !s.hidden).map(s => ({ ...s, d: Math.hypot(s.x - p.x, s.y - p.y) })).sort((a, b) => b.d - a.d);
      sprites.forEach(s => {
        let rel = Math.atan2(s.y - p.y, s.x - p.x) - p.a;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        if (Math.abs(rel) > fov * .62) return;
        const sx = W / 2 + (rel / (fov / 2)) * W / 2;
        const screenColumn = Math.max(0, Math.min(rayCount - 1, Math.floor((sx / W) * rayCount)));
        const spriteDepth = s.d * Math.cos(rel);
        if (spriteDepth > zBuffer[screenColumn] + .12) return;
        const size = Math.min(145, 150 / Math.max(.55, s.d));
        const sy = H / 2 + size * .2;
        ctx.save(); ctx.translate(sx, sy);
        if (s.kind === "shard") {
          ctx.shadowColor = "#baff00"; ctx.shadowBlur = 18;
          ctx.fillStyle = "#baff00"; ctx.rotate(Math.PI / 4 + now * .0005); ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);
        } else {
          ctx.strokeStyle = collectedRef.current.size === SHARDS.length ? "#baff00" : "#ff6e5b";
          ctx.lineWidth = Math.max(3, size * .08); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.arc(0, -size * .15, size * .42, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      });

      // Crosshair.
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W / 2 - 7, H / 2); ctx.lineTo(W / 2 + 7, H / 2); ctx.moveTo(W / 2, H / 2 - 7); ctx.lineTo(W / 2, H / 2 + 7); ctx.stroke();

      // Mini-map: walls, relics, gate, player.
      const scale = 5.2, ox = W - 100, oy = 15;
      ctx.fillStyle = "rgba(10,9,9,.72)"; ctx.fillRect(ox - 7, oy - 7, 16 * scale + 14, 16 * scale + 14);
      MAP.forEach((row, y) => [...row].forEach((v, x) => { if (v !== "0") { ctx.fillStyle = v === "3" ? "#baff00" : v === "4" ? "#cc8e3a" : v === "2" ? "#5b5750" : "#6f58d7"; ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale); } }));
      SHARDS.forEach((s, i) => { if (!collectedRef.current.has(i)) { ctx.fillStyle = "#baff00"; ctx.fillRect(ox + s.x * scale - 1.5, oy + s.y * scale - 1.5, 3, 3); } });
      ctx.fillStyle = collectedRef.current.size === SHARDS.length ? "#baff00" : "#ff6e5b"; ctx.fillRect(ox + EXIT.x * scale - 2, oy + EXIT.y * scale - 2, 4, 4);
      ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(ox + p.x * scale, oy + p.y * scale, 2.8, 0, Math.PI * 2); ctx.fill();

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="explore-shell" ref={shellRef} id="3d-exploration">
      <div className="explore-topbar">
        <div><small>PEPEPOW ARCADE / GAME 05</small><strong>BLOCKSCAPE 3D</strong></div>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>
      <div className="explore-guide">
        <div><b>1</b><span><strong>EXPLORE</strong><small>Move through Mining Village, Wallet City and the Blockchain Cave.</small></span></div>
        <div><b>2</b><span><strong>COLLECT ×5</strong><small>Walk into glowing green Block Relics to recover them.</small></span></div>
        <div><b>3</b><span><strong>ESCAPE</strong><small>After 5/5, reach the Node Gate marked red → green on the map.</small></span></div>
      </div>
      <div className="explore-hud">
        <div><small>RELICS</small><strong>{collected} / 5</strong></div>
        <div><small>TIME</small><strong>{String(Math.floor(time / 60)).padStart(2,"0")}:{String(time % 60).padStart(2,"0")}</strong></div>
        <div><small>GATE</small><strong className={collected === 5 ? "open" : "locked"}>{collected === 5 ? "OPEN" : "LOCKED"}</strong></div>
      </div>
      <div className="explore-view">
        <canvas ref={canvasRef} width={760} height={470} aria-label="First person 3D exploration game" />
        {runState !== "playing" && <div className="explore-overlay">
          <span>{runState === "won" ? "EXPEDITION COMPLETE" : "GAME 05 · 3D EXPLORATION"}</span>
          <h3>{runState === "won" ? "NODE\nSYNCED." : "ENTER THE\nBLOCKSCAPE."}</h3>
          <p>{runState === "won" ? `All five relics recovered and the Node Gate reached in ${time} seconds.` : "A tiny first-person PEPEPOW world. Recover five relics hidden across the maze, then find your way to the Node Gate."}</p>
          <button type="button" onClick={restart}>{runState === "won" ? "EXPLORE AGAIN" : "START EXPLORING"}</button>
        </div>}
      </div>
      <div className="explore-controls" aria-label="Movement controls">
        <div className="explore-pad">
          <button type="button" onPointerDown={() => setControl("arrowleft", true)} onPointerUp={() => setControl("arrowleft", false)} onPointerCancel={() => setControl("arrowleft", false)} onPointerLeave={() => setControl("arrowleft", false)} aria-label="Turn left">↶</button>
          <button type="button" onPointerDown={() => setControl("arrowup", true)} onPointerUp={() => setControl("arrowup", false)} onPointerCancel={() => setControl("arrowup", false)} onPointerLeave={() => setControl("arrowup", false)} aria-label="Move forward">▲</button>
          <button type="button" onPointerDown={() => setControl("arrowdown", true)} onPointerUp={() => setControl("arrowdown", false)} onPointerCancel={() => setControl("arrowdown", false)} onPointerLeave={() => setControl("arrowdown", false)} aria-label="Move backward">▼</button>
          <button type="button" onPointerDown={() => setControl("arrowright", true)} onPointerUp={() => setControl("arrowright", false)} onPointerCancel={() => setControl("arrowright", false)} onPointerLeave={() => setControl("arrowright", false)} aria-label="Turn right">↷</button>
        </div>
        <p>{message}</p>
        <b>KEYBOARD · W/S move · A/D turn &nbsp; | &nbsp; MOBILE · hold the buttons</b>
      </div>
    </div>
  );
}
