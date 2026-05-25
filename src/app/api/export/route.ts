import { NextResponse } from "next/server";
import { exportDeckAsCsv, exportDeckAsText } from "@/domain/decks/exporter";

type ExportDeckBody = {
  deck?: Parameters<typeof exportDeckAsText>[0] | null;
  format?: "text" | "csv";
};

type ExportableDeck = Parameters<typeof exportDeckAsText>[0];

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<ExportDeckBody>(request);
  if (!isExportableDeck(body.deck)) {
    return NextResponse.json({ error: "Deck is required" }, { status: 400 });
  }

  const content = body.format === "csv"
    ? exportDeckAsCsv(body.deck)
    : exportDeckAsText(body.deck);

  return NextResponse.json({ content });
}

function isExportableDeck(deck: unknown): deck is ExportableDeck {
  if (!isRecord(deck) || !isExportableCard(deck.commander) || !Array.isArray(deck.cards)) {
    return false;
  }

  return deck.cards.every(isExportableEntry);
}

function isExportableEntry(entry: unknown): boolean {
  return isRecord(entry)
    && isExportableCard(entry.card)
    && typeof entry.quantity === "number"
    && Number.isFinite(entry.quantity)
    && typeof entry.ownedQuantity === "number"
    && Number.isFinite(entry.ownedQuantity)
    && Array.isArray(entry.role)
    && entry.role.every((role) => typeof role === "string");
}

function isExportableCard(card: unknown): boolean {
  if (!isRecord(card) || typeof card.oracleId !== "string" || typeof card.name !== "string" || !isRecord(card.prices)) {
    return false;
  }

  return card.prices.usd === undefined || card.prices.usd === null || typeof card.prices.usd === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return await request.json() as Partial<T>;
  } catch {
    return {};
  }
}
