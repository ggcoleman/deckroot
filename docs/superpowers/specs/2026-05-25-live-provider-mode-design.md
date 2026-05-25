# Live Provider Mode Design

## Overview

Deckroot will add a functional local live-provider mode that uses Scryfall for real card lookup, card search, prices, purchase links, and import resolution. EDHREC live recommendations will be available only as an explicit experimental opt-in because EDHREC does not advertise a stable public product API and its terms restrict automated agents, scripts, searches, requests, and queries.

The default runtime remains fixture-backed. Live mode must be deliberate, observable, cached, rate-limited, and easy to disable.

## Goals

- Enable `DECKROOT_SCRYFALL_MODE=live` so `/api/cards/search`, `/api/import`, and `/api/deck/build` can resolve real Scryfall cards.
- Enable `DECKROOT_EDHREC_MODE=live` only when `DECKROOT_EDHREC_LIVE_ACK=true` is also set.
- Preserve deterministic fixture behavior for tests and default local development.
- Respect Scryfall expectations: `User-Agent`, `Accept`, conservative rate limit, and cache for repeated lookups.
- Keep EDHREC live clearly labeled as experimental, with 1 request/second, seven-day cache, and graceful fixture fallback on failure.
- Return controlled provider errors in API routes instead of crashing.
- Update docs and environment examples so local setup is honest and usable.

## Non-Goals

- Do not implement a complete Scryfall bulk-data index in this pass.
- Do not make EDHREC live a default or recommended production mode.
- Do not add accounts, persistence, checkout, or collection storage.
- Do not guarantee every arbitrary Commander can assemble an optimal deck from live data alone.

## External Constraints

Scryfall allows API access when clients identify themselves and avoid excessive request rates. Deckroot will use a relevant `User-Agent`, request JSON responses, cache repeated lookups, and keep app-level live requests below the documented limit.

EDHREC terms restrict automated agents/scripts generating automated searches, requests, or queries. Deckroot will therefore require an explicit acknowledgement environment flag before EDHREC live mode is enabled, document that this is experimental, cache responses for seven days, and degrade to fixture recommendations when unavailable.

## Runtime Modes

### Scryfall

`DECKROOT_SCRYFALL_MODE=fixture | live`

- `fixture`: uses existing deterministic `createFixtureCardCatalog`.
- `live`: uses Scryfall-backed catalog for `search` and `findByName`.

### EDHREC

`DECKROOT_EDHREC_MODE=fixture | live`

- `fixture`: uses existing deterministic `createFixtureEdhrecProvider`.
- `live`: only enabled when `DECKROOT_EDHREC_LIVE_ACK=true`.
- If `DECKROOT_EDHREC_MODE=live` and ack is missing, provider factory returns fixture provider plus a runtime warning.
- If EDHREC live request fails, build route falls back to fixture recommendations and returns a warning.

## Provider Factory

Create a runtime provider factory used by API routes:

```ts
export type RuntimeProviders = {
  catalog: CardCatalog;
  edhrec: EdhrecProvider;
  warnings: string[];
  mode: {
    scryfall: "fixture" | "live";
    edhrec: "fixture" | "live" | "fixture-fallback";
  };
};

export function createRuntimeProviders(env?: NodeJS.ProcessEnv): RuntimeProviders;
```

The factory will:

- Read `DECKROOT_SCRYFALL_MODE`, `DECKROOT_EDHREC_MODE`, `DECKROOT_EDHREC_LIVE_ACK`, `DECKROOT_CACHE_DIR`, and `DECKROOT_USER_AGENT`.
- Create a filesystem cache rooted at `DECKROOT_CACHE_DIR` or `.deckroot-cache`.
- Create a Scryfall limiter at 200 ms spacing and one concurrent request, which stays below 5 requests/second.
- Create an EDHREC limiter at 1000 ms spacing and one concurrent request.
- Instantiate fixture or live providers based on mode.

## Live Card Catalog

Add `createScryfallCardCatalog(client, options)` implementing `CardCatalog`:

- `findByName(name)` calls `client.named(name)`.
- `search(query)` calls `client.search(query)` and maps full cards into search results.
- `allCards()` returns a bounded assembly pool, not the entire Scryfall universe.

Because the current deck assembler depends on `allCards()` for filler, live mode will use a hybrid assembly pool:

- Always include fixture basics, fixing lands, rocks, and staples that are legal in Commander.
- Include live resolved seed and owned cards for the current request.
- Include live resolved EDHREC recommendations when available.
- De-duplicate by `oracleId`.

To avoid request-specific global state, the build route will construct a request-scoped catalog with an `extraCards` pool after resolving seed/owned/recommended cards.

## Build Flow

In `/api/deck/build`:

1. Create runtime providers.
2. Validate and normalize request payload as today.
3. Resolve owned cards through runtime catalog.
4. Resolve seed card through runtime catalog.
5. Generate commander candidates using runtime catalog and EDHREC provider.
6. If live Scryfall mode is active, build a request-scoped hybrid catalog that includes fixture staples plus resolved live seed/owned/recommended cards.
7. Assemble, analyze, and produce buy list.
8. Return existing response shape plus optional `providerWarnings` and `providerMode` fields.

Existing UI can ignore new fields; future UI can surface warnings.

## Search And Import Flow

- `/api/cards/search` uses runtime catalog search.
- `/api/import` parses input as today, then resolves rows through runtime catalog.
- Oversized input protections remain unchanged.
- Provider failures return controlled JSON errors with status 502 and a short message.

## Error Handling

- Invalid mode values fall back to fixture mode and add warnings.
- Missing/placeholder user agent in live Scryfall mode returns a configuration error. A user agent must not be the example `contact@example.com` in live mode.
- Scryfall request failures are caught in API routes and returned as `502` with a provider error.
- EDHREC live failures degrade to fixture recommendations with warnings rather than failing the entire build.

## Testing Strategy

- Unit tests for runtime provider factory mode selection and ack behavior.
- Unit tests for Scryfall catalog wrapping search, named lookup, and bounded `allCards()` pool.
- API route tests with mocked provider factory or mocked fetch proving live search/import/build use live cards.
- Tests proving invalid live Scryfall config returns controlled error.
- Tests proving EDHREC live without ack falls back to fixture with warning.
- Existing fixture tests and E2E remain deterministic.

## Documentation Updates

- `.env.example` adds `DECKROOT_EDHREC_LIVE_ACK=false` and a realistic `DECKROOT_USER_AGENT` note.
- README explains fixture, Scryfall live, and EDHREC experimental live setup.
- Provider compliance doc states EDHREC live is opt-in and should be used only with permission or local experiments.

## Open Risks

- Scryfall live without a bulk index can search and resolve real cards, but deck assembly still depends on a bounded hybrid pool. This is acceptable for functional local live mode and keeps scope small.
- EDHREC live may break if the unofficial response shape changes. The adapter must fail softly.
- API body size limits still rely on application-level checks after JSON parsing; production deployment should add platform body-size limits.
