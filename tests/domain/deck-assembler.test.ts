import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";
import { assembleCommanderDeck } from "@/domain/decks/deck-assembler";
import { fixtureCard } from "@/domain/decks/demo-fixtures";

const basicLandNames = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"];

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
});



