import { NextResponse } from "next/server";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { resolveImportedRows } from "@/domain/import/import-resolver";
import { parseImportedList } from "@/domain/import/import-parser";

const maxImportInputLength = 50_000;
const maxImportRows = 500;

type ImportBody = {
  input?: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<ImportBody>(request);
  const input = typeof body.input === "string" ? body.input : "";
  if (input.length > maxImportInputLength) {
    return NextResponse.json({ error: "Import input is too large" }, { status: 413 });
  }

  const parsed = parseImportedList(input);
  if (parsed.rows.length > maxImportRows) {
    return NextResponse.json({ error: "Import has too many rows" }, { status: 413 });
  }

  const resolved = await resolveImportedRows(parsed.rows, createFixtureCardCatalog());

  return NextResponse.json({ parsed, resolved });
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return await request.json() as Partial<T>;
  } catch {
    return {};
  }
}
