import type { AssembledDeck } from "@/domain/decks/deck-assembler";

export function exportDeckAsText(deck: AssembledDeck): string {
  const body = deck.cards
    .filter((entry) => entry.card.oracleId !== deck.commander.oracleId)
    .map((entry) => `${entry.quantity} ${entry.card.name}`)
    .join("\n");
  return `Commander\n1 ${deck.commander.name}\n\nDeck\n${body}\n`;
}

export function exportDeckAsCsv(deck: AssembledDeck): string {
  const rows = deck.cards.map((entry) =>
    [entry.quantity, quote(entry.card.name), quote(entry.role.join("/")), entry.ownedQuantity, entry.card.prices.usd ?? ""].join(",")
  );
  return ["Quantity,Name,Role,Owned Quantity,Estimated USD", ...rows].join("\n");
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
