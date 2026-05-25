import type { Card, Color } from "@/domain/cards/types";
import { err, ok, type Result } from "@/domain/shared/result";

const hasWord = (value: string, word: string) => new RegExp(`\\b${word}\\b`, "i").test(value);
const basicLandSubtypeColors: Array<{ subtype: string; color: Color }> = [
  { subtype: "Plains", color: "W" },
  { subtype: "Island", color: "U" },
  { subtype: "Swamp", color: "B" },
  { subtype: "Mountain", color: "R" },
  { subtype: "Forest", color: "G" },
];

function effectiveColorIdentity(card: Card): Color[] {
  const colors = new Set(card.colorIdentity);
  const isBasicLand = hasWord(card.typeLine, "basic") && hasWord(card.typeLine, "land");
  if (isBasicLand) {
    for (const { subtype, color } of basicLandSubtypeColors) {
      if (hasWord(card.typeLine, subtype)) colors.add(color);
    }
  }
  return [...colors];
}

export function canBeCommander(card: Card): boolean {
  const isLegendaryCreature = hasWord(card.typeLine, "legendary") && hasWord(card.typeLine, "creature");
  return card.legalities.commander === "legal" && (isLegendaryCreature || /can be your commander/i.test(card.oracleText));
}

export function isCommanderLegalInIdentity(card: Card, commander: Card): boolean {
  const commanderColors = new Set<Color>(commander.colorIdentity);
  return effectiveColorIdentity(card).every((color) => commanderColors.has(color));
}

export function allowsMultipleCopies(card: Card): boolean {
  const isBasicLand = hasWord(card.typeLine, "basic") && hasWord(card.typeLine, "land");
  return isBasicLand || /deck can have any number of cards named/i.test(card.oracleText);
}

export function validateCommanderDeck(input: { commander: Card; cards: Card[] }): Result<true> {
  if (!canBeCommander(input.commander)) return err("INVALID_COMMANDER", `${input.commander.name} is not a legal Commander choice.`);

  let includesCommander = false;
  const seen = new Set<string>();
  for (const card of input.cards) {
    if (card.oracleId === input.commander.oracleId) includesCommander = true;
    if (card.legalities.commander !== "legal") return err("DECK_CONSTRAINT_FAILED", `${card.name} is not Commander legal.`);
    if (!isCommanderLegalInIdentity(card, input.commander)) return err("DECK_CONSTRAINT_FAILED", `${card.name} is outside ${input.commander.name}'s color identity.`);
    if (!allowsMultipleCopies(card) && seen.has(card.oracleId)) return err("DECK_CONSTRAINT_FAILED", `Duplicate non-basic card: ${card.name}.`);
    seen.add(card.oracleId);
  }

  if (!includesCommander) return err("DECK_CONSTRAINT_FAILED", `Commander decks must include commander: ${input.commander.name}.`);
  if (input.cards.length !== 100) return err("DECK_CONSTRAINT_FAILED", `Commander decks must contain exactly 100 cards including commander; found ${input.cards.length}.`);
  return ok(true);
}
