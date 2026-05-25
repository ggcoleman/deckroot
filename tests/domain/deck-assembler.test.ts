import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";
import { assembleCommanderDeck } from "@/domain/decks/deck-assembler";
import { fixtureCard } from "@/domain/decks/demo-fixtures";

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
});
