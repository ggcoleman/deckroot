import type { Card } from "@/domain/cards/types";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { assembleCommanderDeck } from "@/domain/decks/deck-assembler";
import { analyzeDeck } from "@/domain/decks/deck-analysis";
import { buildBuyList } from "@/domain/decks/buy-list";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";

type BuildDeckBody = {
  seedCardName?: string;
  ownedCardNames?: string[];
  targetBracket?: number;
  budgetUsd?: number;
};

export async function POST(request: Request): Promise<Response> {
  const body = await readJson<BuildDeckBody>(request);
  const targetBracket = body.targetBracket ?? 2;
  const budgetUsd = body.budgetUsd ?? 75;
  const catalog = createFixtureCardCatalog();
  const edhrec = createFixtureEdhrecProvider(catalog);
  const ownedCards = await resolveCardNames(body.ownedCardNames ?? [], catalog.findByName);
  const seedCard = body.seedCardName ? await catalog.findByName(body.seedCardName) ?? undefined : undefined;

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

  return Response.json({ candidates, deck, analysis, buyList });
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
