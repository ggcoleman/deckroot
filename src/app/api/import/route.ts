import { NextResponse } from "next/server";
import { resolveImportedRows } from "@/domain/import/import-resolver";
import { parseImportedList } from "@/domain/import/import-parser";
import { createRuntimeProviders } from "@/domain/providers/runtime-providers";

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

  const providers = createRuntimeProviders();
  if (!providers.ok) {
    return NextResponse.json({ error: providers.error.message, code: providers.error.code }, { status: 400 });
  }

  try {
    const resolved = await resolveImportedRows(parsed.rows, providers.value.catalog);
    return NextResponse.json({
      parsed,
      resolved,
      providerMode: providers.value.mode,
      providerWarnings: providers.value.warnings,
    });
  } catch (error) {
    return NextResponse.json({
      error: "Card provider request failed",
      detail: error instanceof Error ? error.message : "Unknown provider error",
    }, { status: 502 });
  }
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return await request.json() as Partial<T>;
  } catch {
    return {};
  }
}
