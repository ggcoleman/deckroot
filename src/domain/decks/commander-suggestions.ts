import type { Card } from "@/domain/cards/types";
import type { CardCatalog } from "@/domain/cards/card-catalog";
import { canBeCommander, isCommanderLegalInIdentity } from "@/domain/decks/commander-rules";

const byEdhrecRank = (left: Card, right: Card) => (left.edhrecRank ?? Number.MAX_SAFE_INTEGER) - (right.edhrecRank ?? Number.MAX_SAFE_INTEGER);

export async function suggestCommanders(input: { ownedCards: Card[]; seedCard?: Card; catalog: CardCatalog }): Promise<Card[]> {
  const ownedCommanders = input.ownedCards
    .filter(canBeCommander)
    .sort(byEdhrecRank);

  if (ownedCommanders.length > 0) return ownedCommanders.slice(0, 5);

  const allCards = await input.catalog.allCards();
  const commanders = allCards.filter(canBeCommander);
  const legalCommanders = input.seedCard
    ? commanders.filter((commander) => isCommanderLegalInIdentity(input.seedCard as Card, commander))
    : commanders;

  return legalCommanders.sort(byEdhrecRank).slice(0, 5);
}
