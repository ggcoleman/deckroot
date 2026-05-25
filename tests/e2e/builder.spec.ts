import { expect, test } from "@playwright/test";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("builds a Commander deck from a seed card", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Card or commander").fill("Bitterblossom");
  await page.getByRole("button", { name: "Use Bitterblossom" }).click();

  const deckWorkspace = page.getByLabel("Deck workspace");
  const selectedCommander = deckWorkspace.getByLabel("Selected commander");
  const selectedCommanderHeading = selectedCommander.getByRole("heading");
  await expect(selectedCommanderHeading).toBeVisible({ timeout: 15_000 });
  const commanderName = await selectedCommanderHeading.innerText();
  await expect(selectedCommander.getByRole("img", { name: `${commanderName} card art` })).toBeVisible();
  const deckList = deckWorkspace.getByRole("list", { name: "Deck preview" });
  await expect(deckList.getByRole("listitem")).toHaveCount(100, { timeout: 15_000 });
  const firstDeckArt = deckList.getByRole("img").first();
  await expect(firstDeckArt).toBeVisible();
  const restingArtBox = await firstDeckArt.boundingBox();
  await firstDeckArt.hover();
  await page.waitForTimeout(180);
  const hoveredArtBox = await firstDeckArt.boundingBox();
  expect(restingArtBox?.width).toBeTruthy();
  expect(hoveredArtBox?.width).toBeGreaterThan(restingArtBox?.width ?? 0);
  expect(hoveredArtBox?.width).toBeLessThanOrEqual((restingArtBox?.width ?? 0) * 1.08);
  await expect(page.getByText("100 cards")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Buy first" })).toBeVisible();
  await expect(page.getByText("Card data and prices are powered by Scryfall")).toBeVisible();
  const buyRail = page.getByRole("complementary", { name: "Buy first" });
  await expect(buyRail.getByText("Prices and purchase links are powered by Scryfall")).toBeVisible();

  await page.getByRole("button", { name: "Text" }).click();
  const exportedDeck = page.getByLabel("Exported deck content");
  await expect(exportedDeck).toHaveValue(new RegExp(`Commander[\\s\\S]*1 ${escapeRegExp(commanderName)}`));
  await expect(exportedDeck).toHaveValue(/\nDeck\n/);
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
