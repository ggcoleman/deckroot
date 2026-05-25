import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as searchCards } from "@/app/api/cards/search/route";
import { POST as importCards } from "@/app/api/import/route";
import { POST as buildDeck } from "@/app/api/deck/build/route";
import { POST as exportDeck } from "@/app/api/export/route";
import { fixtureDeck } from "@/domain/decks/demo-fixtures";

const liveUserAgent = "Deckroot Tests (mailto:deckroot-tests@deckroot.dev)";
const providerEnvKeys = [
  "DECKROOT_SCRYFALL_MODE",
  "DECKROOT_EDHREC_MODE",
  "DECKROOT_EDHREC_LIVE_ACK",
  "DECKROOT_CACHE_DIR",
  "DECKROOT_USER_AGENT",
] as const;
const originalProviderEnv = new Map(providerEnvKeys.map((key) => [key, process.env[key]]));
let tempCacheDirs: string[] = [];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const scryfallCard = (name: string, colorIdentity: string[] = []) => ({
  id: `scryfall-${slug(name)}`,
  oracle_id: `oracle-${slug(name)}`,
  name,
  mana_cost: "{1}",
  cmc: 1,
  color_identity: colorIdentity,
  type_line: "Artifact",
  oracle_text: "{T}: Add one mana of any color.",
  legalities: { commander: "legal" },
  prices: { usd: "1.00", eur: null, tix: null },
  purchase_uris: {},
});

function restoreProviderEnv() {
  for (const key of providerEnvKeys) {
    const originalValue = originalProviderEnv.get(key);
    if (originalValue === undefined) delete process.env[key];
    else process.env[key] = originalValue;
  }
}

async function useProviderEnv(values: Partial<Record<(typeof providerEnvKeys)[number], string>>) {
  restoreProviderEnv();
  const cacheDir = await mkdtemp(join(tmpdir(), "deckroot-route-cache-"));
  tempCacheDirs.push(cacheDir);
  process.env.DECKROOT_CACHE_DIR = cacheDir;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function stubScryfallFetch(cardsByName: Record<string, ReturnType<typeof scryfallCard>> = {}) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.hostname === "edhrec.com") return Response.json({ inRecs: [] });
    if (url.pathname.endsWith("/cards/search")) {
      return Response.json({ data: [cardsByName["Live Mana Rock"] ?? scryfallCard("Live Mana Rock")] });
    }
    const exactName = url.searchParams.get("exact") ?? "Live Card";
    return Response.json(cardsByName[exactName] ?? scryfallCard(exactName));
  });
  vi.stubGlobal("fetch", fetchImpl);
  return fetchImpl;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  restoreProviderEnv();
  for (const cacheDir of tempCacheDirs) await rm(cacheDir, { recursive: true, force: true });
  tempCacheDirs = [];
});

describe("Deckroot Commander API routes", () => {
  it("returns no search cards for short queries", async () => {
    const response = await searchCards(new Request("http://deckroot.test/api/cards/search?q=a"));
    const body = await response.json();

    expect(body).toEqual({ cards: [] });
  });

  it("searches fixture cards for queries with at least two characters", async () => {
    const response = await searchCards(new Request("http://deckroot.test/api/cards/search?q=al"));
    const body = await response.json();

    expect(body.cards.map((card: { name: string }) => card.name)).toContain("Alela, Artful Provocateur");
  });

  it("searches live Scryfall cards when live provider mode is enabled", async () => {
    await useProviderEnv({
      DECKROOT_SCRYFALL_MODE: "live",
      DECKROOT_USER_AGENT: liveUserAgent,
    });
    const fetchImpl = stubScryfallFetch();

    const response = await searchCards(new Request("http://deckroot.test/api/cards/search?q=Live%20Mana"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cards.map((card: { name: string }) => card.name)).toContain("Live Mana Rock");
    expect(body.providerMode).toEqual({ scryfall: "live", edhrec: "fixture" });
    expect(body.providerWarnings).toEqual([]);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({
      Accept: "application/json",
      "User-Agent": liveUserAgent,
    });
  });

  it("imports and resolves deck list rows", async () => {
    const response = await importCards(new Request("http://deckroot.test/api/import", {
      method: "POST",
      body: JSON.stringify({ input: "1 Sol Ring\n1 Missing Card" }),
    }));
    const body = await response.json();

    expect(body.parsed.rows).toHaveLength(2);
    expect(body.resolved.cards.map((entry: { card: { name: string } }) => entry.card.name)).toEqual(["Sol Ring"]);
    expect(body.resolved.unresolved.map((row: { name: string }) => row.name)).toEqual(["Missing Card"]);
  });

  it("imports and resolves live Scryfall cards when live provider mode is enabled", async () => {
    await useProviderEnv({
      DECKROOT_SCRYFALL_MODE: "live",
      DECKROOT_USER_AGENT: liveUserAgent,
    });
    stubScryfallFetch({ "Live Seed": scryfallCard("Live Seed", ["W", "U", "B"]) });

    const response = await importCards(new Request("http://deckroot.test/api/import", {
      method: "POST",
      body: JSON.stringify({ input: "1 Live Seed" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resolved.cards.map((entry: { card: { name: string } }) => entry.card.name)).toEqual(["Live Seed"]);
    expect(body.providerMode).toEqual({ scryfall: "live", edhrec: "fixture" });
    expect(body.providerWarnings).toEqual([]);
  });

  it("rejects import payloads over the anonymous input length cap", async () => {
    const response = await importCards(new Request("http://deckroot.test/api/import", {
      method: "POST",
      body: JSON.stringify({ input: "x".repeat(50_001) }),
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toEqual({ error: "Import input is too large" });
  });

  it("rejects imports that parse over the anonymous row cap", async () => {
    const response = await importCards(new Request("http://deckroot.test/api/import", {
      method: "POST",
      body: JSON.stringify({ input: Array.from({ length: 501 }, () => "1 Sol Ring").join("\n") }),
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toEqual({ error: "Import has too many rows" });
  });

  it("builds a deck candidate with analysis and a buy list", async () => {
    const response = await buildDeck(new Request("http://deckroot.test/api/deck/build", {
      method: "POST",
      body: JSON.stringify({
        seedCardName: "Bitterblossom",
        ownedCardNames: ["Sol Ring", "Not a Real Card"],
        targetBracket: 3,
        budgetUsd: 40,
      }),
    }));
    const body = await response.json();

    expect(body.candidates.length).toBeGreaterThan(0);
    expect(body.deck.commander.name).toBe(body.candidates[0].commanderName);
    expect(body.analysis.bracket.recommended).toBeGreaterThanOrEqual(2);
    expect(body.buyList.items.length).toBeGreaterThan(0);
  });

  it("builds decks with live Scryfall card resolution when live provider mode is enabled", async () => {
    await useProviderEnv({
      DECKROOT_SCRYFALL_MODE: "live",
      DECKROOT_USER_AGENT: liveUserAgent,
    });
    const fetchImpl = stubScryfallFetch({
      "Live Seed": scryfallCard("Live Seed", ["W", "U", "B"]),
      "Live Mana Rock": scryfallCard("Live Mana Rock"),
    });

    const response = await buildDeck(new Request("http://deckroot.test/api/deck/build", {
      method: "POST",
      body: JSON.stringify({
        seedCardName: "Live Seed",
        ownedCardNames: ["Live Mana Rock"],
        targetBracket: 2,
        budgetUsd: 50,
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providerMode).toEqual({ scryfall: "live", edhrec: "fixture" });
    expect(body.providerWarnings).toEqual([]);
    expect(body.candidates.length).toBeGreaterThan(0);
    expect(fetchImpl.mock.calls.some(([input]) => String(input).includes("/cards/named"))).toBe(true);
  });

  it("returns a fixture fallback warning when EDHREC live mode is not acknowledged", async () => {
    await useProviderEnv({
      DECKROOT_EDHREC_MODE: "live",
      DECKROOT_USER_AGENT: liveUserAgent,
    });

    const response = await buildDeck(new Request("http://deckroot.test/api/deck/build", {
      method: "POST",
      body: JSON.stringify({ seedCardName: "Bitterblossom", ownedCardNames: ["Sol Ring"] }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providerMode.edhrec).toBe("fixture-fallback");
    expect(body.providerWarnings.join(" ")).toContain("EDHREC live mode");
    expect(body.deck).not.toBeNull();
  });

  it("falls back to fixture EDHREC recommendations when acknowledged live EDHREC fails", async () => {
    await useProviderEnv({
      DECKROOT_EDHREC_MODE: "live",
      DECKROOT_EDHREC_LIVE_ACK: "true",
      DECKROOT_USER_AGENT: liveUserAgent,
    });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "unavailable" }, { status: 503 })));

    const response = await buildDeck(new Request("http://deckroot.test/api/deck/build", {
      method: "POST",
      body: JSON.stringify({ seedCardName: "Bitterblossom", ownedCardNames: ["Sol Ring"] }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providerMode.edhrec).toBe("fixture-fallback");
    expect(body.providerWarnings.join(" ")).toContain("EDHREC live request failed");
    expect(body.deck).not.toBeNull();
  });

  it("rejects build payloads over the anonymous owned-card cap", async () => {
    const response = await buildDeck(new Request("http://deckroot.test/api/deck/build", {
      method: "POST",
      body: JSON.stringify({ ownedCardNames: Array.from({ length: 501 }, (_, index) => `Card ${index}`) }),
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toEqual({ error: "Too many owned cards" });
  });

  it.each([
    ["non-array owned cards", { ownedCardNames: "Sol Ring" }],
    ["non-string owned card name", { ownedCardNames: [null] }],
    ["non-string seed card", { seedCardName: {} }],
  ])("rejects build payloads with %s", async (_caseName, payload) => {
    const response = await buildDeck(new Request("http://deckroot.test/api/deck/build", {
      method: "POST",
      body: JSON.stringify(payload),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid build payload" });
  });

  it("exports a deck as text by default", async () => {
    const response = await exportDeck(new Request("http://deckroot.test/api/export", {
      method: "POST",
      body: JSON.stringify({ deck: fixtureDeck() }),
    }));
    const body = await response.json();

    expect(body.content).toContain("Commander\n1 Alela, Artful Provocateur");
  });

  it("exports a deck as CSV when requested", async () => {
    const response = await exportDeck(new Request("http://deckroot.test/api/export", {
      method: "POST",
      body: JSON.stringify({ deck: fixtureDeck(), format: "csv" }),
    }));
    const body = await response.json();

    expect(body.content).toContain("Quantity,Name,Role,Owned Quantity,Estimated USD");
  });

  it.each([
    ["missing", {}],
    ["null", { deck: null }],
    ["invalid", { deck: { commander: null, cards: null } }],
    ["malformed", { deck: { commander: {}, cards: [null] } }],
  ])("rejects %s export decks with a controlled 400", async (_caseName, payload) => {
    const response = await exportDeck(new Request("http://deckroot.test/api/export", {
      method: "POST",
      body: JSON.stringify(payload),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Deck is required" });
  });
});
