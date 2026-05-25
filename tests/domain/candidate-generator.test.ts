import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { fixtureCard } from "@/domain/decks/demo-fixtures";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";

describe("generateCommanderCandidates", () => {
  it("ranks coherent owned synergy above raw pile size", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const owned = ["Alela, Artful Provocateur", "Sol Ring", "Arcane Signet", "Command Tower", "Bitterblossom", "Counterspell"].map(fixtureCard);
    const candidates = await generateCommanderCandidates({ ownedCards: owned, targetBracket: 2, budgetUsd: 60, catalog, edhrec });
    expect(candidates[0].commanderName).toBe("Alela, Artful Provocateur");
    expect(candidates[0].ownedSynergyCount).toBeGreaterThanOrEqual(4);
    expect(candidates[0].reasons.join(" ")).toContain("owned synergy cards");
  });

  it("suggests a commander for a non-commander seed card", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const candidates = await generateCommanderCandidates({ seedCard: fixtureCard("Bitterblossom"), ownedCards: [], targetBracket: 2, budgetUsd: 80, catalog, edhrec });
    expect(candidates[0].commanderName).toBe("Alela, Artful Provocateur");
  });
});
