import { describe, expect, it } from "vitest";
import { fixtureCard } from "@/domain/decks/demo-fixtures";
import { canBeCommander, isCommanderLegalInIdentity, validateCommanderDeck } from "@/domain/decks/commander-rules";
import { classifyRole } from "@/domain/decks/role-classifier";

describe("commander rules and roles", () => {
  it("accepts legendary creatures and rejects artifacts as commanders", () => {
    expect(canBeCommander(fixtureCard("Alela, Artful Provocateur"))).toBe(true);
    expect(canBeCommander(fixtureCard("Sol Ring"))).toBe(false);
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

  it("classifies common roles", () => {
    expect(classifyRole(fixtureCard("Sol Ring"))).toContain("ramp");
    expect(classifyRole(fixtureCard("Swords to Plowshares"))).toContain("removal");
    expect(classifyRole(fixtureCard("Phyrexian Arena"))).toContain("draw");
  });
});
