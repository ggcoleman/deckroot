import type { Color } from "@/domain/cards/types";
import type { DeckRole } from "@/domain/decks/role-classifier";
import type { Result } from "@/domain/shared/result";

export type CardView = {
  id: string;
  oracleId: string;
  normalizedName: string;
  name: string;
  manaCost: string;
  manaValue: number;
  colorIdentity: Color[];
  typeLine: string;
  oracleText: string;
  prices: { usd: number | null };
  purchaseUris: { tcgplayer?: string; cardmarket?: string; cardhoarder?: string };
  imageUrl: string | null;
};

export type CandidateView = {
  id: string;
  commanderName: string;
  commander: CardView;
  theme: string;
  score: number;
  ownedCount: number;
  ownedSynergyCount: number;
  missingEstimatedUsd: number;
  targetBracket: number;
  reasons: string[];
};

export type DeckEntryView = {
  card: CardView;
  quantity: number;
  ownedQuantity: number;
  role: DeckRole[];
  sourceReason: string;
};

export type DeckView = {
  commander: CardView;
  cards: DeckEntryView[];
  validation: Result<true>;
};

export type AnalysisView = {
  curve: Record<string, number>;
  averageManaValue: number;
  roles: Record<DeckRole, number>;
  estimatedPriceUsd: number;
  gameChangerCount: number;
  bracket: {
    recommended: 1 | 2 | 3 | 4 | 5;
    confidence: "low" | "medium" | "high";
    reasons: string[];
    ruleZeroNotes: string[];
  };
};

export type BuyListItemView = {
  card: CardView;
  quantity: number;
  estimatedUsd: number;
  priority: "Required" | "High-impact" | "Optimization" | "Nice-to-have";
  selectedWithinBudget: boolean;
};

export type BuyListView = {
  items: BuyListItemView[];
  totalSelectedUsd: number;
};

export type BuildResponseView = {
  candidates: CandidateView[];
  deck: DeckView | null;
  analysis: AnalysisView | null;
  buyList: BuyListView | null;
};

export type ImportResponseView = {
  parsed: {
    rows: Array<{ quantity: number; name: string; commander: boolean }>;
    warnings: Array<{ line: number; raw: string; message: string }>;
    detectedFormat: "csv" | "text";
  };
  resolved: {
    cards: Array<{ quantity: number; name: string; commander: boolean; card: CardView }>;
    unresolved: Array<{ quantity: number; name: string }>;
  };
};
