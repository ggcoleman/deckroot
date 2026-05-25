import type { Card } from "@/domain/cards/types";
import type { CardCatalog } from "@/domain/cards/card-catalog";
import { canBeCommander, isCommanderLegalInIdentity } from "@/domain/decks/commander-rules";

const byEdhrecRank = (left: Card, right: Card) => (left.edhrecRank ?? Number.MAX_SAFE_INTEGER) - (right.edhrecRank ?? Number.MAX_SAFE_INTEGER);
const canIncludeSeed = (commander: Card, seedCard?: Card) => !seedCard || isCommanderLegalInIdentity(seedCard, commander);

export async function suggestCommanders(input: { ownedCards: Card[]; seedCard?: Card; catalog: CardCatalog }): Promise<Card[]> {
  if (input.seedCard && canBeCommander(input.seedCard)) return [input.seedCard];

  const ownedCommanders = input.ownedCards
    .filter((card) => canBeCommander(card) && canIncludeSeed(card, input.seedCard))
    .sort(byEdhrecRank);

  if (ownedCommanders.length > 0) return ownedCommanders.slice(0, 5);

  const allCards = await input.catalog.allCards();
  const commanders = allCards.filter(canBeCommander);
  const legalCommanders = commanders.filter((commander) => canIncludeSeed(commander, input.seedCard));

  return legalCommanders.sort(byEdhrecRank).slice(0, 5);
}
