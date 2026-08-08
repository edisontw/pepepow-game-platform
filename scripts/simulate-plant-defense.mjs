import {
  FROG_FIRE_TICKS,
  MINER_INCOME_TICKS,
  STARTING_ENERGY,
  TICK_MS,
  getArmorScale,
  getEnemyKind,
  getEnemyMaxHp,
  getEnemyRow,
  getEnemySpeed,
  getEnergyCap,
  getMinerIncome,
  getProjectileDamage,
  getSpawnEvery,
  getWaveTarget,
  isBossWave,
  killBounty,
  unitInfo,
} from "../src/games/plant-defense/balance-model.mjs";

const strategies = [
  { name: "defense-first", miners: 2, frogs: 5, walls: 3 },
  { name: "balanced", miners: 4, frogs: 5, walls: 2 },
  { name: "miner-heavy", miners: 7, frogs: 4, walls: 2 },
];

const RUNS_PER_STRATEGY = 1512;
const MAX_WAVE = 30;

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

function buyUntil(units, energy, type, target, random) {
  while (units.filter((unit) => unit.type === type).length < target && energy >= unitInfo[type].cost) {
    units.push({ type, level: 1, row: Math.floor(random() * 5) });
    energy -= unitInfo[type].cost;
  }
  return energy;
}

function waveDemand(wave) {
  let effectiveHp = 0;
  let meanSpeed = 0;
  const target = getWaveTarget(wave);
  for (let i = 0; i < target; i += 1) {
    const kind = getEnemyKind(wave, i);
    effectiveHp += getEnemyMaxHp(wave, kind) / getArmorScale(kind);
    meanSpeed += getEnemySpeed(wave, kind);
    getEnemyRow(wave, i);
  }
  return { effectiveHp, meanSpeed: meanSpeed / target, target };
}

function runStrategy(strategy, seed) {
  const random = rng(seed);
  const units = [];
  let energy = STARTING_ENERGY;
  let survivalSeconds = 0;
  const resourceCurve = [];

  energy = buyUntil(units, energy, "miner", strategy.miners, random);
  energy = buyUntil(units, energy, "frog", strategy.frogs, random);
  energy = buyUntil(units, energy, "wall", strategy.walls, random);

  for (let wave = 1; wave <= MAX_WAVE; wave += 1) {
    const demand = waveDemand(wave);
    const spawnTicks = 8 + demand.target * getSpawnEvery(wave);
    const travelTicks = Math.max(1, Math.ceil(6.72 / demand.meanSpeed));
    const waveTicks = spawnTicks + travelTicks;
    const miningCycles = Math.floor(waveTicks / MINER_INCOME_TICKS);
    const minerIncome = getMinerIncome(units, wave) * miningCycles;
    energy = Math.min(getEnergyCap(wave), energy + minerIncome);

    const frogs = units.filter((unit) => unit.type === "frog");
    const shotsPerFrog = waveTicks / FROG_FIRE_TICKS;
    const damageCapacity = frogs.reduce((sum, frog) => sum + getProjectileDamage(frog.level) * shotsPerFrog, 0);
    const laneCoverage = new Set(frogs.map((frog) => frog.row)).size / 5;
    const jitter = 0.92 + random() * 0.16;
    const defendedDamage = damageCapacity * laneCoverage * jitter;
    survivalSeconds += waveTicks * TICK_MS / 1000;

    resourceCurve.push({ wave, energy, minerIncome });
    if (defendedDamage < demand.effectiveHp) {
      return { won: false, wave, survivalSeconds, energy, resourceCurve };
    }

    const bounty = Array.from({ length: demand.target }, (_, i) => killBounty(getEnemyKind(wave, i))).reduce((a, b) => a + b, 0);
    energy = Math.min(getEnergyCap(wave), energy + bounty + (isBossWave(wave) ? Math.floor(wave / 5) * 20 : 0));
    energy = buyUntil(units, energy, "frog", Math.min(10, strategy.frogs + Math.floor(wave / 5)), random);
  }
  return { won: true, wave: MAX_WAVE, survivalSeconds, energy, resourceCurve };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const results = strategies.map((strategy, strategyIndex) => {
  const runs = Array.from({ length: RUNS_PER_STRATEGY }, (_, index) => runStrategy(strategy, 100_000 * strategyIndex + index + 1));
  const wins = runs.filter((run) => run.won).length;
  return {
    strategy: strategy.name,
    runs: runs.length,
    winRate: wins / runs.length,
    medianSurvivalSeconds: median(runs.map((run) => run.survivalSeconds)),
    medianFinalEnergy: median(runs.map((run) => run.energy)),
    medianReachedWave: median(runs.map((run) => run.wave)),
  };
});

const best = [...results].sort((a, b) => b.winRate - a.winRate || b.medianReachedWave - a.medianReachedWave)[0];
const sorted = [...results].sort((a, b) => b.winRate - a.winRate);
const dominant = sorted[0].winRate - sorted[1].winRate >= 0.2;

console.log(JSON.stringify({
  source: "src/games/plant-defense/balance-model.mjs",
  totalRuns: RUNS_PER_STRATEGY * strategies.length,
  maxWave: MAX_WAVE,
  results,
  optimalStrategy: best.strategy,
  dominantStrategy: dominant ? best.strategy : null,
}, null, 2));
