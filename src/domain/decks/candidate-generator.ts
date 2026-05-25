import type { Card } from "@/domain/cards/types";
import type { CardCatalog } from "@/domain/cards/card-catalog";
import { isCommanderLegalInIdentity } from "@/domain/decks/commander-rules";
import { suggestCommanders } from "@/domain/decks/commander-suggestions";
import type { EdhrecProvider } from "@/domain/edhrec/edhrec-types";

export type DeckCandidate = {
  id: string;
  commanderName: string;
  commander: Card;
  theme: string;
  score: number;
  ownedCount: number;
  ownedSynergyCount: number;
  missingEstimatedUsd: number;
  targetBracket: number;
  reasons: string[];
  recommendedCards: Card[];
};

type GenerateCommanderCandidatesInput = {
  seedCard?: Card;
  ownedCards: Card[];
  targetBracket: number;
  budgetUsd: number;
  catalog: CardCatalog;
  edhrec: EdhrecProvider;
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const cardPrice = (card: Card) => card.prices.usd ?? 0;
const isCommanderPlayable = (card: Card, commander: Card) => card.legalities.commander === "legal" && isCommanderLegalInIdentity(card, commander);

function inferTheme(commander: Card, recommendedCards: Card[]): string {
  const text = [commander, ...recommendedCards]
    .map((card) => `${card.typeLine} ${card.oracleText}`)
    .join(" ")
    .toLowerCase();

  if (text.includes("faerie") || text.includes("flying")) return "Esper flying tokens";
  if (text.includes("graveyard")) return "graveyard value";
  if (text.includes("artifact")) return "artifact value";
  return "balanced value";
}

export async function generateCommanderCandidates(input: GenerateCommanderCandidatesInput): Promise<DeckCandidate[]> {
  const commanders = await suggestCommanders({ ownedCards: input.ownedCards, seedCard: input.seedCard, catalog: input.catalog });

  const candidates: DeckCandidate[] = [];

  for (const commander of commanders) {
    const legalOwned = input.ownedCards.filter((card) => isCommanderPlayable(card, commander));
    const ownedNames = new Set(legalOwned.map((card) => card.normalizedName));
    const recommendations = await input.edhrec.getCommanderRecommendations({
      commanderName: commander.name,
      seedNames: [input.seedCard?.name, ...input.ownedCards.map((card) => card.name)].filter((name): name is string => Boolean(name)),
    });
    const recommendedCards = recommendations.cards
      .map((recommendation) => recommendation.card)
      .filter((card) => isCommanderPlayable(card, commander));
    const recommendedNames = new Set(recommendedCards.map((card) => card.normalizedName));
    const ownedSynergyCount = legalOwned.filter((card) => card.oracleId !== commander.oracleId && recommendedNames.has(card.normalizedName)).length;
    const missingEstimatedUsd = recommendedCards
      .filter((card) => !ownedNames.has(card.normalizedName))
      .reduce((total, card) => total + cardPrice(card), 0);
    const score = ownedSynergyCount * 12 + legalOwned.length * 3 - Math.max(0, missingEstimatedUsd - input.budgetUsd) * 0.6;
    const reasons = [
      `${ownedSynergyCount} owned synergy cards match EDHREC recommendations.`,
      `${legalOwned.length} owned cards are legal in ${commander.name}'s color identity.`,
    ];

    candidates.push({
      id: slugify(`${commander.name}-${input.targetBracket}`),
      commanderName: commander.name,
      commander,
      theme: inferTheme(commander, recommendedCards),
      score,
      ownedCount: legalOwned.length,
      ownedSynergyCount,
      missingEstimatedUsd,
      targetBracket: input.targetBracket,
      reasons,
      recommendedCards,
    });
  }

  return candidates.sort((left, right) => right.score - left.score || (left.commander.edhrecRank ?? Number.MAX_SAFE_INTEGER) - (right.commander.edhrecRank ?? Number.MAX_SAFE_INTEGER));
}

