import type { AssembledDeck } from "@/domain/decks/deck-assembler";
import type { DeckRole } from "@/domain/decks/role-classifier";

export type BracketEstimate = {
  recommended: 1 | 2 | 3 | 4 | 5;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  ruleZeroNotes: string[];
};

export type DeckAnalysis = {
  curve: Record<number, number>;
  averageManaValue: number;
  roles: Record<DeckRole, number>;
  estimatedPriceUsd: number;
  gameChangerCount: number;
  bracket: BracketEstimate;
};

const roleNames: DeckRole[] = ["land", "ramp", "draw", "removal", "wipe", "protection", "recursion", "payoff", "utility"];

export function analyzeDeck(deck: AssembledDeck): DeckAnalysis {
  const curve: Record<number, number> = {};
  const roles = Object.fromEntries(roleNames.map((role) => [role, 0])) as Record<DeckRole, number>;
  let totalManaValue = 0;
  let totalCards = 0;
  let estimatedPriceUsd = 0;
  let gameChangerCount = 0;
  let fastManaCount = 0;
  let tutorCount = 0;

  for (const entry of deck.cards) {
    const quantity = entry.quantity;
    const manaValue = Math.max(0, Math.floor(entry.card.manaValue));
    curve[manaValue] = (curve[manaValue] ?? 0) + quantity;
    totalManaValue += entry.card.manaValue * quantity;
    totalCards += quantity;
    estimatedPriceUsd += (entry.card.prices.usd ?? 0) * quantity;
    if (entry.card.gameChanger) gameChangerCount += quantity;
    if (isFastMana(entry)) fastManaCount += quantity;
    if (isTutor(entry.card.oracleText)) tutorCount += quantity;

    for (const role of entry.role) {
      roles[role] += quantity;
    }
  }

  return {
    curve,
    averageManaValue: totalCards === 0 ? 0 : roundCurrency(totalManaValue / totalCards),
    roles,
    estimatedPriceUsd: roundCurrency(estimatedPriceUsd),
    gameChangerCount,
    bracket: estimateBracket({ gameChangerCount, fastManaCount, tutorCount, roles }),
  };
}

function estimateBracket(input: {
  gameChangerCount: number;
  fastManaCount: number;
  tutorCount: number;
  roles: Record<DeckRole, number>;
}): BracketEstimate {
  let recommended: BracketEstimate["recommended"] = 2;
  const reasons: string[] = ["Bracket estimates are Rule Zero conversation aids, not definitive power-level ratings."];
  const ruleZeroNotes: string[] = ["Use this estimate to start a Rule Zero conversation about speed, consistency, and table expectations."];

  if (input.gameChangerCount >= 3) {
    recommended = 4;
    reasons.push("Three or more Game Changer cards push the estimate toward bracket 4.");
  } else if (input.gameChangerCount >= 1) {
    recommended = 3;
    reasons.push("One or two Game Changer cards push the estimate toward bracket 3.");
  }

  if (input.fastManaCount >= 2) {
    recommended = maxBracket(recommended, 4);
    reasons.push("Two or more fast mana cards push the estimate to at least bracket 4.");
  }

  if (input.tutorCount >= 4) {
    recommended = maxBracket(recommended, 4);
    reasons.push("Four or more tutors push the estimate to at least bracket 4.");
  }

  const hasDensityWarning = input.roles.ramp < 8 || input.roles.draw < 8;
  if (hasDensityWarning) {
    reasons.push("Confidence warning: low ramp or draw density can make the deck play less consistently than the bracket suggests.");
    ruleZeroNotes.push("Mention that ramp or draw density is below the usual 8-card benchmark.");
  }
  return {
    recommended,
    confidence: hasDensityWarning ? "medium" : "high",
    reasons,
    ruleZeroNotes,
  };
}

function isFastMana(entry: AssembledDeck["cards"][number]): boolean {
  return entry.role.includes("ramp") && entry.card.manaValue <= 1;
}

function isTutor(oracleText: string): boolean {
  return /search your library/i.test(oracleText);
}

function maxBracket(left: BracketEstimate["recommended"], right: BracketEstimate["recommended"]): BracketEstimate["recommended"] {
  return Math.max(left, right) as BracketEstimate["recommended"];
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
