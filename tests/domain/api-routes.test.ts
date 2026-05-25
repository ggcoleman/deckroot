import { describe, expect, it } from "vitest";
import { GET as searchCards } from "@/app/api/cards/search/route";
import { POST as importCards } from "@/app/api/import/route";
import { POST as buildDeck } from "@/app/api/deck/build/route";
import { POST as exportDeck } from "@/app/api/export/route";
import { fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("Deckroot Commander API routes", () => {
  it("returns no search cards for short queries", async () => {
    const response = await searchCards(new Request("http://deckroot.test/api/cards/search?q=a"));
    const body = await response.json();

    expect(body).toEqual({ cards: [] });
  });

  it("searches fixture cards for queries with at least two characters", async () => {
    const response = await searchCards(new Request("http://deckroot.test/api/cards/search?q=al"));
    const body = await response.json();

    expect(body.cards.map((card: { name: string }) => card.name)).toContain("Alela, Artful Provocateur");
  });

  it("imports and resolves deck list rows", async () => {
    const response = await importCards(new Request("http://deckroot.test/api/import", {
      method: "POST",
      body: JSON.stringify({ input: "1 Sol Ring\n1 Missing Card" }),
    }));
    const body = await response.json();

    expect(body.parsed.rows).toHaveLength(2);
    expect(body.resolved.cards.map((entry: { card: { name: string } }) => entry.card.name)).toEqual(["Sol Ring"]);
    expect(body.resolved.unresolved.map((row: { name: string }) => row.name)).toEqual(["Missing Card"]);
  });

  it("builds a deck candidate with analysis and a buy list", async () => {
    const response = await buildDeck(new Request("http://deckroot.test/api/deck/build", {
      method: "POST",
      body: JSON.stringify({
        seedCardName: "Bitterblossom",
        ownedCardNames: ["Sol Ring", "Not a Real Card"],
        targetBracket: 3,
        budgetUsd: 40,
      }),
    }));
    const body = await response.json();

    expect(body.candidates.length).toBeGreaterThan(0);
    expect(body.deck.commander.name).toBe(body.candidates[0].commanderName);
    expect(body.analysis.bracket.recommended).toBeGreaterThanOrEqual(2);
    expect(body.buyList.items.length).toBeGreaterThan(0);
  });

  it("exports a deck as text by default", async () => {
    const response = await exportDeck(new Request("http://deckroot.test/api/export", {
      method: "POST",
      body: JSON.stringify({ deck: fixtureDeck() }),
    }));
    const body = await response.json();

    expect(body.content).toContain("Commander\n1 Alela, Artful Provocateur");
  });

  it("exports a deck as CSV when requested", async () => {
    const response = await exportDeck(new Request("http://deckroot.test/api/export", {
      method: "POST",
      body: JSON.stringify({ deck: fixtureDeck(), format: "csv" }),
    }));
    const body = await response.json();

    expect(body.content).toContain("Quantity,Name,Role,Owned Quantity,Estimated USD");
  });
});


