import { expect, test } from "@playwright/test";
import { GameAPI, RewardAPI, WalletAPI } from "../../src/shared";

test("GameAPI exposes an anonymous player mock", async () => {
  await expect(GameAPI.getPlayer()).resolves.toEqual({ id: "local-player", kind: "anonymous" });
});

test("client score submissions are explicitly rejected as untrusted", async () => {
  const result = await GameAPI.submitScore({ game: "plant-defense", score: 999999 });
  expect(result.accepted).toBe(false);
  expect(result.trust).toBe("untrusted-client");
});

test("leaderboard mock returns no trusted scores", async () => {
  await expect(GameAPI.getLeaderboard("runner")).resolves.toEqual([]);
});

test("wallet mock never exposes a real wallet", async () => {
  await expect(WalletAPI.getAddress()).resolves.toBeNull();
  await expect(WalletAPI.getBalance()).resolves.toEqual({ available: false, amount: null, unit: "PEPEW" });
});

test("reward mock never issues a client-side reward", async () => {
  const result = await RewardAPI.claim();
  expect(result.accepted).toBe(false);
});
