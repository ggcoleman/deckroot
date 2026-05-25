import { describe, expect, it } from "vitest";
import type { Card } from "@/domain/cards/types";
import { fixtureCard } from "@/domain/decks/demo-fixtures";
import { canBeCommander, isCommanderLegalInIdentity, validateCommanderDeck } from "@/domain/decks/commander-rules";
import { classifyRole } from "@/domain/decks/role-classifier";

const copyCard = (card: Card, suffix: string): Card => ({ ...card, id: `${card.id}-${suffix}` });

describe("commander rules and roles", () => {
  it("accepts legendary creatures and rejects artifacts as commanders", () => {
    expect(canBeCommander(fixtureCard("Alela, Artful Provocateur"))).toBe(true);
    expect(canBeCommander(fixtureCard("Sol Ring"))).toBe(false);
  });

  it("does not treat oracle text mentioning nonlegendary creatures as commander eligibility", () => {
    const removalSpell: Card = {
      ...fixtureCard("Swords to Plowshares"),
      id: "fixture-de-command",
      oracleId: "fixture-oracle-de-command",
      name: "De-Command",
      normalizedName: "de-command",
      typeLine: "Instant",
      oracleText: "Destroy target nonlegendary creature.",
    };

    expect(canBeCommander(removalSpell)).toBe(false);
  });

  it("rejects cards outside commander color identity", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const redCard = { ...fixtureCard("Swords to Plowshares"), id: "bolt", name: "Lightning Bolt", colorIdentity: ["R" as const] };
    expect(isCommanderLegalInIdentity(redCard, commander)).toBe(false);
  });

  it("rejects duplicate non-basic cards", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const result = validateCommanderDeck({ commander, cards: [commander, fixtureCard("Sol Ring"), fixtureCard("Sol Ring")] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Duplicate non-basic card: Sol Ring");
  });

  it("rejects 100-card lists that do not include the commander", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const cards = Array.from({ length: 100 }, (_, index) => copyCard(fixtureCard("Island"), String(index)));

    const result = validateCommanderDeck({ commander, cards });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("must include commander");
  });

  it("allows duplicate snow-covered basic lands", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const snowIsland: Card = {
      ...fixtureCard("Island"),
      id: "fixture-snow-covered-island",
      oracleId: "fixture-oracle-snow-covered-island",
      name: "Snow-Covered Island",
      normalizedName: "snow-covered-island",
      typeLine: "Basic Snow Land - Island",
    };
    const cards = [
      commander,
      snowIsland,
      { ...snowIsland, id: "fixture-snow-covered-island-2" },
      ...Array.from({ length: 97 }, (_, index) => copyCard(fixtureCard("Island"), String(index))),
    ];

    const result = validateCommanderDeck({ commander, cards });

    expect(result.ok).toBe(true);
  });

  it("classifies common roles", () => {
    expect(classifyRole(fixtureCard("Sol Ring"))).toContain("ramp");
    expect(classifyRole(fixtureCard("Swords to Plowshares"))).toContain("removal");
    expect(classifyRole(fixtureCard("Phyrexian Arena"))).toContain("draw");
  });

  it("does not classify removal as land just because oracle text mentions a land", () => {
    const roles = classifyRole(fixtureCard("Path to Exile"));

    expect(roles).toContain("removal");
    expect(roles).not.toContain("land");
  });
});
