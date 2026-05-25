export type Color = "W" | "U" | "B" | "R" | "G";
export type ManaSymbol = Color | "C";
export type CardPrice = { usd: number | null; eur: number | null; tix: number | null };
export type PurchaseUris = { tcgplayer?: string; cardmarket?: string; cardhoarder?: string };

export type Card = {
  id: string;
  oracleId: string;
  name: string;
  normalizedName: string;
  manaCost: string;
  manaValue: number;
  colorIdentity: Color[];
  typeLine: string;
  oracleText: string;
  legalities: Record<string, string>;
  edhrecRank: number | null;
  gameChanger: boolean;
  prices: CardPrice;
  purchaseUris: PurchaseUris;
  imageUrl: string | null;
  producedMana?: ManaSymbol[];
};
