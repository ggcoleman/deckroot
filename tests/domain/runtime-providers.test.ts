import { describe, expect, it, vi } from "vitest";
import { createRuntimeProviders } from "@/domain/providers/runtime-providers";
import { createMemoryCache } from "@/domain/shared/cache";

const liveUserAgent = "Deckroot Tests (mailto:deckroot-tests@deckroot.dev)";

const scryfallCard = (name: string) => ({
  id: `scryfall-${name.toLowerCase().replace(/\s+/g, "-")}`,
  oracle_id: `oracle-${name.toLowerCase().replace(/\s+/g, "-")}`,
  name,
  mana_cost: "{1}",
  cmc: 1,
  color_identity: [],
  type_line: "Artifact",
  oracle_text: "{T}: Add one mana of any color.",
  legalities: { commander: "legal" },
  prices: { usd: "1.00", eur: null, tix: null },
  purchase_uris: {},
});

describe("runtime provider factory", () => {
  it("defaults to fixture Scryfall and fixture EDHREC providers", async () => {
    const result = createRuntimeProviders({}, { cache: createMemoryCache() });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.mode).toEqual({ scryfall: "fixture", edhrec: "fixture" });
    await expect(result.value.catalog.findByName("Sol Ring")).resolves.toMatchObject({ name: "Sol Ring" });
    await expect(result.value.edhrec.getCommanderRecommendations({
      commanderName: "Alela, Artful Provocateur",
      seedNames: ["Sol Ring"],
    })).resolves.toMatchObject({ source: "fixture" });
  });

  it("rejects live Scryfall mode without a user agent", () => {
    const result = createRuntimeProviders({ DECKROOT_SCRYFALL_MODE: "live" }, { cache: createMemoryCache() });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "PROVIDER_ERROR",
      },
    });
  });

  it("rejects placeholder live Scryfall user agents", () => {
    const result = createRuntimeProviders({
      DECKROOT_SCRYFALL_MODE: "live",
      DECKROOT_USER_AGENT: "Deckroot/0.1 contact@example.com",
    }, { cache: createMemoryCache() });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "PROVIDER_ERROR",
      },
    });
  });

  it("builds a live Scryfall catalog that uses the injected fetch implementation", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      Response.json({ data: [scryfallCard("Live Mana Rock")] }, { headers: init?.headers })
    );
    const result = createRuntimeProviders({
      DECKROOT_SCRYFALL_MODE: "live",
      DECKROOT_USER_AGENT: liveUserAgent,
    }, {
      cache: createMemoryCache(),
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const cards = await result.value.catalog.search("Live Mana Rock");

    expect(result.value.mode.scryfall).toBe("live");
    expect(cards[0]).toMatchObject({ name: "Live Mana Rock" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({
      Accept: "application/json",
      "User-Agent": liveUserAgent,
    });
  });

  it("falls back to fixture EDHREC when live mode is not acknowledged", async () => {
    const result = createRuntimeProviders({
      DECKROOT_EDHREC_MODE: "live",
      DECKROOT_USER_AGENT: liveUserAgent,
    }, { cache: createMemoryCache() });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.mode.edhrec).toBe("fixture-fallback");
    expect(result.value.warnings.join(" ")).toContain("EDHREC live mode");
    await expect(result.value.edhrec.getCommanderRecommendations({
      commanderName: "Alela, Artful Provocateur",
      seedNames: ["Sol Ring"],
    })).resolves.toMatchObject({ source: "fixture" });
  });

  it("returns a provider error for unknown provider modes", () => {
    const result = createRuntimeProviders({ DECKROOT_SCRYFALL_MODE: "turbo" }, { cache: createMemoryCache() });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "PROVIDER_ERROR",
      },
    });
  });
});
