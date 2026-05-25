import type { Card } from "@/domain/cards/types";
import type { AssembledDeck, DeckCardEntry } from "@/domain/decks/deck-assembler";

export type BuyListPriority = "Required" | "High-impact" | "Optimization" | "Nice-to-have";

export type BuyListItem = {
  card: Card;
  quantity: number;
  estimatedUsd: number;
  priority: BuyListPriority;
  selectedWithinBudget: boolean;
};

export type BuyList = {
  items: BuyListItem[];
  totalSelectedUsd: number;
};

export type BuildBuyListInput = {
  deck: AssembledDeck;
  ownedCards: Card[];
  budgetUsd: number;
};

const priorityWeights: Record<BuyListPriority, number> = {
  Required: 0,
  "High-impact": 1,
  Optimization: 2,
  "Nice-to-have": 3,
};

export function buildBuyList(input: BuildBuyListInput): BuyList {
  const ownedCounts = countOwnedCards(input.ownedCards);
  const items = aggregateBuyListItems(missingItemsForDeck(input.deck.cards, ownedCounts))
    .sort((left, right) => priorityWeights[left.priority] - priorityWeights[right.priority] || left.estimatedUsd - right.estimatedUsd || left.card.name.localeCompare(right.card.name));

  let totalSelectedUsd = 0;
  for (const item of items) {
    if (totalSelectedUsd + item.estimatedUsd > input.budgetUsd) break;
    item.selectedWithinBudget = true;
    totalSelectedUsd += item.estimatedUsd;
  }

  return { items, totalSelectedUsd: roundCurrency(totalSelectedUsd) };
}

function missingItemsForDeck(entries: DeckCardEntry[], ownedCounts: Map<string, number>): BuyListItem[] {
  const remainingOwnedCounts = new Map(ownedCounts);
  const items: BuyListItem[] = [];
  for (const entry of entries) {
    const ownedQuantity = remainingOwnedCounts.get(entry.card.oracleId) ?? 0;
    const appliedOwnedQuantity = Math.min(entry.quantity, ownedQuantity);
    remainingOwnedCounts.set(entry.card.oracleId, ownedQuantity - appliedOwnedQuantity);
    const missingQuantity = Math.max(0, entry.quantity - appliedOwnedQuantity);
    if (missingQuantity > 0) items.push(toBuyListItem(entry, missingQuantity));
  }
  return items;
}

function toBuyListItem(entry: DeckCardEntry, missingQuantity: number): BuyListItem {
  return {
    card: entry.card,
    quantity: missingQuantity,
    estimatedUsd: roundCurrency((entry.card.prices.usd ?? 0) * missingQuantity),
    priority: priorityFor(entry),
    selectedWithinBudget: false,
  };
}

function aggregateBuyListItems(items: BuyListItem[]): BuyListItem[] {
  const byOracleId = new Map<string, BuyListItem>();
  for (const item of items) {
    const existing = byOracleId.get(item.card.oracleId);
    if (!existing) {
      byOracleId.set(item.card.oracleId, { ...item });
      continue;
    }
    existing.quantity += item.quantity;
    existing.estimatedUsd = roundCurrency(existing.estimatedUsd + item.estimatedUsd);
    if (priorityWeights[item.priority] < priorityWeights[existing.priority]) {
      existing.priority = item.priority;
    }
  }
  return [...byOracleId.values()];
}

function priorityFor(entry: DeckCardEntry): BuyListPriority {
  if (entry.role.includes("land") || entry.role.includes("ramp")) return "Required";
  if (entry.role.includes("draw") || entry.role.includes("removal")) return "High-impact";
  if ((entry.card.prices.usd ?? 0) >= 15) return "Optimization";
  return "Nice-to-have";
}

function countOwnedCards(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.oracleId, (counts.get(card.oracleId) ?? 0) + 1);
  }
  return counts;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
