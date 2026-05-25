import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BuyRail } from "@/components/builder/BuyRail";
import { BuilderShell } from "@/components/builder/BuilderShell";
import { CandidateBoard } from "@/components/builder/CandidateBoard";
import { CardArt } from "@/components/builder/CardArt";
import { DeckWorkspace } from "@/components/builder/DeckWorkspace";
import type { AnalysisView, BuyListView, CandidateView, CardView, DeckView } from "@/components/builder/types";
import { fixtureCard } from "@/domain/decks/demo-fixtures";

function toCardView(name: string): CardView {
  const card = fixtureCard(name);
  return {
    ...card,
    prices: { usd: card.prices.usd },
  };
}

const roles: AnalysisView["roles"] = {
  land: 1,
  ramp: 1,
  draw: 0,
  removal: 0,
  wipe: 0,
  protection: 0,
  recursion: 0,
  payoff: 1,
  utility: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("builder UI", () => {
  it("makes card art thumbnails focusable with a larger hover preview", () => {
    const solRing = toCardView("Sol Ring");
    const { container } = render(<CardArt card={solRing} />);

    const thumbnail = screen.getByRole("img", { name: "Sol Ring card art" });
    const preview = container.querySelector(".cardArtPreview");

    expect(thumbnail).toHaveAttribute("tabindex", "0");
    expect(preview).toHaveAttribute("aria-hidden", "true");
    expect(preview).toHaveTextContent("Sol Ring");
    expect(preview).toHaveStyle(`background-image: url("${solRing.imageUrl}")`);
  });

  it("builds with the typed seed from the seed helper instead of resetting to the demo card", async () => {
    const fetchImpl = vi.fn(async () => Response.json({
      candidates: [],
      deck: null,
      analysis: null,
      buyList: null,
    }));
    vi.stubGlobal("fetch", fetchImpl);

    render(<BuilderShell />);
    fireEvent.change(screen.getByLabelText("Card or commander"), { target: { value: "Rev, Tithe Extractor" } });
    fireEvent.click(screen.getByRole("button", { name: "Use Rev, Tithe Extractor" }));

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled());
    const requestBody = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(requestBody.seedCardName).toBe("Rev, Tithe Extractor");
  });

  it("renders card art across candidates, the deck preview, and the buy list", () => {
    const commander = toCardView("Alela, Artful Provocateur");
    const solRing = toCardView("Sol Ring");
    const candidate: CandidateView = {
      id: "alela-2",
      commanderName: commander.name,
      commander,
      theme: "Esper flying tokens",
      score: 42,
      ownedCount: 1,
      ownedSynergyCount: 1,
      missingEstimatedUsd: 0,
      targetBracket: 2,
      reasons: ["1 owned synergy cards match EDHREC recommendations."],
    };
    const deck: DeckView = {
      commander,
      cards: [
        { card: commander, quantity: 1, ownedQuantity: 1, role: ["payoff"], sourceReason: "Commander." },
        { card: solRing, quantity: 1, ownedQuantity: 0, role: ["ramp"], sourceReason: "Ramp." },
      ],
      validation: { ok: true, value: true },
    };
    const analysis: AnalysisView = {
      curve: { "0": 0, "1": 1, "4": 1 },
      averageManaValue: 2.5,
      roles,
      estimatedPriceUsd: 2.1,
      gameChangerCount: 1,
      bracket: {
        recommended: 2,
        confidence: "medium",
        reasons: ["Bracket estimates are Rule Zero conversation aids."],
        ruleZeroNotes: ["Talk through table expectations."],
      },
    };
    const buyList: BuyListView = {
      items: [{
        card: solRing,
        quantity: 1,
        estimatedUsd: 1.35,
        priority: "High-impact",
        selectedWithinBudget: true,
      }],
      totalSelectedUsd: 1.35,
    };

    render(
      <>
        <CandidateBoard candidates={[candidate]} selectedCandidateId={candidate.id} />
        <DeckWorkspace deck={deck} analysis={analysis} targetBracket={2} />
        <BuyRail buyList={buyList} budgetUsd={10} />
      </>,
    );

    expect(screen.getAllByRole("img", { name: "Alela, Artful Provocateur card art" })).toHaveLength(3);
    expect(screen.getAllByRole("img", { name: "Sol Ring card art" })).toHaveLength(2);
  });

  it("renders every card row in a 100-card commander deck", () => {
    const commander = toCardView("Alela, Artful Provocateur");
    const swamp = toCardView("Swamp");
    const deck: DeckView = {
      commander,
      cards: [
        { card: commander, quantity: 1, ownedQuantity: 1, role: ["payoff"], sourceReason: "Commander." },
        ...Array.from({ length: 99 }, () => ({
          card: swamp,
          quantity: 1,
          ownedQuantity: 0,
          role: ["land"] as const,
          sourceReason: "Legal mana base.",
        })),
      ],
      validation: { ok: true, value: true },
    };
    const analysis: AnalysisView = {
      curve: { "0": 99, "4": 1 },
      averageManaValue: 0.04,
      roles: { ...roles, land: 99 },
      estimatedPriceUsd: 5.7,
      gameChangerCount: 0,
      bracket: {
        recommended: 2,
        confidence: "medium",
        reasons: ["Bracket estimates are Rule Zero conversation aids."],
        ruleZeroNotes: ["Talk through table expectations."],
      },
    };

    render(<DeckWorkspace deck={deck} analysis={analysis} targetBracket={2} />);

    const deckList = screen.getByRole("list", { name: "Deck preview" });
    expect(within(deckList).getAllByRole("listitem")).toHaveLength(100);
    expect(within(deckList).getByText("1 Alela, Artful Provocateur")).toBeVisible();
    expect(within(deckList).getAllByText("1 Swamp")).toHaveLength(99);
  });
});
