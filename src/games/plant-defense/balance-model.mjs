export const ROWS = 5;
export const COLS = 7;
export const TICK_MS = 250;
export const STARTING_ENERGY = 1000;
export const BASE_ENERGY_CAP = 1000;
export const MINER_INCOME_TICKS = 32;
export const FROG_FIRE_TICKS = 4;
export const PROJECTILE_STEP = 0.72;
export const PROJECTILE_DAMAGE = 42;
export const MINER_SATURATION_STEP = 0.1;
export const MINER_SATURATION_FLOOR = 0.42;

export const unitInfo = {
  miner: { name: "HASH MINER", cost: 65, hp: 95, icon: "⛏", description: "+14 / 8s · soft cap after 4" },
  frog: { name: "POW FROG", cost: 100, hp: 120, icon: "🐸", description: "Auto-fire lane · Lv.3" },
  wall: { name: "CRYSTAL WALL", cost: 75, hp: 360, icon: "◆", description: "High HP barrier · Lv.3" },
};

export const isBossWave = (wave) => wave % 5 === 0;
export const getStage = (wave) => Math.floor((wave - 1) / 5) + 1;
export const getStageWave = (wave) => ((wave - 1) % 5) + 1;

export function getWaveTrait(wave) {
  if (isBossWave(wave)) return { name: "BOSS", detail: "Node Breaker · mining output -30% while active", hp: 1, speed: 1, extra: 0, spawn: 1, miner: 0.7 };
  if (wave === 1) return { name: "OPENING RAID", detail: "6 raiders · center 3 lanes only", hp: 1, speed: 1, extra: 0, spawn: 1, miner: 1 };
  if (wave === 2) return { name: "STANDARD", detail: "All lanes active · standard raiders", hp: 1, speed: 1, extra: 0, spawn: 1, miner: 1 };
  const traits = [
    { name: "OVERCLOCK", detail: "Enemy movement speed +18%", hp: 1, speed: 1.18, extra: 0, spawn: 1, miner: 1 },
    { name: "ARMORED", detail: "Enemy armor +22%", hp: 1.22, speed: 1, extra: 0, spawn: 1, miner: 1 },
    { name: "SWARM", detail: "+4 raiders · two-lane rush", hp: 0.94, speed: 1.06, extra: 4, spawn: 0.78, miner: 1 },
    { name: "BLACKOUT", detail: "Network interference · Hash Miner output -45%", hp: 1.06, speed: 1.04, extra: 1, spawn: 0.94, miner: 0.55 },
  ];
  return traits[(wave - 3) % traits.length];
}

export function getWaveTarget(wave) {
  if (isBossWave(wave)) return 1;
  if (wave === 1) return 6;
  if (wave === 2) return 8;
  const sector = Math.floor((wave - 1) / 5);
  const step = (wave - 1) % 5;
  return 8 + step * 2 + sector * 4 + (step >= 3 ? sector : 0) + getWaveTrait(wave).extra;
}

export const upgradeCost = (type, level) => Math.ceil(unitInfo[type].cost * (0.65 + level * 0.25));
export const levelScale = (level) => 1 + (level - 1) * 0.55;
export const getEnergyCap = (wave) => BASE_ENERGY_CAP + (getStage(wave) - 1) * 100;

export function getMinerIncome(units, wave, { saturationStep = MINER_SATURATION_STEP } = {}) {
  const miners = units.filter((unit) => unit.type === "miner");
  if (!miners.length) return 0;
  const rawYield = miners.reduce((sum, unit) => sum + 14 + (unit.level - 1) * 7, 0);
  const saturation = Math.max(MINER_SATURATION_FLOOR, 1 - Math.max(0, miners.length - 4) * saturationStep);
  const miningDifficulty = Math.max(0.72, 1 - (getStage(wave) - 1) * 0.02);
  return Math.max(1, Math.round(rawYield * saturation * miningDifficulty * getWaveTrait(wave).miner));
}

export function unitInvestedCost(unit) {
  let total = unitInfo[unit.type].cost;
  for (let level = 1; level < unit.level; level += 1) total += upgradeCost(unit.type, level);
  return total;
}

export const killBounty = (kind) => kind === "boss" ? 100 : kind === "shield" ? 12 : kind === "brute" ? 10 : kind === "crusher" ? 9 : kind === "glitch" ? 7 : 6;
export const killScore = (kind) => kind === "boss" ? 3500 : kind === "shield" ? 320 : kind === "brute" ? 280 : kind === "crusher" ? 220 : kind === "glitch" ? 170 : 130;

export function getSpawnEvery(wave) {
  const sector = Math.floor((wave - 1) / 5);
  const step = (wave - 1) % 5;
  if (isBossWave(wave)) return 1;
  if (wave === 1) return 16;
  if (wave === 2) return 14;
  return Math.max(5, Math.round((13 - step * 2 - Math.min(sector, 4)) * getWaveTrait(wave).spawn));
}

export function getEnemyKind(wave, spawned) {
  if (isBossWave(wave)) return "boss";
  if (getStage(wave) >= 2 && spawned % 7 === 4) return "crusher";
  if (getStageWave(wave) >= 4 && spawned % 6 === 1) return "shield";
  if (wave >= 3 && spawned % 5 === 2) return "glitch";
  if (wave >= 2 && spawned % 4 === 3) return "brute";
  return "drone";
}

export function getEnemyMaxHp(wave, kind) {
  const sector = Math.floor((wave - 1) / 5);
  const rawHp = kind === "boss" ? 2050 + sector * 1100 : kind === "shield" ? 265 + wave * 42 : kind === "brute" ? 220 + wave * 40 : kind === "crusher" ? 115 + wave * 27 : kind === "glitch" ? 72 + wave * 21 : 90 + wave * 32;
  return Math.round(rawHp * getWaveTrait(wave).hp * (1 + sector * 0.11));
}

export function getEnemyRow(wave, spawned) {
  const sector = Math.floor((wave - 1) / 5);
  if (isBossWave(wave)) return 2;
  if (wave === 1) return 1 + ((spawned * 2) % 3);
  if (getWaveTrait(wave).name === "SWARM") {
    const swarmLane = (wave + sector) % (ROWS - 1);
    return swarmLane + (spawned % 2);
  }
  return (spawned * 3 + wave + sector) % ROWS;
}

export function getEnemySpeed(wave, kind) {
  const sector = Math.floor((wave - 1) / 5);
  const step = (wave - 1) % 5;
  const baseSpeed = Math.min(0.09, (0.038 + step * 0.0068 + sector * 0.0045) * getWaveTrait(wave).speed);
  if (kind === "boss") return 0.021 + sector * 0.0025;
  if (kind === "shield") return baseSpeed * 0.63;
  if (kind === "brute") return baseSpeed * 0.72;
  if (kind === "crusher") return baseSpeed * 1.12;
  if (kind === "glitch") return baseSpeed * 1.45;
  return baseSpeed;
}

export function getEnemyAttack(wave, kind, blockerType) {
  const sector = Math.floor((wave - 1) / 5);
  const baseAttack = kind === "boss" ? 34 + sector * 3 : kind === "brute" ? 23 : kind === "shield" ? 16 : kind === "crusher" ? (blockerType === "wall" ? 32 : 19) : kind === "glitch" ? 12 : 15;
  return baseAttack * (1 + sector * 0.12);
}

export const getProjectileDamage = (level) => PROJECTILE_DAMAGE * levelScale(level);
export const getArmorScale = (kind) => kind === "boss" ? 0.76 : kind === "shield" ? 0.58 : kind === "brute" ? 0.9 : 1;
