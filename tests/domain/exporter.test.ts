import { describe, expect, it } from "vitest";
import { exportDeckAsCsv, exportDeckAsText } from "@/domain/decks/exporter";
import type { AssembledDeck, DeckCardEntry } from "@/domain/decks/deck-assembler";
import { fixtureCard, fixtureDeck } from "@/domain/decks/demo-fixtures";

const deckEntry = (name: string, quantity: number, role: DeckCardEntry["role"]): DeckCardEntry => {
  const card = fixtureCard(name);
  return {
    card,
    quantity,
    ownedQuantity: 0,
    role,
    sourceReason: `${card.name} is included in an exporter test deck.`,
  };
};

describe("deck exporter", () => {
  it("exports commander and main deck sections", () => {
    expect(exportDeckAsText(fixtureDeck())).toContain("Commander\n1 Alela, Artful Provocateur");
  });

  it("uses deck commander and entry quantities for text export", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const deck: AssembledDeck = {
      commander,
      cards: [deckEntry("Island", 3, ["land"]), deckEntry(commander.name, 1, ["payoff"]), deckEntry("Sol Ring", 1, ["ramp"])],
      validation: { ok: true, value: true },
    };

    const exported = exportDeckAsText(deck);

    expect(exported).toContain("Commander\n1 Alela, Artful Provocateur\n\nDeck\n");
    expect(exported).not.toContain("Deck\n1 Alela, Artful Provocateur");
    expect(exported).toContain("3 Island");
    expect(exported).toContain("1 Sol Ring");
  });

  it("exports CSV columns", () => {
    expect(exportDeckAsCsv(fixtureDeck()).split("\n")[0]).toBe("Quantity,Name,Role,Owned Quantity,Estimated USD");
  });
});
