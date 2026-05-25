import { NextResponse } from "next/server";
import { exportDeckAsCsv, exportDeckAsText } from "@/domain/decks/exporter";

type ExportDeckBody = {
  deck?: Parameters<typeof exportDeckAsText>[0] | null;
  format?: "text" | "csv";
};

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

function isExportableDeck(deck: ExportDeckBody["deck"]): deck is Parameters<typeof exportDeckAsText>[0] {
  return Boolean(
    deck
      && typeof deck === "object"
      && deck.commander
      && typeof deck.commander === "object"
      && Array.isArray(deck.cards),
  );
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return await request.json() as Partial<T>;
  } catch {
    return {};
  }
}
