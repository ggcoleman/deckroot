import { NextResponse } from "next/server";
import type { Card } from "@/domain/cards/types";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { assembleCommanderDeck } from "@/domain/decks/deck-assembler";
import { analyzeDeck } from "@/domain/decks/deck-analysis";
import { buildBuyList } from "@/domain/decks/buy-list";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";

const maxOwnedCardNames = 500;
const maxCardNameLength = 200;

type BuildDeckBody = {
  seedCardName?: string;
  ownedCardNames?: string[];
  targetBracket?: number;
  budgetUsd?: number;
};

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<BuildDeckBody>(request);
  const normalized = normalizeBuildPayload(body);
  if (!normalized.ok) {
    return NextResponse.json({ error: "Invalid build payload" }, { status: 400 });
  }
  if (normalized.ownedCardNames.length > maxOwnedCardNames) {
    return NextResponse.json({ error: "Too many owned cards" }, { status: 413 });
  }

  const targetBracket = body.targetBracket ?? 2;
  const budgetUsd = body.budgetUsd ?? 75;
  const catalog = createFixtureCardCatalog();
  const edhrec = createFixtureEdhrecProvider(catalog);
  const ownedCards = await resolveCardNames(normalized.ownedCardNames, catalog.findByName);
  const seedCard = normalized.seedCardName ? await catalog.findByName(normalized.seedCardName) ?? undefined : undefined;

  const candidates = await generateCommanderCandidates({
    seedCard,
    ownedCards,
    targetBracket,
    budgetUsd,
    catalog,
    edhrec,
  });
  const deck = candidates[0]
    ? await assembleCommanderDeck({ candidate: candidates[0], ownedCards, budgetUsd, catalog })
    : null;
  const analysis = deck ? analyzeDeck(deck) : null;
  const buyList = deck ? buildBuyList({ deck, ownedCards, budgetUsd }) : null;

  return NextResponse.json({ candidates, deck, analysis, buyList });
}

function normalizeBuildPayload(body: Partial<BuildDeckBody>):
  | { ok: true; seedCardName?: string; ownedCardNames: string[] }
  | { ok: false } {
  const seedCardName = body.seedCardName;
  if (seedCardName !== undefined && (typeof seedCardName !== "string" || seedCardName.length > maxCardNameLength)) {
    return { ok: false };
  }

  const ownedCardNames = body.ownedCardNames;
  if (ownedCardNames === undefined) {
    return { ok: true, seedCardName, ownedCardNames: [] };
  }
  if (!Array.isArray(ownedCardNames)) {
    return { ok: false };
  }
  if (ownedCardNames.some((name) => typeof name !== "string" || name.length > maxCardNameLength)) {
    return { ok: false };
  }

  return { ok: true, seedCardName, ownedCardNames };
}

async function resolveCardNames(
  names: string[],
  findByName: (name: string) => Promise<Card | null>,
): Promise<Card[]> {
  const cards: Card[] = [];
  for (const name of names) {
    const card = await findByName(name);
    if (card) cards.push(card);
  }
  return cards;
}

async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return await request.json() as Partial<T>;
  } catch {
    return {};
  }
}
