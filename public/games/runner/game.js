(() => {
  "use strict";

  const W = 430;
  const H = 650;
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const ui = {
    score: document.querySelector("#score"),
    best: document.querySelector("#best"),
    level: document.querySelector("#level"),
    weapon: document.querySelector("#weapon"),
    life: document.querySelector("#life"),
    overlay: document.querySelector("#overlay"),
    eyebrow: document.querySelector("#eyebrow"),
    title: document.querySelector("#title"),
    message: document.querySelector("#message"),
    summary: document.querySelector("#summary"),
    start: document.querySelector("#start"),
    fullscreen: document.querySelector("#fullscreen"),
    sound: document.querySelector("#sound"),
    music: document.querySelector("#music"),
    alert: document.querySelector("#stageAlert"),
  };
  const shell = document.querySelector(".game-shell");
  const city = new Image();
  city.src = "../../brand/pepepow-miner-city.webp";

  const sprites = {
    player: new Image(),
    grunt: new Image(),
    miniBoss: new Image(),
    finalBoss: new Image(),
    pickups: new Image(),
  };
  sprites.player.src = "assets/runner-player.webp";
  sprites.grunt.src = "assets/runner-grunt.webp";
  sprites.miniBoss.src = "assets/runner-mini-boss.webp";
  sprites.finalBoss.src = "assets/runner-final-boss.webp";
  sprites.pickups.src = "assets/runner-pickups.webp";

  const colors = { power: "#baff00", spread: "#ff9b57", rapid: "#65e7ff", shield: "#a88bff" };
  const labels = { power: "P", spread: "S", rapid: "R", shield: "◆" };
  const BASE_MINI_GATES = [900, 2400, 4200];
  const BASE_FINAL_GATE = 6200;
  const MINI_HP = [96, 112, 128];
  const STAGE_PROFILES = [
    { name: "CRYSTAL OUTSKIRTS", tint: "#65e7ff", spawnBoost: 0, hpBoost: 0, shotBoost: 0, swarm: 0 },
    { name: "DRONE FOUNDRY", tint: "#ff9b57", spawnBoost: 55, hpBoost: 0.04, shotBoost: 45, swarm: 0.08 },
    { name: "ION SHAFTS", tint: "#a88bff", spawnBoost: 25, hpBoost: 0.12, shotBoost: 105, swarm: 0.04 },
    { name: "CORE OVERDRIVE", tint: "#ffd85d", spawnBoost: 85, hpBoost: 0.08, shotBoost: 135, swarm: 0.11 },
  ];

  const keys = { left: false, right: false, up: false, down: false };
  let dragging = false;
  let pointerX = W / 2;
  let pointerY = H - 65;
  let raf = 0;
  let g = null;
  let best = Number(localStorage.getItem("pepepow-runner-high") || 0);
  let audio = null;
  let sfx = localStorage.getItem("pepepow-runner-sfx") !== "off";
  let bgm = localStorage.getItem("pepepow-runner-bgm") !== "off";
  let musicMode = null;
  let musicTarget = null;
  let musicFade = 0;
  const musicFiles = { run: "assets/Apex_Pursuit.mp3", boss: "assets/Gold_Coin_Velocity.mp3" };
  const music = new Audio();
  music.loop = true;
  music.preload = "auto";
  music.volume = 0.34;

  function pad(n) {
    return String(Math.floor(n)).padStart(5, "0");
  }

  function refreshSound() {
    ui.sound.textContent = sfx ? "♫ SFX ON" : "× SFX OFF";
    ui.sound.classList.toggle("muted", !sfx);
  }

  function refreshMusic() {
    ui.music.textContent = bgm ? "♪ BGM ON" : "× BGM OFF";
    ui.music.classList.toggle("muted", !bgm);
  }

  function stopMusic(fade = true) {
    clearInterval(musicFade);
    musicFade = 0;
    musicTarget = null;
    if (music.paused) {
      musicMode = null;
      return;
    }
    if (!fade) {
      music.pause();
      music.currentTime = 0;
      musicMode = null;
      return;
    }
    musicFade = setInterval(() => {
      music.volume = Math.max(0, music.volume - 0.055);
      if (music.volume <= 0.01) {
        clearInterval(musicFade);
        musicFade = 0;
        music.pause();
        music.currentTime = 0;
        musicMode = null;
        music.volume = 0.34;
      }
    }, 35);
  }

  function playMusic(mode, immediate = false) {
    if (!bgm) return;
    const src = musicFiles[mode];
    if (!src || (musicTarget === mode && !music.paused)) return;
    musicTarget = mode;
    clearInterval(musicFade);
    musicFade = 0;
    const begin = () => {
      if (!bgm || musicTarget !== mode) return;
      musicMode = mode;
      music.src = src;
      music.currentTime = 0;
      music.volume = immediate ? 0.34 : 0.02;
      music.play().catch(() => {});
      if (!immediate) {
        musicFade = setInterval(() => {
          music.volume = Math.min(0.4, music.volume + 0.04);
          if (music.volume >= 0.39) {
            clearInterval(musicFade);
            musicFade = 0;
          }
        }, 45);
      }
    };
    if (immediate || !musicMode || music.paused) {
      begin();
      return;
    }
    musicFade = setInterval(() => {
      music.volume = Math.max(0, music.volume - 0.055);
      if (music.volume <= 0.01) {
        clearInterval(musicFade);
        musicFade = 0;
        music.pause();
        if (musicTarget === mode) begin();
      }
    }, 35);
  }

  function initAudio() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume().catch(() => {});
  }

  function tone(f = 260, d = 0.07, type = "square", gain = 0.035, slide = 0) {
    if (!sfx || !audio) return;
    const t = audio.currentTime;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(f, t);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(22, f + slide), t + d);
    volume.gain.setValueAtTime(0.001, t);
    volume.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    volume.gain.exponentialRampToValueAtTime(0.001, t + d);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(t);
    oscillator.stop(t + d + 0.02);
  }

  function noiseBurst(d = 0.22, gain = 0.08, cutoff = 720) {
    if (!sfx || !audio) return;
    const length = Math.max(1, Math.floor(audio.sampleRate * d));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const envelope = Math.pow(1 - i / length, 2.1);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const volume = audio.createGain();
    const t = audio.currentTime;
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(90, cutoff * 0.35), t + d);
    volume.gain.setValueAtTime(gain, t);
    volume.gain.exponentialRampToValueAtTime(0.001, t + d);
    source.connect(filter).connect(volume).connect(audio.destination);
    source.start(t);
  }

  function sound(kind) {
    if (kind === "shot") tone(310, 0.035, "square", 0.018, 130);
    if (kind === "hit") tone(125, 0.045, "sawtooth", 0.02, 80);
    if (kind === "pickup") {
      tone(420, 0.08, "triangle", 0.045, 170);
      setTimeout(() => tone(660, 0.08, "triangle", 0.035, 120), 55);
    }
    if (kind === "hurt") tone(135, 0.15, "sawtooth", 0.06, -70);
    if (kind === "boss") {
      tone(95, 0.24, "sawtooth", 0.07, 55);
      setTimeout(() => tone(150, 0.18, "square", 0.055, 30), 140);
    }
    if (kind === "clear") {
      tone(380, 0.12, "triangle", 0.055, 220);
      setTimeout(() => tone(620, 0.18, "triangle", 0.06, 240), 105);
    }
    if (kind === "bossExplosion") {
      noiseBurst(0.42, 0.12, 620);
      tone(92, 0.38, "sawtooth", 0.09, -55);
      setTimeout(() => noiseBurst(0.24, 0.075, 880), 110);
      setTimeout(() => tone(64, 0.3, "triangle", 0.07, -32), 145);
    }
    if (kind === "finalBossExplosion") {
      noiseBurst(0.65, 0.15, 540);
      tone(78, 0.55, "sawtooth", 0.11, -45);
      setTimeout(() => noiseBurst(0.34, 0.1, 760), 120);
      setTimeout(() => tone(52, 0.48, "triangle", 0.09, -24), 210);
      setTimeout(() => noiseBurst(0.28, 0.07, 430), 330);
    }
    if (kind === "playerExplosion") {
      noiseBurst(0.46, 0.13, 980);
      tone(142, 0.32, "sawtooth", 0.1, -100);
      setTimeout(() => noiseBurst(0.25, 0.08, 520), 95);
      setTimeout(() => tone(68, 0.34, "triangle", 0.075, -34), 120);
    }
  }

  function burst(x, y, color, amount = 8, ring = false) {
    for (let i = 0; i < amount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.18;
      g.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 220 + Math.random() * 300,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    if (ring) g.rings.push({ x, y, r: 8, life: 330, color });
  }

  function notify(text, final = false) {
    ui.alert.textContent = text;
    ui.alert.className = `stage-alert ${final ? "final" : ""}`;
    void ui.alert.offsetWidth;
    ui.alert.classList.add("show");
  }

  function stageProfile(stage = g?.stage || 1) {
    return STAGE_PROFILES[(stage - 1) % STAGE_PROFILES.length];
  }

  function stageDifficulty() {
    return Math.max(0, (g?.stage || 1) - 1);
  }

  function stageGates() {
    const scale = 1 + Math.min(0.15, stageDifficulty() * 0.025);
    return {
      mini: BASE_MINI_GATES.map((value) => Math.round(value * scale)),
      final: Math.round(BASE_FINAL_GATE * scale),
    };
  }

  function bossHpScale() {
    return 1 + stageDifficulty() * 0.3;
  }

  function weaponLevel(name = g.weapon) {
    return Math.max(1, g.weaponLevels?.[name] || 0);
  }

  function saveBest() {
    best = Math.max(best, g.score);
    localStorage.setItem("pepepow-runner-high", String(best));
    ui.best.textContent = pad(best);
  }

  function updateHud() {
    ui.score.textContent = pad(g.score || 0);
    ui.level.textContent = String(g.stage || 1).padStart(2, "0");
    ui.weapon.textContent = `${(g.weapon || "pulse").toUpperCase()} · L${weaponLevel()}`;
    ui.life.textContent = "●".repeat(g.hp || 0) + "○".repeat(Math.max(0, 3 - (g.hp || 0)));
  }

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function updateFullscreenLabel() {
    ui.fullscreen.textContent = fullscreenElement() ? "↙ EXIT" : "⛶ FULLSCREEN";
  }

  function toggleFullscreen(force = false) {
    if (fullscreenElement() && !force) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
      return;
    }
    if (fullscreenElement()) return;
    try {
      shell.requestFullscreen?.({ navigationUI: "hide" })?.catch?.(() => {});
      shell.webkitRequestFullscreen?.();
    } catch {}
  }

  function fitForPlay() {
    try {
      window.frameElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {}
    if (matchMedia("(max-width: 900px), (pointer: coarse)").matches) toggleFullscreen(true);
  }

  function starfield(now) {
    ctx.fillStyle = "#070a16";
    ctx.fillRect(0, 0, W, H);
    if (city.complete && city.naturalWidth) {
      const cityH = W / (city.naturalWidth / city.naturalHeight);
      ctx.globalAlpha = 0.62;
      ctx.drawImage(city, 0, 0, city.naturalWidth, city.naturalHeight, 0, 0, W, cityH);
      ctx.globalAlpha = 1;
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#10173d");
      sky.addColorStop(0.55, "#342867");
      sky.addColorStop(1, "#10110f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = stageProfile().tint;
    ctx.fillRect(0, 0, W, H * 0.7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(4,8,18,.42)";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 22; i += 1) {
      const x = (i * 73) % W;
      const y = (i * 139 + now * 0.018 * ((i % 3) + 1)) % (H * 0.48);
      ctx.fillStyle = `rgba(114,210,255,${0.15 + (i % 3) * 0.1})`;
      ctx.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
    }
    const fog = ctx.createLinearGradient(0, H * 0.24, 0, H);
    fog.addColorStop(0, "rgba(7,9,18,0)");
    fog.addColorStop(0.35, "rgba(6,9,16,.32)");
    fog.addColorStop(0.72, "rgba(5,6,10,.84)");
    fog.addColorStop(1, "rgba(5,6,10,.98)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(76,209,255,.25)";
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(W / 2, H * 0.43);
      ctx.lineTo(W / 2 + i * 125, H);
      ctx.stroke();
    }
    const shift = (now / 8) % 64;
    for (let y = H * 0.48 + shift; y < H; y += 64) {
      ctx.beginPath();
      ctx.moveTo(W * 0.14, y);
      ctx.lineTo(W * 0.86, y);
      ctx.stroke();
    }
  }

  function spriteReady(img) {
    return img.complete && img.naturalWidth > 0;
  }

  function drawEnemy(e, now) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const mini = e.kind === "miniBoss";
    const final = e.kind === "finalBoss";
    const grunt = e.kind === "grunt";
    const zig = e.kind === "zigzag";
    const tank = e.kind === "tank";
    const accent = final ? "#ffd85d" : mini ? "#baff00" : grunt ? "#ff9b57" : zig ? "#65e7ff" : "#ff6578";
    if (mini && e.y > 112) {
      e.y = 112;
      e.speed = 0;
    }
    const img = final ? sprites.finalBoss : mini ? sprites.miniBoss : sprites.grunt;
    ctx.shadowColor = accent;
    ctx.shadowBlur = mini || final ? 20 : 10;
    if (spriteReady(img)) {
      const scale = final ? 2.6 : mini ? 2.05 : tank ? 1.35 : zig ? 1.02 : grunt ? 1.08 : 0.92;
      const size = e.r * 2.35 * scale;
      const aspect = img.naturalWidth / img.naturalHeight;
      const width = size * aspect;
      if (zig) ctx.rotate(Math.sin(now / 210 + e.phase) * 0.12);
      if (tank) ctx.scale(1.08, 1.08);
      ctx.drawImage(img, -width / 2, -size / 2, width, size);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.7 + 0.22 * Math.sin(now / (final ? 100 : 150));
      ctx.strokeStyle = accent;
      ctx.lineWidth = final ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * (final ? 0.48 : mini ? 0.54 : 0.42), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = "rgba(12,17,27,.94)";
      ctx.strokeStyle = accent;
      ctx.lineWidth = final ? 6 : mini ? 4 : 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (e.hp < e.maxHp) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#151a21";
      ctx.fillRect(-e.r, e.r + 12, e.r * 2, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(-e.r, e.r + 12, e.r * 2 * (e.hp / e.maxHp), 6);
    }
    ctx.restore();
  }

  function drawPickup(p, now) {
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(now / 130 + p.x) * 4);
    const pulse = 0.68 + 0.32 * (0.5 + 0.5 * Math.sin(now / 105 + p.x * 0.08));
    const scale = 1 + 0.075 * Math.sin(now / 125 + p.y * 0.05);
    ctx.scale(scale, scale);
    ctx.globalAlpha = pulse;
    ctx.shadowColor = colors[p.kind];
    ctx.shadowBlur = 18 + 12 * pulse;
    if (spriteReady(sprites.pickups)) {
      const index = { power: 0, spread: 1, rapid: 2, shield: 3 }[p.kind];
      const sw = sprites.pickups.naturalWidth / 2;
      const sh = sprites.pickups.naturalHeight / 2;
      const sx = (index % 2) * sw;
      const sy = Math.floor(index / 2) * sh;
      ctx.rotate(Math.sin(now / 260 + p.x) * 0.07);
      ctx.drawImage(sprites.pickups, sx, sy, sw, sh, -24, -24, 48, 48);
    } else {
      const grad = ctx.createRadialGradient(-6, -8, 2, 0, 0, 22);
      grad.addColorStop(0, "#fff");
      grad.addColorStop(0.22, colors[p.kind]);
      grad.addColorStop(1, "#25272d");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-20, -20, 40, 40, 9);
      ctx.fill();
      ctx.strokeStyle = colors[p.kind];
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#11110f";
      ctx.font = "900 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[p.kind], 0, 1);
    }
    ctx.globalAlpha = 0.25 + 0.3 * pulse;
    ctx.strokeStyle = colors[p.kind];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 29 + 3 * Math.sin(now / 110), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function draw(now) {
    starfield(now);
    if (g.shake > 0) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    }
    for (const p of g.pickups) drawPickup(p, now);
    for (const b of g.bullets) {
      ctx.strokeStyle = "#dfff8e";
      ctx.lineWidth = b.pierce ? 4 : 3;
      ctx.shadowColor = "#baff00";
      ctx.shadowBlur = b.pierce ? 14 : 9;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 20, b.y + 12);
      ctx.lineTo(b.x, b.y - 14);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    for (const b of g.enemyBullets) {
      const final = b.owner === "finalBoss";
      const grunt = b.owner === "grunt";
      const c = final ? "#ffd85d" : grunt ? "#ff9b57" : "#ff6578";
      ctx.fillStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = 11;
      ctx.beginPath();
      ctx.arc(b.x, b.y, final ? 8 : grunt ? 5 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const e of g.enemies) drawEnemy(e, now);
    for (const r of g.rings) {
      ctx.globalAlpha = Math.max(0, r.life / 330);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of g.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 520);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (g.shield) {
      ctx.strokeStyle = "#a88bff";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + 0.28 * Math.sin(now / 90);
      ctx.beginPath();
      ctx.arc(g.playerX, g.playerY, 32 + Math.min(1, g.shield - 1) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (!(g.invincible > 0 && Math.floor(now / 80) % 2 === 0)) {
      ctx.save();
      ctx.translate(g.playerX, g.playerY);
      ctx.shadowColor = "#baff00";
      ctx.shadowBlur = 12;
      if (spriteReady(sprites.player)) {
        const bob = Math.sin(now / 150) * 1.4;
        const height = 66;
        const width = height * (sprites.player.naturalWidth / sprites.player.naturalHeight);
        ctx.drawImage(sprites.player, -width / 2, -height / 2 + bob, width, height);
      } else {
        ctx.fillStyle = "#baff00";
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(22, 20);
        ctx.lineTo(0, 13);
        ctx.lineTo(-22, 20);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(186,255,0,.62)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (g.shake > 0) ctx.restore();
    if (g.flash > 0) {
      ctx.fillStyle = g.flashColor;
      ctx.globalAlpha = Math.min(0.22, g.flash / 260);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function spawnEnemy(now) {
    const profile = stageProfile();
    const diff = stageDifficulty();
    const roll = Math.random();
    const tough = Math.min(0.52, 0.13 + diff * 0.045 + g.stageScore / Math.max(7600, stageGates().final * 1.15));
    const kind = roll < 0.31 ? "grunt" : roll < 0.31 + tough * 0.28 ? "tank" : roll < 0.31 + tough ? "zigzag" : "drone";
    const base = kind === "grunt" ? { r: 20, hp: 2, speed: 0.082 } : kind === "tank" ? { r: 25, hp: 4, speed: 0.072 } : kind === "zigzag" ? { r: 20, hp: 2, speed: 0.1 } : { r: 17, hp: 1, speed: 0.12 };
    const hpScale = 1 + diff * 0.12 + profile.hpBoost;
    const hp = Math.max(base.hp, Math.round(base.hp * hpScale));
    const speedScale = 1 + Math.min(0.18, diff * 0.022);
    g.enemies.push({
      x: 48 + Math.random() * (W - 96),
      y: -35,
      r: base.r,
      hp,
      maxHp: hp,
      speed: base.speed * speedScale,
      kind,
      phase: Math.random() * 6.28,
      lastShot: now - 500 - Math.random() * 700,
    });
  }

  function segmentProgress() {
    const bossActive = g.enemies.some((e) => (e.kind === "miniBoss" || e.kind === "finalBoss") && e.hp > 0);
    if (bgm) {
      const wanted = bossActive ? "boss" : "run";
      if (musicTarget !== wanted || music.paused) playMusic(wanted, music.paused && musicMode === wanted);
    }
    const gates = stageGates();
    const startGate = g.miniBossCount === 0 ? 0 : gates.mini[g.miniBossCount - 1] + 480;
    const endGate = g.miniBossCount < 3 ? gates.mini[g.miniBossCount] : gates.final;
    return Math.max(0, Math.min(1, (g.stageScore - startGate) / Math.max(1, endGate - startGate)));
  }

  function award(points) {
    g.score += points;
    g.stageScore += points;
  }

  function firePlayer(now) {
    const level = weaponLevel();
    let delay = 270;
    if (g.weapon === "rapid") delay = Math.max(68, 138 - level * 10);
    else if (g.weapon === "spread") delay = Math.max(150, 260 - level * 14);
    else delay = Math.max(130, 285 - level * 23);
    if (now - g.lastShot <= delay) return;

    if (g.weapon === "spread") {
      const count = Math.min(7, 3 + 2 * Math.floor((level - 1) / 2));
      const width = level >= 5 ? 0.58 : 0.46;
      for (let i = 0; i < count; i += 1) {
        const vx = count === 1 ? 0 : -width / 2 + (width * i) / (count - 1);
        g.bullets.push({ x: g.playerX, y: g.playerY - 29, vx, vy: -0.7, pierce: 0 });
      }
    } else if (g.weapon === "rapid") {
      const count = level >= 7 ? 3 : level >= 4 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        g.bullets.push({
          x: g.playerX + (i - (count - 1) / 2) * 12,
          y: g.playerY - 29,
          vx: count === 3 ? (i - 1) * 0.035 : 0,
          vy: -0.8,
          pierce: 0,
        });
      }
    } else {
      const count = Math.min(4, 1 + Math.floor((level - 1) / 2));
      for (let i = 0; i < count; i += 1) {
        g.bullets.push({
          x: g.playerX + (i - (count - 1) / 2) * 13,
          y: g.playerY - 29,
          vx: 0,
          vy: -0.74,
          pierce: level >= 6 ? 1 : 0,
        });
      }
    }
    sound("shot");
    g.lastShot = now;
  }

  function startNewRun() {
    initAudio();
    tone(240, 0.09, "triangle", 0.04, 200);
    fitForPlay();
    cancelAnimationFrame(raf);
    g = {
      playerX: W / 2,
      playerY: H - 65,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      pickups: [],
      particles: [],
      rings: [],
      score: 0,
      stage: 1,
      stageScore: 0,
      stageStartScore: 0,
      stageKills: 0,
      totalKills: 0,
      stageBossKills: 0,
      hp: 3,
      weapon: "pulse",
      weaponLevels: { pulse: 1, spread: 0, rapid: 0 },
      shield: 0,
      last: performance.now(),
      lastShot: 0,
      lastBossShot: 0,
      spawnTimer: 0,
      invincible: 0,
      miniBossCount: 0,
      nextMiniScore: BASE_MINI_GATES[0],
      finalBossSpawned: false,
      finalBossDefeated: false,
      stageCleared: false,
      uiTick: 0,
      shake: 0,
      flash: 0,
      flashColor: "#fff",
    };
    beginStage(true);
  }

  function beginStage(first = false) {
    const gates = stageGates();
    g.bullets = [];
    g.enemyBullets = [];
    g.enemies = [];
    g.pickups = [];
    g.particles = [];
    g.rings = [];
    g.stageScore = 0;
    g.stageStartScore = g.score;
    g.stageKills = 0;
    g.stageBossKills = 0;
    g.miniBossCount = 0;
    g.nextMiniScore = gates.mini[0];
    g.finalBossSpawned = false;
    g.finalBossDefeated = false;
    g.stageCleared = false;
    g.last = performance.now();
    g.lastShot = 0;
    g.lastBossShot = 0;
    g.spawnTimer = 0;
    g.invincible = first ? 550 : 900;
    g.playerX = W / 2;
    g.playerY = H - 65;
    ui.summary.classList.add("hidden");
    ui.summary.innerHTML = "";
    ui.overlay.classList.add("hidden");
    updateHud();
    playMusic("run", true);
    notify(`LEVEL ${g.stage} · ${stageProfile().name}`, true);
    raf = requestAnimationFrame(loop);
  }

  function nextStage() {
    initAudio();
    tone(320, 0.1, "triangle", 0.045, 240);
    g.stage += 1;
    g.hp = Math.min(3, g.hp + 1);
    beginStage(false);
  }

  function collectPickup(p) {
    if (p.kind === "shield") {
      g.shield = Math.min(2, g.shield + 1);
      notify(g.shield > 1 ? "SHIELD CHARGED · ×2" : "SHIELD ONLINE");
    } else {
      const weapon = p.kind === "power" ? "pulse" : p.kind;
      const oldLevel = g.weaponLevels[weapon] || 0;
      const nextLevel = Math.min(7, Math.max(1, oldLevel + 1));
      g.weaponLevels[weapon] = nextLevel;
      g.weapon = weapon;
      notify(oldLevel === 0 ? `${weapon.toUpperCase()} UNLOCKED · LV1` : nextLevel > oldLevel ? `${weapon.toUpperCase()} UPGRADED · LV${nextLevel}` : `${weapon.toUpperCase()} MAX LEVEL`);
    }
    p.y = H + 99;
    award(50);
    burst(g.playerX, g.playerY, colors[p.kind], 14, true);
    sound("pickup");
    updateHud();
  }

  function finishStage() {
    stopMusic();
    saveBest();
    g.stageCleared = true;
    ui.overlay.classList.remove("hidden");
    ui.eyebrow.textContent = `LEVEL ${g.stage} COMPLETE · ${stageProfile().name}`;
    ui.title.innerHTML = "SECTOR<br>CLEARED.";
    ui.message.textContent = `Next: Level ${g.stage + 1}. One life will be repaired; all weapon levels carry forward.`;
    ui.summary.innerHTML = `
      <div><small>KILLS</small><strong><em>${g.stageKills}</em></strong></div>
      <div><small>BOSSES</small><strong><em>${g.stageBossKills}/4</em></strong></div>
      <div><small>LEVEL SCORE</small><strong>+${pad(g.score - g.stageStartScore)}</strong></div>
      <div><small>TOTAL SCORE</small><strong>${pad(g.score)}</strong></div>
      <div><small>PULSE</small><strong>L${g.weaponLevels.pulse}</strong></div>
      <div><small>SPREAD / RAPID</small><strong>L${g.weaponLevels.spread} / L${g.weaponLevels.rapid}</strong></div>
    `;
    ui.summary.classList.remove("hidden");
    ui.start.textContent = `NEXT LEVEL ${g.stage + 1} →`;
  }

  function finishRun() {
    stopMusic();
    saveBest();
    g.stageCleared = false;
    ui.overlay.classList.remove("hidden");
    ui.eyebrow.textContent = `RUN ENDED · LEVEL ${g.stage}`;
    ui.title.innerHTML = `SCORE ${g.score}<br>TRY AGAIN?`;
    ui.message.textContent = `Reached Level ${g.stage}. Weapon upgrades reset on a new run; your best score stays on this device.`;
    ui.summary.innerHTML = `
      <div><small>LEVEL REACHED</small><strong><em>${g.stage}</em></strong></div>
      <div><small>TOTAL KILLS</small><strong>${g.totalKills}</strong></div>
      <div><small>RUN SCORE</small><strong>${pad(g.score)}</strong></div>
      <div><small>BEST</small><strong>${pad(best)}</strong></div>
    `;
    ui.summary.classList.remove("hidden");
    ui.start.textContent = "RUN AGAIN →";
  }

  function loop(now) {
    const dt = Math.min(70, now - g.last);
    g.last = now;
    g.shake = Math.max(0, g.shake - dt * 0.035);
    g.flash = Math.max(0, g.flash - dt);
    if (keys.left) g.playerX -= dt * 0.38;
    if (keys.right) g.playerX += dt * 0.38;
    if (keys.up) g.playerY -= dt * 0.34;
    if (keys.down) g.playerY += dt * 0.34;
    if (dragging) {
      const follow = Math.min(1, dt * 0.018);
      g.playerX += (pointerX - g.playerX) * follow;
      g.playerY += (pointerY - g.playerY) * follow;
    }
    g.playerX = Math.max(28, Math.min(W - 28, g.playerX));
    g.playerY = Math.max(H * 0.48, Math.min(H - 42, g.playerY));
    if (g.invincible > 0) g.invincible -= dt;

    firePlayer(now);

    const progress = segmentProgress();
    const profile = stageProfile();
    const diff = stageDifficulty();
    const gates = stageGates();
    const bossActive = g.enemies.some((e) => (e.kind === "miniBoss" || e.kind === "finalBoss") && e.hp > 0);
    const spawnEvery = Math.max(225, 850 - progress * 520 - diff * 44 - profile.spawnBoost);
    g.spawnTimer += dt;
    if (g.spawnTimer > spawnEvery && !bossActive && !g.finalBossSpawned) {
      spawnEnemy(now);
      const extraChance = Math.min(0.82, (progress > 0.64 ? (progress - 0.64) * 1.7 : 0) + diff * 0.05 + profile.swarm);
      if (Math.random() < extraChance) spawnEnemy(now);
      if (diff >= 4 && progress > 0.74 && Math.random() < Math.min(0.38, diff * 0.035)) spawnEnemy(now);
      g.spawnTimer = 0;
    }

    if (g.miniBossCount < 3 && g.stageScore >= g.nextMiniScore && !bossActive) {
      const n = g.miniBossCount + 1;
      const hp = Math.ceil(MINI_HP[n - 1] * bossHpScale());
      g.enemies.push({ x: W / 2, y: -70, r: 58, hp, maxHp: hp, speed: 0.035, kind: "miniBoss", phase: n });
      g.nextMiniScore = Infinity;
      notify(`LEVEL ${g.stage} · MINI BOSS ${n}/3 INBOUND`);
      sound("boss");
    }

    if (g.miniBossCount >= 3 && g.stageScore >= gates.final && !g.finalBossSpawned && !bossActive) {
      const hp = Math.ceil(290 * bossHpScale());
      g.finalBossSpawned = true;
      g.enemyBullets = [];
      g.enemies = [];
      g.enemies.push({ x: W / 2, y: -95, r: 82, hp, maxHp: hp, speed: 0.045, kind: "finalBoss", phase: 0 });
      notify(`LEVEL ${g.stage} · FINAL BOSS · CORE FORTRESS`, true);
      sound("boss");
    }

    g.bullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    g.bullets = g.bullets.filter((b) => !b.dead && b.y > -30 && b.x > -30 && b.x < W + 30);
    g.enemyBullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    g.enemyBullets = g.enemyBullets.filter((b) => b.y < H + 30 && b.x > -30 && b.x < W + 30);

    g.enemies.forEach((e) => {
      if (e.kind === "finalBoss") {
        e.y = Math.min(112, e.y + e.speed * dt);
        e.x = W / 2;
      } else {
        e.y += e.speed * dt;
        if (e.kind === "miniBoss") e.x = W / 2 + Math.sin(now / 650 + e.phase) * W * 0.27;
        else if (e.kind === "zigzag") e.x = Math.max(e.r, Math.min(W - e.r, e.x + Math.sin(now / 180 + e.phase) * dt * 0.16));
      }
    });

    const bulletSpeedScale = 1 + Math.min(0.14, diff * 0.02);
    const gruntInterval = Math.max(500, 1550 - progress * 720 - diff * 62 - profile.shotBoost);
    for (const e of g.enemies) {
      if (e.kind === "grunt" && e.y > 35 && e.y < H * 0.58 && now - e.lastShot > gruntInterval) {
        g.enemyBullets.push({ x: e.x, y: e.y + e.r, vx: 0, vy: 0.17 * bulletSpeedScale, owner: "grunt" });
        if (progress > 0.58 || g.stage >= 2) {
          g.enemyBullets.push({ x: e.x, y: e.y + e.r, vx: (g.playerX - e.x) / 1800, vy: 0.17 * bulletSpeedScale, owner: "grunt" });
        }
        if (g.stage >= 5 && progress > 0.76 && Math.random() < 0.45) {
          g.enemyBullets.push({ x: e.x, y: e.y + e.r, vx: (g.playerX - e.x) / 1500 + (Math.random() - 0.5) * 0.08, vy: 0.17 * bulletSpeedScale, owner: "grunt" });
        }
        e.lastShot = now + Math.random() * 220;
      }
    }

    const mini = g.enemies.find((e) => e.kind === "miniBoss" && e.hp > 0);
    const miniInterval = Math.max(450, 720 - diff * 20);
    if (mini && mini.y > 70 && now - g.lastBossShot > miniInterval) {
      const lanes = g.stage >= 4 ? [-0.3, -0.15, 0, 0.15, 0.3] : [-0.24, 0, 0.24];
      lanes.forEach((vx) => g.enemyBullets.push({ x: mini.x, y: mini.y + mini.r, vx, vy: 0.3 * bulletSpeedScale, owner: "miniBoss" }));
      g.lastBossShot = now;
    }

    const final = g.enemies.find((e) => e.kind === "finalBoss" && e.hp > 0);
    const finalInterval = Math.max(390, 620 - diff * 22);
    if (final && final.y >= 110 && now - g.lastBossShot > finalInterval) {
      const aim = (g.playerX - final.x) / 520;
      const lanes = g.stage >= 3 ? [-0.4, -0.27, -0.13, 0, 0.13, 0.27, 0.4] : [-0.34, -0.17, 0, 0.17, 0.34];
      lanes.forEach((vx) => g.enemyBullets.push({ x: final.x, y: final.y + final.r * 0.65, vx: vx + aim * 0.25, vy: 0.31 * bulletSpeedScale, owner: "finalBoss" }));
      g.lastBossShot = now;
    }

    g.pickups.forEach((p) => {
      p.y += p.speed * dt;
    });
    g.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    g.particles = g.particles.filter((p) => p.life > 0);
    g.rings.forEach((r) => {
      r.r += dt * 0.09;
      r.life -= dt;
    });
    g.rings = g.rings.filter((r) => r.life > 0);

    for (const b of g.bullets) {
      if (b.dead) continue;
      for (const e of g.enemies) {
        if (e.hp <= 0 || Math.hypot(b.x - e.x, b.y - e.y) >= e.r + 4) continue;
        e.hp -= 1;
        if (b.pierce > 0) b.pierce -= 1;
        else b.dead = true;
        const hitColor = e.kind === "finalBoss" ? "#ffd85d" : e.kind === "zigzag" ? "#65e7ff" : "#ff6578";
        burst(b.x, b.y, hitColor, 4);
        sound("hit");
        if (e.hp <= 0) {
          const reward = e.kind === "finalBoss" ? 1400 : e.kind === "miniBoss" ? 480 : e.kind === "tank" ? 90 : e.kind === "zigzag" ? 60 : e.kind === "grunt" ? 45 : 30;
          award(reward);
          g.stageKills += 1;
          g.totalKills += 1;
          const boom = e.kind === "finalBoss" ? "#ffd85d" : e.kind === "miniBoss" ? "#baff00" : "#ff6578";
          burst(e.x, e.y, boom, e.kind === "finalBoss" ? 54 : e.kind === "miniBoss" ? 30 : 10, true);
          g.shake = Math.max(g.shake, e.kind === "finalBoss" ? 11 : e.kind === "miniBoss" ? 6 : 2);
          g.flash = e.kind === "finalBoss" ? 250 : 80;
          g.flashColor = boom;
          if (e.kind === "miniBoss") {
            g.stageBossKills += 1;
            g.miniBossCount += 1;
            g.nextMiniScore = gates.mini[g.miniBossCount] ?? Infinity;
            notify(`MINI BOSS ${g.miniBossCount}/3 DOWN · LEVEL ${g.stage}`);
            sound("bossExplosion");
            sound("clear");
          }
          if (e.kind === "finalBoss") {
            g.stageBossKills += 1;
            g.finalBossDefeated = true;
            notify(`LEVEL ${g.stage} CORE DESTROYED`, true);
            sound("finalBossExplosion");
            sound("clear");
          }
          if (e.kind !== "miniBoss" && e.kind !== "finalBoss" && Math.random() < 0.24) {
            const kinds = ["power", "power", "spread", "rapid", "shield"];
            g.pickups.push({ x: e.x, y: e.y, r: 18, speed: 0.1, kind: kinds[Math.floor(Math.random() * kinds.length)] });
          }
        }
        if (b.dead) break;
      }
    }
    g.bullets = g.bullets.filter((b) => !b.dead && b.y > -30);
    g.enemies = g.enemies.filter((e) => e.hp > 0 && e.y < H + 80);

    const hit = (x, y, r) => Math.hypot(g.playerX - x, g.playerY - y) < r + 18;
    if (g.invincible <= 0) {
      let wasHit = false;
      for (const e of g.enemies) {
        if (hit(e.x, e.y, e.r)) {
          e.hp = 0;
          wasHit = true;
          break;
        }
      }
      if (!wasHit) {
        for (const b of g.enemyBullets) {
          if (hit(b.x, b.y, 7)) {
            b.y = H + 99;
            wasHit = true;
            break;
          }
        }
      }
      if (wasHit) {
        if (g.shield) {
          g.shield -= 1;
          burst(g.playerX, g.playerY, "#a88bff", 18, true);
        } else {
          g.hp -= 1;
          const destroyed = g.hp <= 0;
          burst(g.playerX, g.playerY, destroyed ? "#ffd85d" : "#ff6578", destroyed ? 44 : 18, true);
          sound(destroyed ? "playerExplosion" : "hurt");
        }
        g.shake = g.hp <= 0 ? 13 : 8;
        g.flash = g.hp <= 0 ? 240 : 130;
        g.flashColor = "#ff6578";
        g.invincible = 1050;
      }
    }

    for (const p of g.pickups) {
      if (hit(p.x, p.y, 18)) collectPickup(p);
    }
    g.pickups = g.pickups.filter((p) => p.y < H + 40);
    g.enemyBullets = g.enemyBullets.filter((b) => b.y < H + 40);

    draw(now);
    if (++g.uiTick % 6 === 0) updateHud();
    if (g.hp <= 0) {
      finishRun();
      return;
    }
    if (g.finalBossDefeated) {
      award(800 + g.stage * 150);
      updateHud();
      finishStage();
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function pointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width) * W;
    pointerY = ((e.clientY - rect.top) / rect.height) * H;
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    pointer(e);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragging) pointer(e);
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
  });
  canvas.addEventListener("pointercancel", () => {
    dragging = false;
  });
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = true;
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") keys.up = true;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.down = true;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
  });
  addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = false;
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") keys.up = false;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.down = false;
  });
  ui.start.addEventListener("click", () => {
    if (g?.stageCleared && g.hp > 0) nextStage();
    else startNewRun();
  });
  ui.fullscreen.addEventListener("click", () => toggleFullscreen());
  ui.sound.addEventListener("click", () => {
    sfx = !sfx;
    localStorage.setItem("pepepow-runner-sfx", sfx ? "on" : "off");
    if (sfx) {
      initAudio();
      tone(420, 0.06, "triangle", 0.04, 80);
    }
    refreshSound();
  });
  ui.music.addEventListener("click", () => {
    bgm = !bgm;
    localStorage.setItem("pepepow-runner-bgm", bgm ? "on" : "off");
    refreshMusic();
    if (!bgm) {
      stopMusic(false);
      return;
    }
    if (ui.overlay.classList.contains("hidden")) {
      const bossActive = g?.enemies?.some((e) => (e.kind === "miniBoss" || e.kind === "finalBoss") && e.hp > 0);
      playMusic(bossActive ? "boss" : "run", true);
    }
  });
  document.addEventListener("fullscreenchange", updateFullscreenLabel);
  document.addEventListener("webkitfullscreenchange", updateFullscreenLabel);

  g = {
    playerX: W / 2,
    playerY: H - 65,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    pickups: [],
    particles: [],
    rings: [],
    score: 0,
    stage: 1,
    hp: 3,
    weapon: "pulse",
    weaponLevels: { pulse: 1, spread: 0, rapid: 0 },
    invincible: 0,
    shield: 0,
    shake: 0,
    flash: 0,
    flashColor: "#fff",
  };
  ui.best.textContent = pad(best);
  refreshSound();
  refreshMusic();
  updateHud();
  draw(performance.now());
})();
