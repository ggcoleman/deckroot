import { describe, expect, it, vi } from "vitest";
import { createFixtureCardCatalog, normalize } from "@/domain/cards/card-catalog";
import { createHybridCardCatalog, createScryfallCardCatalog } from "@/domain/cards/scryfall-catalog";
import type { Card } from "@/domain/cards/types";
import { fixtureCard } from "@/domain/decks/demo-fixtures";

const testCard = (name: string, overrides: Partial<Card> = {}): Card => ({
  ...fixtureCard("Sol Ring"),
  id: `test-${normalize(name)}`,
  oracleId: `test-oracle-${normalize(name)}`,
  name,
  normalizedName: normalize(name),
  ...overrides,
});

describe("Scryfall-backed card catalog", () => {
  it("prefers live named lookup over fixture fallback cards so images and prices stay current", async () => {
    const liveSolRing = testCard("Sol Ring", {
      oracleId: "live-oracle-sol-ring",
      imageUrl: "https://cards.scryfall.io/normal/front/live-sol-ring.jpg",
      prices: { usd: 2, eur: null, tix: null },
    });
    const named = vi.fn(async () => liveSolRing);
    const catalog = createScryfallCardCatalog({
      client: { named, search: vi.fn() },
      fallbackCards: [fixtureCard("Sol Ring")],
    });

    await expect(catalog.findByName("Sol Ring")).resolves.toMatchObject({
      name: "Sol Ring",
      oracleId: "live-oracle-sol-ring",
      imageUrl: "https://cards.scryfall.io/normal/front/live-sol-ring.jpg",
      prices: { usd: 2, eur: null, tix: null },
    });
    expect(named).toHaveBeenCalledWith("Sol Ring");
  });

  it("keeps request extras before live lookup and uses fixture fallback only after live misses", async () => {
    const extra = testCard("Live Seed", { oracleId: "extra-oracle-live-seed" });
    const named = vi.fn(async (name: string) => name === "Live Tutor" ? testCard(name) : null);
    const catalog = createScryfallCardCatalog({
      client: { named, search: vi.fn() },
      fallbackCards: [fixtureCard("Sol Ring")],
      extraCards: [extra],
    });

    await expect(catalog.findByName("Live Seed")).resolves.toMatchObject({ oracleId: "extra-oracle-live-seed" });
    await expect(catalog.findByName("Live Tutor")).resolves.toMatchObject({ name: "Live Tutor" });
    await expect(catalog.findByName("Sol Ring")).resolves.toMatchObject({ name: "Sol Ring" });
    expect(named).toHaveBeenCalledTimes(2);
  });

  it("merges live search results with fallback cards without duplicates", async () => {
    const solRing = fixtureCard("Sol Ring");
    const liveOnly = testCard("Live Tutor");
    const catalog = createScryfallCardCatalog({
      client: {
        named: vi.fn(),
        search: vi.fn(async () => [testCard("Sol Ring", { oracleId: solRing.oracleId }), liveOnly]),
      },
      fallbackCards: [solRing],
    });

    const results = await catalog.search("sol");

    expect(results.map((card) => card.name)).toEqual(["Sol Ring", "Live Tutor"]);
  });
});

describe("hybrid card catalog", () => {
  it("uses a bounded allCards pool of primary cards, fallback cards, and request extras", async () => {
    const primaryCard = testCard("Live Seed");
    const extraCard = testCard("Recommended Live Card");
    const hybrid = createHybridCardCatalog({
      primary: createFixtureCardCatalog([primaryCard]),
      fallbackCards: [fixtureCard("Command Tower")],
      extraCards: [extraCard],
    });

    await expect(hybrid.allCards()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Live Seed" }),
      expect.objectContaining({ name: "Command Tower" }),
      expect.objectContaining({ name: "Recommended Live Card" }),
    ]));
  });

  it("keeps request extras ahead of fixture duplicates in the bounded pool", async () => {
    const liveSolRing = testCard("Sol Ring", { oracleId: "live-oracle-sol-ring" });
    const hybrid = createHybridCardCatalog({
      primary: createFixtureCardCatalog([fixtureCard("Sol Ring")]),
      extraCards: [liveSolRing],
    });

    const solRings = (await hybrid.allCards()).filter((card) => normalize(card.name) === "sol ring");

    expect(solRings).toHaveLength(1);
    expect(solRings[0].oracleId).toBe("live-oracle-sol-ring");
  });

  it("deduplicates bounded pools by oracle id first and normalized name second", async () => {
    const preferredExtra = testCard("Live Seed", { oracleId: "preferred-oracle" });
    const duplicateOracle = testCard("Live Seed Showcase", { oracleId: "preferred-oracle" });
    const duplicateName = testCard("LIVE SEED", { oracleId: "different-oracle" });
    const hybrid = createHybridCardCatalog({
      primary: createFixtureCardCatalog([duplicateOracle]),
      fallbackCards: [duplicateName],
      extraCards: [preferredExtra],
    });

    const cards = await hybrid.allCards();

    expect(cards.map((card) => card.name)).toEqual(["Live Seed"]);
  });
});
