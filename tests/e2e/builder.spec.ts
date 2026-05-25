import { expect, test } from "@playwright/test";

test("builds a Commander deck from a seed card", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Card or commander").fill("Bitterblossom");
  await page.getByRole("button", { name: "Use Bitterblossom" }).click();
  await page.getByRole("button", { name: "Build deck" }).click();

  await expect(page.getByText("Alela, Artful Provocateur")).toBeVisible();
  await expect(page.getByText("100 cards")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Buy first" })).toBeVisible();
});

test("imports owned cards and shows ranked candidates", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Owned cards").fill(`Commander: Alela, Artful Provocateur
1 Sol Ring
1 Arcane Signet
1 Bitterblossom
1 Command Tower`);
  await page.getByRole("button", { name: "Analyze owned list" }).click();

  await expect(page.getByRole("heading", { name: "Ranked builds from owned cards" })).toBeVisible();
  await expect(page.getByText("owned synergy cards")).toBeVisible();
});
