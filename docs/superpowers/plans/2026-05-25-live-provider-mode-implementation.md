# Live Provider Mode Implementation Plan

> Spec: `docs/superpowers/specs/2026-05-25-live-provider-mode-design.md`
> Branch/worktree: `codex/deckroot-live-api-mode` at `C:\code\deckroot\.worktrees\deckroot-live-api-mode`

## Goal

Turn Deckroot's current fixture-backed MVP into a functional local live API mode:

- Scryfall live mode powers card search, owned-list import resolution, and deck-build card lookup.
- EDHREC live mode is experimental and only enabled when the operator explicitly acknowledges the risk.
- Fixture mode remains the default so onboarding, tests, and demos keep working without credentials or network access.
- API responses expose provider mode and warnings so users can tell when the app used live data, fixture fallback, or an experimental source.

## Constraints

- Respect Scryfall's API expectations: clear `User-Agent`, `Accept: application/json`, local caching, and throttling below 10 requests per second.
- Do not scrape EDHREC pages. Only use the existing third-party API adapter path and require `DECKROOT_EDHREC_LIVE_ACK=true` for live EDHREC attempts.
- Keep tests deterministic by using fake fetch/cache injection where possible.
- Preserve existing fixture behavior and visual UX unless live data requires small copy changes.

## Architecture

### Provider Modes

Environment variables:

```bash
DECKROOT_SCRYFALL_MODE=fixture|live
DECKROOT_EDHREC_MODE=fixture|live
DECKROOT_EDHREC_LIVE_ACK=true|false
DECKROOT_CACHE_DIR=.deckroot-cache
DECKROOT_USER_AGENT="Deckroot/0.1 (mailto:you@example.com)"
```

Default behavior:

- Missing modes default to `fixture`.
- `DECKROOT_SCRYFALL_MODE=live` requires a non-placeholder `DECKROOT_USER_AGENT`.
- `DECKROOT_EDHREC_MODE=live` without `DECKROOT_EDHREC_LIVE_ACK=true` returns fixture EDHREC with a warning.
- Live Scryfall failures surface as controlled API errors for search/import/build card-resolution steps.
- Live EDHREC failures fall back to fixture recommendations with a warning during deck build.

### Runtime Provider Factory

Create `src/domain/providers/runtime-providers.ts`:

```ts
export type ProviderMode = "fixture" | "live";

export type RuntimeProviderMode = {
  scryfall: ProviderMode;
  edhrec: ProviderMode | "fixture-fallback";
};

export type RuntimeProviders = {
  catalog: CardCatalog;
  fixtureCatalog: CardCatalog;
  edhrec: EdhrecProvider;
  fixtureEdhrec: EdhrecProvider;
  mode: RuntimeProviderMode;
  warnings: string[];
};

export type RuntimeProviderOverrides = {
  fetchImpl?: typeof fetch;
  cache?: ProviderCache;
};

export function createRuntimeProviders(
  env?: NodeJS.ProcessEnv,
  overrides?: RuntimeProviderOverrides,
): Result<RuntimeProviders>;
```

Responsibilities:

- Parse provider env values and reject unknown modes with `err("PROVIDER_ERROR", ...)`.
- Validate live Scryfall user agent and reject empty/example/placeholder values.
- Create file cache from `DECKROOT_CACHE_DIR`, defaulting to `.deckroot-cache`.
- Create Scryfall limiter with 200ms spacing and one concurrent request.
- Create EDHREC limiter with 1000ms spacing and one concurrent request.
- Return fixture providers by default.
- Return Scryfall-backed catalog in live Scryfall mode.
- Return EDHREC live provider only when mode is live and ack is true.

### Scryfall/Hybrid Catalog

Create `src/domain/cards/scryfall-catalog.ts`:

```ts
export function createScryfallCardCatalog(options: {
  client: Pick<ScryfallClient, "named" | "search">;
  fallbackCards?: Card[];
  extraCards?: Card[];
}): CardCatalog;

export function createHybridCardCatalog(options: {
  primary: CardCatalog;
  fallbackCards?: Card[];
  extraCards?: Card[];
}): CardCatalog;
```

Behavior:

- `findByName` checks request extras, fallback fixtures, then the live client/primary provider.
- `search` delegates to live Scryfall when available, then merges/de-dupes local fallback matches.
- `allCards` returns a bounded pool: fixtures plus request extras, de-duped by oracle id/name.
- The bounded pool avoids pretending the app can load the entire Scryfall universe into the existing deck assembler.

### API Route Integration

Update routes:

- `src/app/api/cards/search/route.ts`
- `src/app/api/import/route.ts`
- `src/app/api/deck/build/route.ts`

Search route:

- Create runtime providers per request.
- On provider config error, return a controlled JSON error.
- Search against `providers.catalog`.
- Include `providerMode` and `providerWarnings` in successful response.

Import route:

- Create runtime providers per request.
- Parse imported list as today.
- Resolve cards through `providers.catalog`.
- Include `providerMode` and `providerWarnings`.

Deck build route:

- Create runtime providers per request.
- Resolve seed and owned cards through runtime catalog.
- Generate commander candidates.
- If EDHREC live fails, retry candidate generation with fixture EDHREC and append an EDHREC fallback warning.
- Build a request hybrid catalog from fixture cards plus resolved seed, owned cards, candidate commanders, and recommended cards.
- Assemble decks using the hybrid catalog so live recommended/owned cards can appear in final candidates.
- Include `providerMode` and `providerWarnings` in the response.

## Test Plan

Follow red-green-refactor. Write failing tests before implementation.

### Runtime Providers

Create `tests/domain/runtime-providers.test.ts`:

- Defaults to fixture Scryfall and fixture EDHREC.
- Live Scryfall rejects missing user agent.
- Live Scryfall rejects placeholder/example user agent.
- Live Scryfall builds a catalog that calls the injected fetch implementation.
- EDHREC live without acknowledgement returns fixture fallback mode and warning.
- Unknown provider mode returns a provider error.

### Catalogs

Create or extend catalog tests:

- Scryfall catalog `findByName` calls live `named` when local cards miss.
- Scryfall catalog `search` merges live results and fallback cards without duplicates.
- Hybrid catalog `allCards` includes fixture cards and request extras.
- Hybrid catalog de-dupes by oracle id first and normalized name second.

### API Routes

Extend `tests/domain/api-routes.test.ts`:

- `/api/cards/search` in live Scryfall mode returns a fake live card and includes provider mode.
- `/api/import` in live Scryfall mode resolves a fake imported card through Scryfall.
- `/api/deck/build` in live Scryfall mode returns provider mode/warnings without real network access.
- `/api/deck/build` in EDHREC live mode without ack returns fixture fallback warning.
- `/api/deck/build` in EDHREC live mode with a failed fake EDHREC fetch still returns a deck using fixture fallback recommendations and a warning.

## Documentation

Update:

- `.env.example`
- `README.md`
- `docs/provider-compliance.md` if present, otherwise add it.

Document:

- Fixture mode is default.
- How to enable Scryfall live mode locally.
- Required user-agent format.
- Cache directory behavior.
- EDHREC live is experimental and opt-in.
- Live mode testing uses fake network responses; no tests should call third-party services.

## Implementation Steps

1. Add failing provider-factory and catalog tests.
2. Implement `runtime-providers.ts` and `scryfall-catalog.ts`.
3. Run targeted tests and fix until green:

```bash
npm run test -- runtime-providers scryfall-catalog
```

4. Add failing API route tests for live search/import/build.
5. Integrate runtime providers into API routes.
6. Add EDHREC fallback handling in the build route.
7. Run route tests and fix until green:

```bash
npm run test -- api-routes
```

8. Update docs and env example.
9. Run full verification:

```bash
npm run test
npm run build
npm run test:e2e
```

10. Commit all passing implementation changes.

## Manual Local Verification

Fixture mode:

```bash
npm run dev
```

Scryfall live mode:

```bash
$env:DECKROOT_SCRYFALL_MODE="live"
$env:DECKROOT_USER_AGENT="Deckroot/0.1 (mailto:your-email@example.com)"
npm run dev
```

Experimental EDHREC live mode:

```bash
$env:DECKROOT_EDHREC_MODE="live"
$env:DECKROOT_EDHREC_LIVE_ACK="true"
$env:DECKROOT_USER_AGENT="Deckroot/0.1 (mailto:your-email@example.com)"
npm run dev
```

## Review Checklist

- Provider env parsing is explicit and safe.
- No route hardcodes fixture providers except as fallback/default behavior.
- Live mode never performs uncontrolled bulk Scryfall fetches.
- EDHREC live requires acknowledgement and can fall back cleanly.
- API responses make provider mode visible.
- Existing fixture tests still pass.
- No actual third-party requests happen in automated tests.
