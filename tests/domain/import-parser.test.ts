import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { parseImportedList } from "@/domain/import/import-parser";
import { resolveImportedRows } from "@/domain/import/import-resolver";

describe("owned-list import", () => {
  it("parses plain text quantities and commander marker", () => {
    const result = parseImportedList("1 Sol Ring\n2 Island\nCommander: Alela, Artful Provocateur");
    expect(result.rows).toMatchObject([
      { quantity: 1, name: "Sol Ring", sourceSection: "main", commander: false },
      { quantity: 2, name: "Island", sourceSection: "main", commander: false },
      { quantity: 1, name: "Alela, Artful Provocateur", sourceSection: "commander", commander: true }
    ]);
  });

  it("parses 1x text quantities", () => {
    expect(parseImportedList("1x Sol Ring").rows).toMatchObject([
      { quantity: 1, name: "Sol Ring" }
    ]);
  });

  it("parses ManaBox CSV exports", () => {
    const csv = "Name,Quantity,Set code,Collector number\nSol Ring,1,CMM,400\nIsland,10,DMU,278";
    expect(parseImportedList(csv).rows).toMatchObject([
      { quantity: 1, name: "Sol Ring", setCode: "CMM", collectorNumber: "400" },
      { quantity: 10, name: "Island", setCode: "DMU", collectorNumber: "278" }
    ]);
  });

  it("keeps malformed CSV rows as warnings without blocking valid rows", () => {
    const csv = "Name,Quantity,Set code,Collector number\nSol Ring,1,CMM,400\nBroken Row,1,ABC,123,EXTRA\nIsland,2,DMU,278";
    const result = parseImportedList(csv);

    expect(result.detectedFormat).toBe("csv");
    expect(result.rows).toMatchObject([
      { quantity: 1, name: "Sol Ring", setCode: "CMM", collectorNumber: "400" },
      { quantity: 2, name: "Island", setCode: "DMU", collectorNumber: "278" }
    ]);
    expect(result.warnings).toEqual([
      { line: 3, raw: "Broken Row,1,ABC,123,EXTRA", message: "Could not parse CSV card name and quantity." }
    ]);
  });

  it("preserves text warning line numbers with leading blank lines", () => {
    const result = parseImportedList("\n1 Sol Ring\nnot a usable row ###");

    expect(result.rows).toMatchObject([{ quantity: 1, name: "Sol Ring" }]);
    expect(result.warnings).toEqual([
      { line: 3, raw: "not a usable row ###", message: "Could not parse a quantity and card name." }
    ]);
  });

  it("preserves CSV warning line numbers with leading blank lines", () => {
    const csv = "\nName,Quantity,Set code,Collector number\nSol Ring,1,CMM,400\nBroken Row,1,ABC,123,EXTRA";
    const result = parseImportedList(csv);

    expect(result.detectedFormat).toBe("csv");
    expect(result.rows).toMatchObject([
      { quantity: 1, name: "Sol Ring", setCode: "CMM", collectorNumber: "400" }
    ]);
    expect(result.warnings).toEqual([
      { line: 4, raw: "Broken Row,1,ABC,123,EXTRA", message: "Could not parse CSV card name and quantity." }
    ]);
  });

  it("keeps malformed rows as warnings", () => {
    const result = parseImportedList("1 Sol Ring\nnot a usable row ###\n1 Arcane Signet");
    expect(result.rows.map((row) => row.name)).toEqual(["Sol Ring", "Arcane Signet"]);
    expect(result.warnings).toEqual([{ line: 2, raw: "not a usable row ###", message: "Could not parse a quantity and card name." }]);
  });

  it("resolves rows through fixture catalog", async () => {
    const parsed = parseImportedList("1 sol ring\n1 Alela, Artful Provocateur");
    const resolved = await resolveImportedRows(parsed.rows, createFixtureCardCatalog());
    expect(resolved.cards.map((row) => row.card.name)).toEqual(["Sol Ring", "Alela, Artful Provocateur"]);
    expect(resolved.unresolved).toEqual([]);
  });
});
