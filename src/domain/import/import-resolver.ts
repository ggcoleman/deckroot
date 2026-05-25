import type { Card } from "@/domain/cards/types";
import type { CardCatalog } from "@/domain/cards/card-catalog";
import type { ImportedRow } from "@/domain/import/import-parser";

export type ResolvedImportedCard = ImportedRow & { card: Card; confidence: "exact" };
export type ImportResolveResult = { cards: ResolvedImportedCard[]; unresolved: ImportedRow[] };

export async function resolveImportedRows(rows: ImportedRow[], catalog: CardCatalog): Promise<ImportResolveResult> {
  const cards: ResolvedImportedCard[] = [];
  const unresolved: ImportedRow[] = [];
  for (const row of rows) {
    const card = await catalog.findByName(row.name);
    if (card) cards.push({ ...row, card, confidence: "exact" });
    else unresolved.push(row);
  }
  return { cards, unresolved };
}
