import type { Card } from "@/domain/cards/types";

export type EdhrecRecommendationRequest = { commanderName: string; partnerName?: string; seedNames: string[] };
export type EdhrecRecommendedCard = { card: Card; name: string; synergyScore: number; inclusionRate: number | null; sourceReason: string };
export type EdhrecRecommendationResponse = {
  source: "fixture" | "live" | "cache";
  commanderName: string;
  cards: EdhrecRecommendedCard[];
  attributionUrl: string;
};
export type EdhrecProvider = { getCommanderRecommendations(request: EdhrecRecommendationRequest): Promise<EdhrecRecommendationResponse> };
