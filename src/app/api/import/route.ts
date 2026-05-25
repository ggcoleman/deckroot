import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { resolveImportedRows } from "@/domain/import/import-resolver";
import { parseImportedList } from "@/domain/import/import-parser";

type ImportBody = {
  input?: string;
};

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<ImportBody>(request);
  const parsed = parseImportedList(body.input ?? "");
  const resolved = await resolveImportedRows(parsed.rows, createFixtureCardCatalog());

  return Response.json({ parsed, resolved });
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return await request.json() as Partial<T>;
  } catch {
    return {};
  }
}
