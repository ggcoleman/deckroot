import { describe, expect, it } from "vitest";
import { analyzeDeck } from "@/domain/decks/deck-analysis";
import { fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("analyzeDeck", () => {
  it("summarizes curve, roles, price, and bracket reasons", () => {
    const analysis = analyzeDeck(fixtureDeck());
    expect(analysis.roles.land).toBeGreaterThanOrEqual(34);
    expect(analysis.estimatedPriceUsd).toBeGreaterThan(0);
    expect(analysis.bracket.recommended).toBeGreaterThanOrEqual(1);
    expect(analysis.bracket.reasons.join(" ")).toContain("Rule Zero");
  });
});
