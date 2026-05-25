import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";
import { assembleCommanderDeck } from "@/domain/decks/deck-assembler";
import { fixtureCard } from "@/domain/decks/demo-fixtures";
import type { Card } from "@/domain/cards/types";

const basicLandNames = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"];
const monoBlackCommander: Card = {
  ...fixtureCard("Tegwyll, Duke of Splendor"),
  id: "fixture-vilis",
  oracleId: "fixture-oracle-vilis",
  name: "Vilis, Broker of Blood",
  normalizedName: "vilis-broker-of-blood",
  manaCost: "{5}{B}{B}{B}",
  manaValue: 8,
  colorIdentity: ["B"],
  typeLine: "Legendary Creature - Demon",
  oracleText: "Flying. Pay 2 life: Target creature gets -1/-1 until end of turn. Whenever you lose life, draw that many cards.",
};

describe("assembleCommanderDeck", () => {
  it("builds exactly 100 legal cards including commander", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate, ownedCards, budgetUsd: 75, catalog });
    expect(deck.cards).toHaveLength(100);
    expect(deck.cards[0].card.name).toBe("Alela, Artful Provocateur");
    expect(deck.validation.ok).toBe(true);
  });

  it("keeps fixture assembly near the 37-land target", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate, ownedCards, budgetUsd: 75, catalog });
    const landCount = deck.cards.filter((entry) => entry.role.includes("land")).length;
    expect(landCount).toBeGreaterThanOrEqual(34);
    expect(landCount).toBeLessThanOrEqual(40);
  });

  it("does not duplicate non-basic cards", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate, ownedCards, budgetUsd: 75, catalog });
    const seen = new Map<string, number>();
    for (const entry of deck.cards) seen.set(entry.card.name, (seen.get(entry.card.name) ?? 0) + 1);
    const duplicateNonBasics = [...seen.entries()].filter(([name, count]) => count > 1 && !basicLandNames.includes(name));
    expect(duplicateNonBasics).toEqual([]);
  });

  it("backfills mono-color commander decks to 100 cards with legal basics only", async () => {
    const catalog = createFixtureCardCatalog([
      monoBlackCommander,
      fixtureCard("Island"),
      fixtureCard("Plains"),
      fixtureCard("Swamp"),
      fixtureCard("Sol Ring"),
      fixtureCard("Phyrexian Arena"),
    ]);
    const candidate = {
      id: "vilis-2",
      commanderName: monoBlackCommander.name,
      commander: monoBlackCommander,
      theme: "mono-black control",
      score: 0,
      ownedCount: 0,
      ownedSynergyCount: 0,
      missingEstimatedUsd: 0,
      targetBracket: 2,
      reasons: [],
      recommendedCards: [],
    };

    const deck = await assembleCommanderDeck({ candidate, ownedCards: [], budgetUsd: 5, catalog });
    const names = deck.cards.map((entry) => entry.card.name);

    expect(deck.cards).toHaveLength(100);
    expect(deck.validation.ok).toBe(true);
    expect(names).toContain("Swamp");
    expect(names).not.toContain("Island");
    expect(names).not.toContain("Plains");
  });

  it("filters non-Commander-legal owned and recommended cards before assembly", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const bannedOwned = {
      ...fixtureCard("Counterspell"),
      id: "fixture-banned-owned",
      oracleId: "fixture-oracle-banned-owned",
      name: "Banned Owned Spell",
      legalities: { commander: "banned" },
    };
    const bannedRecommended = {
      ...fixtureCard("Phyrexian Arena"),
      id: "fixture-banned-rec",
      oracleId: "fixture-oracle-banned-rec",
      name: "Banned Recommendation",
      legalities: { commander: "banned" },
    };
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard).concat(bannedOwned);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate: { ...candidate, recommendedCards: [bannedRecommended, ...candidate.recommendedCards] }, ownedCards, budgetUsd: 75, catalog });

    expect(deck.cards.map((entry) => entry.card.name)).not.toContain("Banned Owned Spell");
    expect(deck.cards.map((entry) => entry.card.name)).not.toContain("Banned Recommendation");
    expect(deck.validation.ok).toBe(true);
  });
  it("reserves room for lands when many owned legal nonlands are available", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const fillerTemplate = fixtureCard("Favorable Winds");
    const ownedNonlands: Card[] = Array.from({ length: 110 }, (_, index) => ({
      ...fillerTemplate,
      id: `fixture-owned-filler-${index}`,
      oracleId: `fixture-oracle-owned-filler-${index}`,
      name: `Owned Filler ${index}`,
      normalizedName: `owned-filler-${index}`,
      prices: { usd: 0, eur: null, tix: null },
    }));
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard).concat(ownedNonlands);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate, ownedCards, budgetUsd: 75, catalog });
    const landCount = deck.cards.filter((entry) => entry.role.includes("land")).length;
    expect(landCount).toBeGreaterThanOrEqual(34);
    expect(landCount).toBeLessThanOrEqual(40);
    expect(deck.validation.ok).toBe(true);
  });
  it("reserves room for lands when many owned ramp cards are available", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const rampTemplate = fixtureCard("Arcane Signet");
    const ownedRamp: Card[] = Array.from({ length: 110 }, (_, index) => ({
      ...rampTemplate,
      id: `fixture-owned-ramp-${index}`,
      oracleId: `fixture-oracle-owned-ramp-${index}`,
      name: `Owned Ramp ${index}`,
      normalizedName: `owned-ramp-${index}`,
      oracleText: "{T}: Add {U}.",
      prices: { usd: 0, eur: null, tix: null },
      producedMana: ["U"],
    }));
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard).concat(ownedRamp);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate, ownedCards, budgetUsd: 75, catalog });
    const landCount = deck.cards.filter((entry) => entry.role.includes("land")).length;
    expect(landCount).toBeGreaterThanOrEqual(34);
    expect(landCount).toBeLessThanOrEqual(40);
    expect(deck.validation.ok).toBe(true);
  });

  it("reserves room for lands when recommendations are large", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const recommendationTemplate = fixtureCard("Favorable Winds");
    const recommendedCards: Card[] = Array.from({ length: 110 }, (_, index) => ({
      ...recommendationTemplate,
      id: `fixture-recommended-filler-${index}`,
      oracleId: `fixture-oracle-recommended-filler-${index}`,
      name: `Recommended Filler ${index}`,
      normalizedName: `recommended-filler-${index}`,
      prices: { usd: 0, eur: null, tix: null },
    }));
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate: { ...candidate, recommendedCards: [...recommendedCards, ...candidate.recommendedCards] }, ownedCards, budgetUsd: 75, catalog });
    const landCount = deck.cards.filter((entry) => entry.role.includes("land")).length;
    expect(landCount).toBeGreaterThanOrEqual(34);
    expect(landCount).toBeLessThanOrEqual(40);
    expect(deck.validation.ok).toBe(true);
  });
});
