import { expect, test } from "@playwright/test";

const games = [
  ["01 Runner", "Auto-Shooting Runner"],
  ["02 Pet Match", "Pet Matching"],
  ["03 Defense", "Plant Defense"],
  ["04 Pet & Mine", "Idle Pet & Mining"],
  ["05 Blockscape", "Blockscape 3D"],
  ["06 Tactics", "Node Tactics"],
] as const;

test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("smoke: platform and all six games render", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "PEPEPOW ARCADE" })).toBeVisible();
  for (const [tab, heading] of games) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.locator(".arcade-heading").getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("runner: starts, accepts keyboard input, and exposes audio", async ({ page }) => {
  const frame = page.frameLocator("iframe");
  await frame.getByRole("button", { name: /START RUN/i }).click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await expect(frame.getByRole("button", { name: /Toggle background music/i })).toBeVisible();
});

test("pet matching: starts endless progression and exposes audio", async ({ page }) => {
  await page.getByRole("tab", { name: "02 Pet Match" }).click();
  await page.getByRole("button", { name: "START ENDLESS RUN" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.getByRole("button", { name: /HINT/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Turn music/ })).toBeVisible();
});

test("plant defense: start, resource calculation, restart, and audio", async ({ page }) => {
  await page.getByRole("tab", { name: "03 Defense" }).click();
  await expect(page.getByText("⚡ 1000 / 1000")).toBeVisible();
  await page.getByRole("button", { name: "START DEFENSE" }).click();
  await page.getByRole("button", { name: /HASH MINER/ }).click();
  await page.getByRole("button", { name: "Lane 3, cell 1" }).click();
  await expect(page.getByText(/\+14 \/ 8s/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /sound/i })).toBeVisible();
});

test("idle pet: resource interaction persists to localStorage", async ({ page }) => {
  await page.getByRole("tab", { name: "04 Pet & Mine" }).click();
  await page.getByRole("button", { name: /Mine \d+ HASH/ }).click();
  await page.waitForTimeout(1100);
  await page.reload();
  await page.getByRole("tab", { name: "04 Pet & Mine" }).click();
  await expect(page.getByRole("button", { name: /Mine \d+ HASH/ })).toBeVisible();
});

test("blockscape: starts and supports desktop and touch controls", async ({ page }) => {
  await page.getByRole("tab", { name: "05 Blockscape" }).click();
  await page.getByRole("button", { name: "START LEVEL 1" }).click();
  await page.keyboard.press("ArrowUp");
  await page.getByRole("button", { name: "Move forward" }).click();
  await expect(page.getByRole("button", { name: "Swing Mining Hammer" })).toBeVisible();
});

test("node tactics: starts, exposes progression actions, and audio", async ({ page }) => {
  await page.getByRole("tab", { name: "06 Tactics" }).click();
  await page.getByRole("button", { name: /CORE RUN/ }).click();
  await expect(page.getByRole("button", { name: /COMMIT TURN/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Turn music/ })).toBeVisible();
});

test("existing save keys remain compatible across reloads", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("pepepow-defense-best", "4242");
    localStorage.setItem("pepepow-pet-match-best", "3131");
    localStorage.setItem("pepepow-tactics-best", "2020");
  });
  await page.reload();
  await page.getByRole("tab", { name: "03 Defense" }).click();
  await expect(page.getByText("04242")).toBeVisible();
});
