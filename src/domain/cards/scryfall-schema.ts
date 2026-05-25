import { z } from "zod";

const colorSchema = z.enum(["W", "U", "B", "R", "G"]);
const nullableStringPriceSchema = z.union([z.string(), z.null()]);

export const scryfallCardFaceSchema = z.object({
  oracle_text: z.string().optional().default(""),
  type_line: z.string().optional(),
  image_uris: z.object({ normal: z.string().optional() }).optional(),
});

export const scryfallCardSchema = z.object({
  id: z.string(),
  oracle_id: z.string(),
  name: z.string(),
  mana_cost: z.string().optional().default(""),
  cmc: z.number().optional().default(0),
  color_identity: z.array(colorSchema).optional().default([]),
  type_line: z.string().optional().default(""),
  oracle_text: z.string().optional().default(""),
  legalities: z.record(z.string(), z.string()).optional().default({}),
  edhrec_rank: z.number().nullable().optional().default(null),
  game_changer: z.boolean().optional().default(false),
  prices: z.object({
    usd: nullableStringPriceSchema.optional().default(null),
    eur: nullableStringPriceSchema.optional().default(null),
    tix: nullableStringPriceSchema.optional().default(null),
  }).optional().default({ usd: null, eur: null, tix: null }),
  purchase_uris: z.object({
    tcgplayer: z.string().optional(),
    cardmarket: z.string().optional(),
    cardhoarder: z.string().optional(),
  }).optional().default({}),
  image_uris: z.object({ normal: z.string().optional() }).optional(),
  card_faces: z.array(scryfallCardFaceSchema).optional(),
  produced_mana: z.array(colorSchema).optional(),
});

export const scryfallSearchResponseSchema = z.object({
  data: z.array(scryfallCardSchema),
});

export type ScryfallCard = z.infer<typeof scryfallCardSchema>;
export type ScryfallSearchResponse = z.infer<typeof scryfallSearchResponseSchema>;
