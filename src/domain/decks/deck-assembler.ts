import type { Card } from "@/domain/cards/types";
import type { CardCatalog } from "@/domain/cards/card-catalog";
import { allowsMultipleCopies, isCommanderLegalInIdentity, validateCommanderDeck } from "@/domain/decks/commander-rules";
import type { DeckCandidate } from "@/domain/decks/candidate-generator";
import { classifyRole, type DeckRole } from "@/domain/decks/role-classifier";

export type DeckCardEntry = {
  card: Card;
  quantity: number;
  ownedQuantity: number;
  role: DeckRole[];
  sourceReason: string;
};

export type AssembledDeck = {
  commander: Card;
  cards: DeckCardEntry[];
  validation: ReturnType<typeof validateCommanderDeck>;
};

type AssembleCommanderDeckInput = {
  candidate: DeckCandidate;
  ownedCards: Card[];
  budgetUsd: number;
  catalog: CardCatalog;
};

const roleTargets: Array<{ role: DeckRole; target: number }> = [
  { role: "ramp", target: 10 },
  { role: "draw", target: 10 },
  { role: "removal", target: 8 },
  { role: "wipe", target: 2 },
];

const cardPrice = (card: Card) => card.prices.usd ?? 0;
const isLand = (card: Card) => classifyRole(card).includes("land");
const byRankThenPrice = (left: Card, right: Card) => (left.edhrecRank ?? Number.MAX_SAFE_INTEGER) - (right.edhrecRank ?? Number.MAX_SAFE_INTEGER) || cardPrice(left) - cardPrice(right);

function entryFor(card: Card, ownedCards: Card[], sourceReason: string): DeckCardEntry {
  return {
    card,
    quantity: 1,
    ownedQuantity: ownedCards.some((ownedCard) => ownedCard.oracleId === card.oracleId) ? 1 : 0,
    role: classifyRole(card),
    sourceReason,
  };
}

function countRole(cards: DeckCardEntry[], role: DeckRole): number {
  return cards.filter((entry) => entry.role.includes(role)).length;
}

function createAdder(cards: DeckCardEntry[], ownedCards: Card[], budget: { spent: number; limit: number }) {
  const singletonNames = new Set(cards.filter((entry) => !allowsMultipleCopies(entry.card)).map((entry) => entry.card.oracleId));

  return (card: Card, sourceReason: string, options: { ignoreBudget?: boolean } = {}) => {
    if (cards.length >= 100) return false;
    if (!allowsMultipleCopies(card) && singletonNames.has(card.oracleId)) return false;
    const isOwned = ownedCards.some((ownedCard) => ownedCard.oracleId === card.oracleId);
    const price = isOwned ? 0 : cardPrice(card);
    if (!options.ignoreBudget && budget.spent + price > budget.limit) return false;

    cards.push(entryFor(card, ownedCards, sourceReason));
    if (!allowsMultipleCopies(card)) singletonNames.add(card.oracleId);
    budget.spent += price;
    return true;
  };
}

export async function assembleCommanderDeck(input: AssembleCommanderDeckInput): Promise<AssembledDeck> {
  const commander = input.candidate.commander;
  const allLegalCards = (await input.catalog.allCards()).filter((card) => isCommanderLegalInIdentity(card, commander));
  const ownedLegalCards = input.ownedCards.filter((card) => card.oracleId !== commander.oracleId && isCommanderLegalInIdentity(card, commander));
  const cards: DeckCardEntry[] = [entryFor(commander, input.ownedCards, `${commander.name} is the selected commander.`)];
  const budget = { spent: 0, limit: input.budgetUsd };
  const addCard = createAdder(cards, input.ownedCards, budget);

  for (const card of ownedLegalCards) addCard(card, `${card.name} is already owned and legal in ${commander.name}'s color identity.`, { ignoreBudget: true });

  for (const card of input.candidate.recommendedCards.filter((card) => isCommanderLegalInIdentity(card, commander)).sort(byRankThenPrice)) {
    addCard(card, `${card.name} is recommended for ${commander.name}.`);
  }

  const nonLandCards = allLegalCards.filter((card) => card.oracleId !== commander.oracleId && !isLand(card)).sort(byRankThenPrice);
  for (const { role, target } of roleTargets) {
    for (const card of nonLandCards.filter((card) => classifyRole(card).includes(role))) {
      if (countRole(cards, role) >= target) break;
      addCard(card, `${card.name} fills the ${role} package for ${commander.name}.`);
    }
  }

  const lands = allLegalCards.filter(isLand).sort((left, right) => Number(allowsMultipleCopies(left)) - Number(allowsMultipleCopies(right)) || byRankThenPrice(left, right));
  for (const land of lands) {
    if (countRole(cards, "land") >= 37) break;
    addCard(land, `${land.name} supports ${commander.name}'s mana base.`);
  }

  const basics = lands.filter(allowsMultipleCopies);
  let nextBasic = 0;
  while (countRole(cards, "land") < 37 && basics.length > 0) {
    addCard(basics[nextBasic], `${basics[nextBasic].name} fills out the legal basic land base.`, { ignoreBudget: true });
    nextBasic = (nextBasic + 1) % basics.length;
  }

  const utilityCards = nonLandCards.filter((card) => classifyRole(card).some((role) => role === "utility" || role === "payoff" || role === "protection" || role === "recursion"));
  for (const card of utilityCards) {
    if (cards.length >= 100) break;
    addCard(card, `${card.name} adds utility or payoff density for ${commander.name}.`);
  }

  nextBasic = 0;
  while (cards.length < 100 && basics.length > 0) {
    addCard(basics[nextBasic], `${basics[nextBasic].name} fills the remaining legal deck slots.`, { ignoreBudget: true });
    nextBasic = (nextBasic + 1) % basics.length;
  }

  const validation = validateCommanderDeck({ commander, cards: cards.map((entry) => entry.card) });
  return { commander, cards, validation };
}
