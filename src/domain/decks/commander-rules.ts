import type { Card, Color } from "@/domain/cards/types";
import { err, ok, type Result } from "@/domain/shared/result";

const basicLandNames = new Set(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]);

export function canBeCommander(card: Card): boolean {
  const text = `${card.typeLine}\n${card.oracleText}`.toLowerCase();
  return card.legalities.commander === "legal" && (text.includes("legendary creature") || text.includes("can be your commander"));
}

export function isCommanderLegalInIdentity(card: Card, commander: Card): boolean {
  const commanderColors = new Set<Color>(commander.colorIdentity);
  return card.colorIdentity.every((color) => commanderColors.has(color));
}

export function allowsMultipleCopies(card: Card): boolean {
  return basicLandNames.has(card.name) || /deck can have any number of cards named/i.test(card.oracleText);
}

export function validateCommanderDeck(input: { commander: Card; cards: Card[] }): Result<true> {
  if (!canBeCommander(input.commander)) return err("INVALID_COMMANDER", `${input.commander.name} is not a legal Commander choice.`);

  const seen = new Set<string>();
  for (const card of input.cards) {
    if (card.legalities.commander !== "legal") return err("DECK_CONSTRAINT_FAILED", `${card.name} is not Commander legal.`);
    if (!isCommanderLegalInIdentity(card, input.commander)) return err("DECK_CONSTRAINT_FAILED", `${card.name} is outside ${input.commander.name}'s color identity.`);
    if (!allowsMultipleCopies(card) && seen.has(card.oracleId)) return err("DECK_CONSTRAINT_FAILED", `Duplicate non-basic card: ${card.name}.`);
    seen.add(card.oracleId);
  }

  if (input.cards.length !== 100) return err("DECK_CONSTRAINT_FAILED", `Commander decks must contain exactly 100 cards including commander; found ${input.cards.length}.`);
  return ok(true);
}
