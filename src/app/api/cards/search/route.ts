import { NextResponse } from "next/server";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ cards: [] });

  const cards = await createFixtureCardCatalog().search(query);
  return NextResponse.json({ cards });
}
