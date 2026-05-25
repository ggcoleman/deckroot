import { describe, expect, it } from "vitest";
import { exportDeckAsCsv, exportDeckAsText } from "@/domain/decks/exporter";
import { fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("deck exporter", () => {
  it("exports commander and main deck sections", () => {
    expect(exportDeckAsText(fixtureDeck())).toContain("Commander\n1 Alela, Artful Provocateur");
  });

  it("exports CSV columns", () => {
    expect(exportDeckAsCsv(fixtureDeck()).split("\n")[0]).toBe("Quantity,Name,Role,Owned Quantity,Estimated USD");
  });
});
