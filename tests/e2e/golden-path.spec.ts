import { test, expect } from "@playwright/test";

// Mirrors the mandatory demo journey (spec section 45/87):
// Signup -> +1 Coin -> OK -> Navbar 1 Coin -> Packages -> Gold OMR 5 ->
// Consumer Name + Mobile -> Subscribe -> ACTIVE -> +2 Coins -> Navbar 3 Coins
// -> VIP progress reflects the new balance -> Spin & Win locks after use.

test("full ATHARX demo journey: signup, reward, subscribe, spin", async ({ page }) => {
  const unique = Date.now();
  const mobile = `+9689${String(1000000 + (unique % 8999999)).padStart(7, "0")}`;
  const email = `e2e.${unique}@example.com`;
  const dialog = page.getByRole("dialog");
  const primaryNav = page.getByRole("navigation", { name: "Primary" });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ATHARX", exact: true })).toBeVisible();

  // --- Signup ---
  await page.getByRole("button", { name: "Create Account" }).first().click();
  await page.locator("#fullName").fill("Ahmed");
  await page.locator("#mobile").fill(mobile);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("Demo@123");
  await page.locator("#confirmPassword").fill("Demo@123");
  await page.getByRole("button", { name: "Create Account" }).last().click();

  // --- Reward modal: Congratulations! +1 Coin ---
  await expect(dialog.getByText("Congratulations!")).toBeVisible();
  await expect(dialog.getByText("+1 Coin", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "OK" }).click();

  // --- Navbar now shows 1 Coin ---
  await expect(page.getByText("1 Coin", { exact: true })).toBeVisible();

  // --- Browse Omantel Prepaid Packages ---
  await primaryNav.getByRole("link", { name: "Prepaid Packages" }).click();
  await page.waitForURL("**/packages");
  await expect(page.getByRole("heading", { name: "Gold", exact: true })).toBeVisible();

  const goldCard = page
    .locator("div.group", { has: page.getByRole("heading", { name: "Gold", exact: true }) })
    .first();
  await goldCard.getByRole("button", { name: "Subscribe" }).click();

  // --- Subscribe form: prefilled name/mobile, package details read-only ---
  await expect(dialog.getByText("Subscribe to Gold")).toBeVisible();
  await expect(page.locator("#consumerName")).toHaveValue("Ahmed");
  await dialog.getByRole("button", { name: "Subscribe Now" }).click();

  // --- Subscription success ---
  await expect(dialog.getByText("Subscription Successful")).toBeVisible();
  await expect(dialog.getByText(/ATH-SUB-/)).toBeVisible();
  await expect(dialog.getByText("ACTIVE")).toBeVisible();
  await expect(dialog.getByText("+2 Coins")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();

  // --- Navbar balance = 3 Coins ---
  await expect(page.getByText("3 Coins", { exact: true })).toBeVisible();

  // --- VIP progress reflects 3 / 65 ---
  await primaryNav.getByRole("link", { name: "Rewards", exact: true }).click();
  await expect(page.getByText("3 / 65 Coins")).toBeVisible();

  // --- Spin & Win: spin once, then it locks with a countdown ---
  // The reward is a server-determined amount from a fixed prize table
  // (1/2/3/5/10 Coins) matching whichever wheel segment it lands on, so the
  // exact amount isn't asserted here — only that it's a valid prize and the
  // navbar balance increases by exactly that much.
  await primaryNav.getByRole("link", { name: "Spin & Win" }).click();
  await page.getByRole("button", { name: "SPIN" }).click();
  await expect(dialog.getByText("Congratulations!")).toBeVisible({ timeout: 8000 });
  const spinRewardText = await dialog.getByText(/🪙 \+\d+ Coins?/).first().textContent();
  const spinReward = Number(spinRewardText?.match(/\d+/)?.[0]);
  expect([1, 2, 3, 5, 10]).toContain(spinReward);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText(`${3 + spinReward} Coins`, { exact: true })).toBeVisible();
  await expect(page.getByText("Spin Locked")).toBeVisible();
});
