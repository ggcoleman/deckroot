import { NextResponse } from "next/server";
import { exportDeckAsCsv, exportDeckAsText } from "@/domain/decks/exporter";

type ExportDeckBody = {
  deck: Parameters<typeof exportDeckAsText>[0];
  format?: "text" | "csv";
};

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<ExportDeckBody>(request);
  const content = body.format === "csv"
    ? exportDeckAsCsv(body.deck)
    : exportDeckAsText(body.deck);

  return NextResponse.json({ content });
}

async function readJson<T>(request: Request): Promise<T> {
  return await request.json() as T;
}
