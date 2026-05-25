import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { fixtureCard } from "@/domain/decks/demo-fixtures";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";
import type { Card } from "@/domain/cards/types";
import type { EdhrecProvider } from "@/domain/edhrec/edhrec-types";

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
  it("filters owned commander suggestions by seed card color identity", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const unrelatedOwnedCommander: Card = {
      ...fixtureCard("Alela, Artful Provocateur"),
      id: "fixture-unrelated-white-commander",
      oracleId: "fixture-oracle-unrelated-white-commander",
      name: "Unrelated White Commander",
      normalizedName: "unrelated-white-commander",
      manaCost: "{2}{W}",
      manaValue: 3,
      colorIdentity: ["W"],
      typeLine: "Legendary Creature - Human Advisor",
      oracleText: "Vigilance.",
      edhrecRank: 1,
    };
    const candidates = await generateCommanderCandidates({ seedCard: fixtureCard("Bitterblossom"), ownedCards: [unrelatedOwnedCommander], targetBracket: 2, budgetUsd: 80, catalog, edhrec });
    expect(candidates.map((candidate) => candidate.commanderName)).not.toContain("Unrelated White Commander");
    expect(candidates[0].commanderName).toBe("Alela, Artful Provocateur");
  });

  it("ignores non-Commander-legal cards when scoring owned and recommended synergy", async () => {
    const catalog = createFixtureCardCatalog();
    const bannedOwned: Card = {
      ...fixtureCard("Counterspell"),
      id: "fixture-banned-owned-synergy",
      oracleId: "fixture-oracle-banned-owned-synergy",
      name: "Banned Synergy Spell",
      normalizedName: "banned-synergy-spell",
      legalities: { commander: "banned" },
    };
    const bannedRecommendedOwned: Card = { ...bannedOwned };
    const bannedRecommendedMissing: Card = {
      ...fixtureCard("Phyrexian Arena"),
      id: "fixture-banned-missing-rec",
      oracleId: "fixture-oracle-banned-missing-rec",
      name: "Banned Missing Recommendation",
      normalizedName: "banned-missing-recommendation",
      legalities: { commander: "banned" },
      prices: { usd: 123, eur: null, tix: null },
    };
    const edhrec: EdhrecProvider = {
      async getCommanderRecommendations(request) {
        return {
          source: "fixture",
          commanderName: request.commanderName,
          cards: [
            { card: bannedRecommendedOwned, name: bannedRecommendedOwned.name, synergyScore: 100, inclusionRate: null, sourceReason: "Banned owned card should not count." },
            { card: bannedRecommendedMissing, name: bannedRecommendedMissing.name, synergyScore: 90, inclusionRate: null, sourceReason: "Banned missing card should not count." },
          ],
          attributionUrl: "https://edhrec.com/fixture",
        };
      },
    };
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard).concat(bannedOwned);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    expect(candidate.ownedCount).toBe(3);
    expect(candidate.ownedSynergyCount).toBe(0);
    expect(candidate.missingEstimatedUsd).toBe(0);
  });
});
