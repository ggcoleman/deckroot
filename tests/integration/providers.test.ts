import { access, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createScryfallClient, normalizeScryfallCard } from "@/domain/cards/scryfall-client";
import { fixtureCard, fixtureDeck } from "@/domain/decks/demo-fixtures";
import { createFixtureEdhrecProvider, createLiveEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { createFileCache, createMemoryCache } from "@/domain/shared/cache";
import { createRateLimiter } from "@/domain/shared/rate-limit";

const basicLandNames = new Set(["Island", "Plains", "Swamp", "Mountain", "Forest", "Wastes"]);
const skippableSymlinkCodes = new Set(["EPERM", "EACCES", "ENOTSUP", "ENOSYS", "EINVAL"]);

afterEach(() => {
  vi.useRealTimers();
});

describe("provider infrastructure", () => {
  it("stores, reuses, and expires cached JSON values", async () => {
    let now = 1_000;
    const cache = createMemoryCache(() => now);
    await cache.set("scryfall", "sol-ring", { name: "Sol Ring" }, 2);
    await expect(cache.get("scryfall", "sol-ring")).resolves.toEqual({ name: "Sol Ring" });
    now += 3;
    await expect(cache.get("scryfall", "sol-ring")).resolves.toBeNull();
  });

  it("keeps file cache writes inside the configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "deckroot-cache-"));
    const escapedPath = join(dirname(root), "escape.json");
    await rm(escapedPath, { force: true });

    try {
      const cache = createFileCache(root);
      await cache.set("..", "escape", { ok: true }, 60_000);

      await expect(access(escapedPath)).rejects.toThrow();
      await expect(cache.get("..", "escape")).resolves.toEqual({ ok: true });
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(escapedPath, { force: true });
    }
  });

  it("rejects pre-existing provider directory symlinks that resolve outside the cache root", async () => {
    const root = await mkdtemp(join(tmpdir(), "deckroot-cache-"));
    const outside = await mkdtemp(join(tmpdir(), "deckroot-cache-outside-"));
    const providerDir = join(root, "linked-provider");

    try {
      await mkdir(outside, { recursive: true });
      try {
        await symlink(outside, providerDir, process.platform === "win32" ? "junction" : "dir");
      } catch (error) {
        if (skippableSymlinkCodes.has((error as NodeJS.ErrnoException).code ?? "")) return;
        throw error;
      }

      const cache = createFileCache(root);
      await expect(cache.set("linked-provider", "escape", { ok: true }, 60_000)).rejects.toThrow();
      await expect(cache.get("linked-provider", "escape")).resolves.toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("provides deterministic card and deck fixtures", () => {
    expect(fixtureCard("Sol Ring").name).toBe("Sol Ring");

    const deck = fixtureDeck();
    expect(deck.cards).toHaveLength(100);
    expect(deck.cards[0]?.card.name).toBe("Alela, Artful Provocateur");
    expect(deck.cards.filter((entry) => entry.role.includes("land")).length).toBeGreaterThanOrEqual(34);

    const counts = new Map<string, number>();
    for (const entry of deck.cards) {
      counts.set(entry.card.name, (counts.get(entry.card.name) ?? 0) + 1);
    }

    const nonBasicDuplicates = [...counts]
      .filter(([name, count]) => count > 1 && !basicLandNames.has(name))
      .map(([name]) => name);
    expect(nonBasicDuplicates).toEqual([]);
  });

  it("queues calls through the rate limiter", async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ intervalMs: 100, maxConcurrent: 1 });
    const events: string[] = [];
    const first = limiter.schedule(async () => events.push("first"));
    const second = limiter.schedule(async () => events.push("second"));
    await vi.advanceTimersByTimeAsync(0);
    await first;
    expect(events).toEqual(["first"]);
    await vi.advanceTimersByTimeAsync(100);
    await second;
    expect(events).toEqual(["first", "second"]);
  });

  it("starts queued work up to max concurrency while respecting interval", async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ intervalMs: 100, maxConcurrent: 2 });
    let running = 0;
    let maxSeen = 0;
    const releases: Array<() => void> = [];

    const makeWork = () =>
      new Promise<void>((resolve) => {
        running += 1;
        maxSeen = Math.max(maxSeen, running);
        releases.push(() => {
          running -= 1;
          resolve();
        });
      });

    const first = limiter.schedule(makeWork);
    const second = limiter.schedule(makeWork);

    await vi.advanceTimersByTimeAsync(0);
    expect(maxSeen).toBe(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(maxSeen).toBe(2);

    releases.forEach((release) => release());
    await Promise.all([first, second]);
  });

  it("rejects synchronous work failures and continues draining the queue", async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ intervalMs: 100, maxConcurrent: 1 });
    const events: string[] = [];

    const first = limiter.schedule(() => {
      events.push("first");
      throw new Error("boom");
    });
    const second = limiter.schedule(async () => {
      events.push("second");
    });

    const firstFailure = expect(first).rejects.toThrow("boom");
    await vi.advanceTimersByTimeAsync(0);
    await firstFailure;
    await vi.advanceTimersByTimeAsync(100);
    await second;
    expect(events).toEqual(["first", "second"]);
  });
});

describe("edhrec fixture provider", () => {
  it("returns deterministic commander recommendations", async () => {
    const provider = createFixtureEdhrecProvider(createFixtureCardCatalog());
    const recs = await provider.getCommanderRecommendations({ commanderName: "Alela, Artful Provocateur", seedNames: ["Sol Ring"] });
    expect(recs.source).toBe("fixture");
    expect(recs.cards[0].name).toBe("Sol Ring");
    expect(recs.attributionUrl).toContain("edhrec.com");
  });
});

describe("scryfall adapter", () => {
  it("normalizes colorless produced mana without adding color identity", () => {
    const card = normalizeScryfallCard({
      id: "scryfall-sol-ring",
      oracle_id: "oracle-sol-ring",
      name: "Sol Ring",
      mana_cost: "{1}",
      cmc: 1,
      color_identity: [],
      type_line: "Artifact",
      oracle_text: "{T}: Add {C}{C}.",
      legalities: { commander: "legal" },
      prices: { usd: "1.25", eur: null, tix: null },
      purchase_uris: {},
      produced_mana: ["C"],
    });

    expect(card.colorIdentity).toEqual([]);
    expect(card.producedMana).toEqual(["C"]);
  });

  it("uses normalized search and named cache keys", async () => {
    const cache = createMemoryCache();
    const limiter = createRateLimiter({ intervalMs: 0, maxConcurrent: 1 });
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const card = {
        id: "scryfall-sol-ring",
        oracle_id: "oracle-sol-ring",
        name: "Sol Ring",
        mana_cost: "{1}",
        cmc: 1,
        color_identity: [],
        type_line: "Artifact",
        oracle_text: "{T}: Add {C}{C}.",
        legalities: { commander: "legal" },
        prices: { usd: "1.25", eur: null, tix: null },
        purchase_uris: {},
      };
      return Response.json(url.includes("/cards/search") ? { data: [card] } : card);
    });
    const client = createScryfallClient({ cache, limiter, userAgent: "Deckroot Tests", fetchImpl });

    await client.search(" Sol Ring ");
    await client.search("sol ring");
    await client.named(" Sol Ring ");
    await client.named("sol ring");

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("edhrec live provider", () => {
  it("posts endpoint-oriented fields and maps returned cards through the catalog", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ inRecs: [{ name: "Sol Ring", score: 100 }] }));
    const provider = createLiveEdhrecProvider({
      catalog: createFixtureCardCatalog(),
      cache: createMemoryCache(),
      limiter: createRateLimiter({ intervalMs: 0, maxConcurrent: 1 }),
      userAgent: "Deckroot Tests",
      fetchImpl,
    });

    const recs = await provider.getCommanderRecommendations({
      commanderName: "Alela, Artful Provocateur",
      partnerName: "Tegwyll, Duke of Splendor",
      seedNames: ["Sol Ring"],
    });

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.cards).toEqual(["Sol Ring"]);
    expect(body.commanders).toEqual(["Alela, Artful Provocateur", "Tegwyll, Duke of Splendor"]);
    expect(body.name).toBe("Alela, Artful Provocateur");
    expect(body).not.toHaveProperty("commanderName");
    expect(body).not.toHaveProperty("seedNames");
    expect(recs.cards[0].name).toBe("Sol Ring");
    expect(recs.cards[0].synergyScore).toBe(100);
  });

  it("normalizes commander and seed names for cache keys", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ inRecs: [{ name: "Sol Ring", score: 100 }] }));
    const provider = createLiveEdhrecProvider({
      catalog: createFixtureCardCatalog(),
      cache: createMemoryCache(),
      limiter: createRateLimiter({ intervalMs: 0, maxConcurrent: 1 }),
      userAgent: "Deckroot Tests",
      fetchImpl,
    });

    await provider.getCommanderRecommendations({ commanderName: " Alela, Artful Provocateur ", seedNames: ["Sol Ring", " sol ring "] });
    const cached = await provider.getCommanderRecommendations({ commanderName: "alela artful provocateur", seedNames: ["SOL RING"] });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(cached.source).toBe("cache");
  });
});

