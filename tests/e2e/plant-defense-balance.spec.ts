import { expect, test } from "@playwright/test";
import {
  STARTING_ENERGY,
  getEnemyMaxHp,
  getEnergyCap,
  getMinerIncome,
  getProjectileDamage,
  getWaveTarget,
} from "../../src/games/plant-defense/balance-model.mjs";

test("opening economy keeps the requested 1000 Energy start and cap", () => {
  expect(STARTING_ENERGY).toBe(1000);
  expect(getEnergyCap(1)).toBe(1000);
});

test("miner stacking has diminishing returns after four miners", () => {
  const four = Array.from({ length: 4 }, () => ({ type: "miner", level: 1 }));
  const eight = Array.from({ length: 8 }, () => ({ type: "miner", level: 1 }));
  expect(getMinerIncome(four, 1)).toBe(56);
  expect(getMinerIncome(eight, 1)).toBeLessThan(112);
});

test("enemy and wave scaling grow beyond the opening", () => {
  expect(getWaveTarget(2)).toBeGreaterThan(getWaveTarget(1));
  expect(getEnemyMaxHp(10, "boss")).toBeGreaterThan(getEnemyMaxHp(5, "boss"));
});

test("frog upgrades increase projectile damage", () => {
  expect(getProjectileDamage(2)).toBeGreaterThan(getProjectileDamage(1));
  expect(getProjectileDamage(3)).toBeGreaterThan(getProjectileDamage(2));
});
