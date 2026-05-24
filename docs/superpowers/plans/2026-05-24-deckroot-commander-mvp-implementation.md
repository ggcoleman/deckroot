# Deckroot Commander MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Deckroot Commander MVP: build from a favorite card or owned list, generate ranked Commander candidates, assemble a legal 100-card deck, estimate bracket/power, and produce a budget-aware buy list.

**Architecture:** Use a Next.js App Router app with a pure TypeScript domain core under `src/domain`, API routes under `src/app/api`, and a builder-first React workbench. Scryfall and EDHREC live access sit behind provider interfaces with fixture providers, persistent cache, and rate limiters so tests stay deterministic and provider compliance is explicit.

**Tech Stack:** Next.js, React, TypeScript, Vitest, React Testing Library, Playwright, Zod, `csv-parse`, custom CSS, Node `fetch`, filesystem-backed JSON cache.

---

## MVP Decisions

- Commander only.
- Anonymous sessions only.
- Product name: `Deckroot`.
- Default price currency: USD from Scryfall.
- Owned-list candidate cap: five ranked builds.
- Direct checkout: out of scope; show Scryfall purchase links.
- Default provider mode: fixture-backed demo; live Scryfall/EDHREC enabled by env vars.
- Scryfall live limit: maximum 5 app requests per second with `User-Agent` and `Accept`.
- EDHREC live limit: maximum 1 request per second with seven-day cache and clear attribution.

## File Structure

- `package.json`: scripts and dependencies.
- `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `playwright.config.ts`: app/test config.
- `.env.example`: provider modes, cache path, user agent.
- `.gitignore`: Node, Next, Playwright, local cache, local env.
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`: app shell and design system.
- `src/app/api/cards/search/route.ts`: card search endpoint.
- `src/app/api/import/route.ts`: parse and resolve owned-list imports.
- `src/app/api/deck/build/route.ts`: candidate generation, deck assembly, analysis, buy list.
- `src/app/api/export/route.ts`: text and CSV deck export.
- `src/components/builder/*.tsx`: workbench panels.
- `src/components/ui/*.tsx`: badges, mana pips, meters.
- `src/domain/shared/result.ts`: typed success/failure results.
- `src/domain/shared/cache.ts`: memory and filesystem provider cache.
- `src/domain/shared/rate-limit.ts`: async queue limiter.
- `src/domain/cards/types.ts`: canonical card types.
- `src/domain/cards/scryfall-schema.ts`: Zod schema for Scryfall responses.
- `src/domain/cards/scryfall-client.ts`: live Scryfall client.
- `src/domain/cards/card-catalog.ts`: fixture/live catalog interface.
- `src/domain/import/import-parser.ts`: text and CSV parser.
- `src/domain/import/import-resolver.ts`: imported row normalization.
- `src/domain/edhrec/edhrec-types.ts`: EDHREC response types.
- `src/domain/edhrec/edhrec-provider.ts`: fixture/live EDHREC provider.
- `src/domain/decks/commander-rules.ts`: Commander legality rules.
- `src/domain/decks/role-classifier.ts`: ramp/draw/removal/land/payoff roles.
- `src/domain/decks/commander-suggestions.ts`: commanders for seed/owned cards.
- `src/domain/decks/candidate-generator.ts`: ranked owned-first candidates.
- `src/domain/decks/deck-assembler.ts`: legal 100-card deck assembly.
- `src/domain/decks/deck-analysis.ts`: curve, roles, price, bracket signals.
- `src/domain/decks/buy-list.ts`: missing-card priority list.
- `src/domain/decks/exporter.ts`: text and CSV export.
- `src/domain/decks/demo-fixtures.ts`: deterministic card and deck fixtures.
- `tests/domain/*.test.ts`: unit tests.
- `tests/integration/providers.test.ts`: provider/cache/rate-limit tests.
- `tests/e2e/builder.spec.ts`: browser flows.
- `docs/provider-compliance.md`: Scryfall, EDHREC, Wizards notes.
- `README.md`: local usage and MVP behavior.

---

## Task 1: Scaffold App And Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/globals.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "deckroot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "csv-parse": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install
npx playwright install chromium
```

Expected: `package-lock.json` exists and Playwright Chromium is installed.

- [ ] **Step 3: Add configs**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "skipLibCheck": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } }
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add ignore and env example**

Append to `.gitignore` while preserving `.superpowers/`:

```gitignore
node_modules/
.next/
out/
coverage/
playwright-report/
test-results/
.deckroot-cache/
.env.local
```

Create `.env.example`:

```bash
DECKROOT_APP_URL=http://127.0.0.1:3000
DECKROOT_SCRYFALL_MODE=fixture
DECKROOT_EDHREC_MODE=fixture
DECKROOT_CACHE_DIR=.deckroot-cache
DECKROOT_USER_AGENT=Deckroot/0.1 contact@example.com
```

- [ ] **Step 5: Add first app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Deckroot Commander Builder",
  description: "Build budget-aware Commander decks from a card or owned list."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="workbenchShell">
      <section className="heroPanel" aria-labelledby="deckroot-title">
        <p className="eyebrow">Commander MVP</p>
        <h1 id="deckroot-title">Deckroot</h1>
        <p className="lede">Build from a favorite card or the pile you already own.</p>
      </section>
    </main>
  );
}
```

Create `src/styles/globals.css`:

```css
:root {
  --paper: #f4efe4;
  --paper-deep: #e5dccb;
  --ink: #1d1a16;
  --muted: #6c6256;
  --line: #cbbfae;
  --white: #fffaf0;
  --accent-w: #d9c77f;
  --accent-u: #648aa8;
  --accent-b: #6f6372;
  --accent-r: #a85f48;
  --accent-g: #627f55;
  --radius-sm: 6px;
  --radius-md: 8px;
  --shadow: 0 18px 45px rgb(29 26 22 / 10%);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: Aptos, "Segoe UI", sans-serif;
}

.workbenchShell { min-height: 100vh; padding: 24px; }

.heroPanel {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--white);
  box-shadow: var(--shadow);
  padding: 32px;
}

.eyebrow {
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3rem, 8vw, 6rem);
  line-height: 0.9;
  margin: 0;
}

.lede {
  max-width: 680px;
  color: var(--muted);
  font-size: 1.1rem;
}
```

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm run test
npm run build
git add package.json package-lock.json tsconfig.json next.config.mjs vitest.config.ts playwright.config.ts tests/setup.ts .gitignore .env.example src/app/layout.tsx src/app/page.tsx src/styles/globals.css
git commit -m "chore: scaffold deckroot app"
```

Expected: Vitest runs without import errors, Next builds, and the scaffold commit succeeds.

---

## Task 2: Add Provider Infrastructure And Card Fixtures

**Files:**
- Create: `src/domain/shared/result.ts`
- Create: `src/domain/shared/cache.ts`
- Create: `src/domain/shared/rate-limit.ts`
- Create: `src/domain/cards/types.ts`
- Create: `src/domain/decks/demo-fixtures.ts`
- Create: `tests/integration/providers.test.ts`

- [ ] **Step 1: Write failing infrastructure tests**

Create `tests/integration/providers.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createMemoryCache } from "@/domain/shared/cache";
import { createRateLimiter } from "@/domain/shared/rate-limit";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("provider infrastructure", () => {
  it("stores, reuses, and expires cached JSON values", async () => {
    const cache = createMemoryCache();
    await cache.set("scryfall", "sol-ring", { name: "Sol Ring" }, 2);
    await expect(cache.get("scryfall", "sol-ring")).resolves.toEqual({ name: "Sol Ring" });
    await sleep(5);
    await expect(cache.get("scryfall", "sol-ring")).resolves.toBeNull();
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
    vi.useRealTimers();
  });
});
```

Run:

```powershell
npm run test -- tests/integration/providers.test.ts
```

Expected: FAIL because shared infrastructure files do not exist.

- [ ] **Step 2: Implement `result.ts`**

```ts
export type AppErrorCode =
  | "PARSE_ERROR"
  | "CARD_NOT_FOUND"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "INVALID_COMMANDER"
  | "DECK_CONSTRAINT_FAILED";

export type AppError = { code: AppErrorCode; message: string; details?: Record<string, unknown> };
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err(code: AppErrorCode, message: string, details?: Record<string, unknown>): Result<never> {
  return { ok: false, error: { code, message, details } };
}
```

- [ ] **Step 3: Implement cache and rate limiter**

Create `src/domain/shared/cache.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type ProviderCache = {
  get<T>(provider: string, key: string): Promise<T | null>;
  set<T>(provider: string, key: string, value: T, ttlMs: number): Promise<void>;
};

type Entry = { expiresAt: number; value: unknown };
const safeKey = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "_");

export function createMemoryCache(now: () => number = () => Date.now()): ProviderCache {
  const entries = new Map<string, Entry>();
  const id = (provider: string, key: string) => `${provider}:${key}`;
  return {
    async get<T>(provider, key) {
      const entry = entries.get(id(provider, key));
      if (!entry || entry.expiresAt <= now()) return null;
      return entry.value as T;
    },
    async set(provider, key, value, ttlMs) {
      entries.set(id(provider, key), { expiresAt: now() + ttlMs, value });
    }
  };
}

export function createFileCache(rootDir: string, now: () => number = () => Date.now()): ProviderCache {
  return {
    async get<T>(provider, key) {
      const filePath = join(rootDir, safeKey(provider), `${safeKey(key)}.json`);
      try {
        const entry = JSON.parse(await readFile(filePath, "utf8")) as Entry;
        if (entry.expiresAt <= now()) return null;
        return entry.value as T;
      } catch {
        return null;
      }
    },
    async set(provider, key, value, ttlMs) {
      const filePath = join(rootDir, safeKey(provider), `${safeKey(key)}.json`);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify({ expiresAt: now() + ttlMs, value }, null, 2));
    }
  };
}
```

Create `src/domain/shared/rate-limit.ts`:

```ts
export type RateLimiterOptions = { intervalMs: number; maxConcurrent: number };
export type RateLimiter = { schedule<T>(work: () => Promise<T>): Promise<T> };

type QueueItem<T> = {
  work: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const queue: QueueItem<unknown>[] = [];
  let running = 0;
  let lastStart = 0;

  const pump = () => {
    if (running >= options.maxConcurrent || queue.length === 0) return;
    const delay = Math.max(0, options.intervalMs - (Date.now() - lastStart));
    setTimeout(() => {
      const item = queue.shift();
      if (!item) return;
      running += 1;
      lastStart = Date.now();
      item.work()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          running -= 1;
          pump();
        });
    }, delay);
  };

  return {
    schedule<T>(work: () => Promise<T>) {
      return new Promise<T>((resolve, reject) => {
        queue.push({ work, resolve: resolve as (value: unknown) => void, reject });
        pump();
      });
    }
  };
}
```

- [ ] **Step 4: Add card types and fixtures**

Create `src/domain/cards/types.ts`:

```ts
export type Color = "W" | "U" | "B" | "R" | "G";
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
  producedMana?: Color[];
};
```

Create `src/domain/decks/demo-fixtures.ts` with a helper `fixtureCard(name: string): Card`, an array `fixtureCards`, and a `fixtureDeck()` that returns a valid Esper Commander fixture. Include at least these names: `Alela, Artful Provocateur`, `Sol Ring`, `Arcane Signet`, `Command Tower`, `Swords to Plowshares`, `Counterspell`, `Phyrexian Arena`, `Bitterblossom`, `Island`, `Plains`, `Swamp`, `Azorius Signet`, `Orzhov Signet`, `Dimir Signet`, `Path to Exile`, `Damn`, `Reconnaissance Mission`, `Favorable Winds`, `Anointed Procession`, `Watery Grave`, `Godless Shrine`, `Hallowed Fountain`. Basic lands must allow repeated copies through their names.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run test -- tests/integration/providers.test.ts
git add src/domain/shared src/domain/cards/types.ts src/domain/decks/demo-fixtures.ts tests/integration/providers.test.ts
git commit -m "feat: add provider infrastructure and card fixtures"
```

Expected: PASS and commit succeeds.

---

## Task 3: Parse And Resolve Owned Lists

**Files:**
- Create: `src/domain/import/import-parser.ts`
- Create: `src/domain/import/import-resolver.ts`
- Create: `src/domain/cards/card-catalog.ts`
- Create: `tests/domain/import-parser.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `tests/domain/import-parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { parseImportedList } from "@/domain/import/import-parser";
import { resolveImportedRows } from "@/domain/import/import-resolver";

describe("owned-list import", () => {
  it("parses plain text quantities and commander marker", () => {
    const result = parseImportedList("1 Sol Ring\n2 Island\nCommander: Alela, Artful Provocateur");
    expect(result.rows).toMatchObject([
      { quantity: 1, name: "Sol Ring", sourceSection: "main", commander: false },
      { quantity: 2, name: "Island", sourceSection: "main", commander: false },
      { quantity: 1, name: "Alela, Artful Provocateur", sourceSection: "commander", commander: true }
    ]);
  });

  it("parses ManaBox CSV exports", () => {
    const csv = "Name,Quantity,Set code,Collector number\nSol Ring,1,CMM,400\nIsland,10,DMU,278";
    expect(parseImportedList(csv).rows).toMatchObject([
      { quantity: 1, name: "Sol Ring", setCode: "CMM", collectorNumber: "400" },
      { quantity: 10, name: "Island", setCode: "DMU", collectorNumber: "278" }
    ]);
  });

  it("keeps malformed rows as warnings", () => {
    const result = parseImportedList("1 Sol Ring\nnot a usable row ###\n1 Arcane Signet");
    expect(result.rows.map((row) => row.name)).toEqual(["Sol Ring", "Arcane Signet"]);
    expect(result.warnings).toEqual([{ line: 2, raw: "not a usable row ###", message: "Could not parse a quantity and card name." }]);
  });

  it("resolves rows through fixture catalog", async () => {
    const parsed = parseImportedList("1 sol ring\n1 Alela, Artful Provocateur");
    const resolved = await resolveImportedRows(parsed.rows, createFixtureCardCatalog());
    expect(resolved.cards.map((row) => row.card.name)).toEqual(["Sol Ring", "Alela, Artful Provocateur"]);
    expect(resolved.unresolved).toEqual([]);
  });
});
```

Run:

```powershell
npm run test -- tests/domain/import-parser.test.ts
```

Expected: FAIL because import and catalog modules do not exist.

- [ ] **Step 2: Implement catalog and resolver**

Create `src/domain/cards/card-catalog.ts`:

```ts
import type { Card } from "@/domain/cards/types";
import { fixtureCards } from "@/domain/decks/demo-fixtures";

export type CardSearchResult = Pick<Card, "id" | "name" | "manaCost" | "typeLine" | "colorIdentity" | "imageUrl">;

export type CardCatalog = {
  findByName(name: string): Promise<Card | null>;
  search(query: string): Promise<CardSearchResult[]>;
  allCards(): Promise<Card[]>;
};

export function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function createFixtureCardCatalog(cards: Card[] = fixtureCards): CardCatalog {
  const byName = new Map(cards.map((card) => [normalize(card.name), card]));
  return {
    async findByName(name) {
      return byName.get(normalize(name)) ?? null;
    },
    async search(query) {
      const needle = normalize(query);
      return cards
        .filter((card) => normalize(card.name).includes(needle))
        .slice(0, 20)
        .map(({ id, name, manaCost, typeLine, colorIdentity, imageUrl }) => ({ id, name, manaCost, typeLine, colorIdentity, imageUrl }));
    },
    async allCards() {
      return cards;
    }
  };
}
```

Create `src/domain/import/import-resolver.ts`:

```ts
import type { Card } from "@/domain/cards/types";
import type { CardCatalog } from "@/domain/cards/card-catalog";
import type { ImportedRow } from "@/domain/import/import-parser";

export type ResolvedImportedCard = ImportedRow & { card: Card; confidence: "exact" };
export type ImportResolveResult = { cards: ResolvedImportedCard[]; unresolved: ImportedRow[] };

export async function resolveImportedRows(rows: ImportedRow[], catalog: CardCatalog): Promise<ImportResolveResult> {
  const cards: ResolvedImportedCard[] = [];
  const unresolved: ImportedRow[] = [];
  for (const row of rows) {
    const card = await catalog.findByName(row.name);
    if (card) cards.push({ ...row, card, confidence: "exact" });
    else unresolved.push(row);
  }
  return { cards, unresolved };
}
```

- [ ] **Step 3: Implement parser**

Create `src/domain/import/import-parser.ts`:

```ts
import { parse } from "csv-parse/sync";

export type ImportedRow = {
  line: number;
  raw: string;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  sourceSection: string;
  commander: boolean;
};

export type ImportWarning = { line: number; raw: string; message: string };
export type ImportParseResult = { rows: ImportedRow[]; warnings: ImportWarning[]; detectedFormat: "csv" | "text" };

const sections = new Set(["commander", "creatures", "instants", "sorceries", "artifacts", "enchantments", "planeswalkers", "lands"]);

export function parseImportedList(input: string): ImportParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { rows: [], warnings: [], detectedFormat: "text" };
  return looksLikeCsv(trimmed) ? parseCsv(trimmed) : parseText(trimmed);
}

function looksLikeCsv(input: string): boolean {
  const first = input.split(/\r?\n/, 1)[0].toLowerCase();
  return first.includes("name") && (first.includes("quantity") || first.includes("count"));
}

function parseCsv(input: string): ImportParseResult {
  const records = parse(input, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const rows: ImportedRow[] = [];
  const warnings: ImportWarning[] = [];
  records.forEach((record, index) => {
    const name = pick(record, ["Name", "Card Name", "name", "card"]);
    const quantity = Number.parseInt(pick(record, ["Quantity", "Count", "quantity", "count"]) ?? "1", 10);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) {
      warnings.push({ line: index + 2, raw: JSON.stringify(record), message: "Could not parse CSV card name and quantity." });
      return;
    }
    const section = normalizeSection(pick(record, ["Section", "Category", "section"]) ?? "main");
    rows.push({
      line: index + 2,
      raw: JSON.stringify(record),
      quantity,
      name,
      setCode: pick(record, ["Set code", "Set", "set"]),
      collectorNumber: pick(record, ["Collector number", "Collector Number", "Number"]),
      sourceSection: section,
      commander: section === "commander"
    });
  });
  return { rows, warnings, detectedFormat: "csv" };
}

function parseText(input: string): ImportParseResult {
  const rows: ImportedRow[] = [];
  const warnings: ImportWarning[] = [];
  let currentSection = "main";
  input.split(/\r?\n/).forEach((lineText, index) => {
    const raw = lineText.trim();
    const line = index + 1;
    if (!raw) return;
    const section = normalizeSection(raw.replace(/:$/, ""));
    if (sections.has(section)) {
      currentSection = section;
      return;
    }
    const commanderPrefix = raw.match(/^commander:\s*(.+)$/i);
    if (commanderPrefix) {
      rows.push({ line, raw, quantity: 1, name: commanderPrefix[1].trim(), sourceSection: "commander", commander: true });
      return;
    }
    const match = raw.match(/^(\d+)\s+x?\s*(.+?)(?:\s+\(([A-Z0-9]{2,5})\)\s*(\S+))?$/i);
    if (!match) {
      warnings.push({ line, raw, message: "Could not parse a quantity and card name." });
      return;
    }
    rows.push({
      line,
      raw,
      quantity: Number.parseInt(match[1], 10),
      name: match[2].trim(),
      setCode: match[3],
      collectorNumber: match[4],
      sourceSection: currentSection,
      commander: currentSection === "commander"
    });
  });
  return { rows, warnings, detectedFormat: "text" };
}

function pick(record: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function normalizeSection(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
```

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run test -- tests/domain/import-parser.test.ts
git add src/domain/import src/domain/cards/card-catalog.ts tests/domain/import-parser.test.ts
git commit -m "feat: parse and resolve owned lists"
```

Expected: PASS and commit succeeds.

---

## Task 4: Implement Commander Rules, Roles, And Providers

**Files:**
- Create: `src/domain/decks/commander-rules.ts`
- Create: `src/domain/decks/role-classifier.ts`
- Create: `src/domain/cards/scryfall-schema.ts`
- Create: `src/domain/cards/scryfall-client.ts`
- Create: `src/domain/edhrec/edhrec-types.ts`
- Create: `src/domain/edhrec/edhrec-provider.ts`
- Create: `tests/domain/commander-rules.test.ts`
- Modify: `tests/integration/providers.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/domain/commander-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fixtureCard } from "@/domain/decks/demo-fixtures";
import { canBeCommander, isCommanderLegalInIdentity, validateCommanderDeck } from "@/domain/decks/commander-rules";
import { classifyRole } from "@/domain/decks/role-classifier";

describe("commander rules and roles", () => {
  it("accepts legendary creatures and rejects artifacts as commanders", () => {
    expect(canBeCommander(fixtureCard("Alela, Artful Provocateur"))).toBe(true);
    expect(canBeCommander(fixtureCard("Sol Ring"))).toBe(false);
  });

  it("rejects cards outside commander color identity", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const redCard = { ...fixtureCard("Swords to Plowshares"), id: "bolt", name: "Lightning Bolt", colorIdentity: ["R" as const] };
    expect(isCommanderLegalInIdentity(redCard, commander)).toBe(false);
  });

  it("rejects duplicate non-basic cards", () => {
    const commander = fixtureCard("Alela, Artful Provocateur");
    const result = validateCommanderDeck({ commander, cards: [commander, fixtureCard("Sol Ring"), fixtureCard("Sol Ring")] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Duplicate non-basic card: Sol Ring");
  });

  it("classifies common roles", () => {
    expect(classifyRole(fixtureCard("Sol Ring"))).toContain("ramp");
    expect(classifyRole(fixtureCard("Swords to Plowshares"))).toContain("removal");
    expect(classifyRole(fixtureCard("Phyrexian Arena"))).toContain("draw");
  });
});
```

Append to `tests/integration/providers.test.ts`:

```ts
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";

describe("edhrec fixture provider", () => {
  it("returns deterministic commander recommendations", async () => {
    const provider = createFixtureEdhrecProvider(createFixtureCardCatalog());
    const recs = await provider.getCommanderRecommendations({ commanderName: "Alela, Artful Provocateur", seedNames: ["Sol Ring"] });
    expect(recs.source).toBe("fixture");
    expect(recs.cards[0].name).toBe("Sol Ring");
    expect(recs.attributionUrl).toContain("edhrec.com");
  });
});
```

Run:

```powershell
npm run test -- tests/domain/commander-rules.test.ts tests/integration/providers.test.ts
```

Expected: FAIL because rules, roles, and EDHREC provider files do not exist.

- [ ] **Step 2: Implement Commander rules and role classifier**

Create `src/domain/decks/commander-rules.ts`:

```ts
import type { Card, Color } from "@/domain/cards/types";
import { err, ok, type Result } from "@/domain/shared/result";

const basicLandNames = new Set(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]);

export function canBeCommander(card: Card): boolean {
  const text = `${card.typeLine}\n${card.oracleText}`.toLowerCase();
  return card.legalities.commander === "legal" && (text.includes("legendary creature") || text.includes("can be your commander"));
}

export function isCommanderLegalInIdentity(card: Card, commander: Card): boolean {
  const commanderColors = new Set<Color>(commander.colorIdentity);
  return card.colorIdentity.every((color) => commanderColors.has(color));
}

export function allowsMultipleCopies(card: Card): boolean {
  return basicLandNames.has(card.name) || /deck can have any number of cards named/i.test(card.oracleText);
}

export function validateCommanderDeck(input: { commander: Card; cards: Card[] }): Result<true> {
  if (!canBeCommander(input.commander)) return err("INVALID_COMMANDER", `${input.commander.name} is not a legal Commander choice.`);
  if (input.cards.length !== 100) return err("DECK_CONSTRAINT_FAILED", `Commander decks must contain exactly 100 cards including commander; found ${input.cards.length}.`);
  const seen = new Set<string>();
  for (const card of input.cards) {
    if (card.legalities.commander !== "legal") return err("DECK_CONSTRAINT_FAILED", `${card.name} is not Commander legal.`);
    if (!isCommanderLegalInIdentity(card, input.commander)) return err("DECK_CONSTRAINT_FAILED", `${card.name} is outside ${input.commander.name}'s color identity.`);
    if (!allowsMultipleCopies(card) && seen.has(card.oracleId)) return err("DECK_CONSTRAINT_FAILED", `Duplicate non-basic card: ${card.name}.`);
    seen.add(card.oracleId);
  }
  return ok(true);
}
```

Create `src/domain/decks/role-classifier.ts`:

```ts
import type { Card } from "@/domain/cards/types";

export type DeckRole = "land" | "ramp" | "draw" | "removal" | "wipe" | "protection" | "recursion" | "payoff" | "utility";

export function classifyRole(card: Card): DeckRole[] {
  const text = `${card.typeLine}\n${card.oracleText}`.toLowerCase();
  const roles = new Set<DeckRole>();
  if (text.includes("land")) roles.add("land");
  if (text.includes("add ") && (text.includes("mana") || card.producedMana?.length)) roles.add("ramp");
  if (/draw (a|two|three|x|that many|cards?)/.test(text)) roles.add("draw");
  if (/(destroy|exile|counter target|return target).*(creature|artifact|enchantment|spell|permanent)/.test(text)) roles.add("removal");
  if (/(destroy|exile).*(all|each).*(creatures|permanents|artifacts|enchantments)/.test(text)) roles.add("wipe");
  if (/(hexproof|indestructible|protection from|phase out)/.test(text)) roles.add("protection");
  if (/(return target.*from your graveyard|reanimate|flashback|escape)/.test(text)) roles.add("recursion");
  if (/(whenever|tokens?|double|win the game|each opponent loses|combat damage to a player)/.test(text) && !roles.has("land")) roles.add("payoff");
  if (roles.size === 0) roles.add("utility");
  return [...roles];
}
```

- [ ] **Step 3: Implement Scryfall and EDHREC adapters**

Create `src/domain/cards/scryfall-schema.ts` with Zod fields: `id`, `oracle_id`, `name`, `mana_cost`, `cmc`, `color_identity`, `type_line`, `oracle_text`, `legalities`, `edhrec_rank`, `game_changer`, `prices`, `purchase_uris`, `image_uris`, `card_faces`, `produced_mana`.

Create `src/domain/cards/scryfall-client.ts` with exports `createScryfallClient(options)` and `normalizeScryfallCard(raw)`. The client must cache `search:${query}` for one hour, cache `named:${name}` for one day, send `Accept: application/json`, send configured `User-Agent`, schedule every fetch through `RateLimiter`, map Scryfall prices to numbers, and use first card-face image when `image_uris.normal` is absent.

Create `src/domain/edhrec/edhrec-types.ts`:

```ts
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
```

Create `src/domain/edhrec/edhrec-provider.ts` with `createFixtureEdhrecProvider(catalog)` returning recommendations for `Sol Ring`, `Arcane Signet`, `Command Tower`, `Bitterblossom`, `Reconnaissance Mission`, `Favorable Winds`, `Anointed Procession`, `Swords to Plowshares`, `Counterspell`, `Phyrexian Arena`, `Damn`, `Azorius Signet`, `Orzhov Signet`, and `Dimir Signet`. Also export `createLiveEdhrecProvider({ catalog, cache, limiter, userAgent, fetchImpl })`, which posts to `https://edhrec.com/api/recs`, caches by commander/partner/seeds for seven days, maps `inRecs` to catalog cards, and returns cached responses with `source: "cache"`.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run test -- tests/domain/commander-rules.test.ts tests/integration/providers.test.ts
git add src/domain/decks/commander-rules.ts src/domain/decks/role-classifier.ts src/domain/cards/scryfall-schema.ts src/domain/cards/scryfall-client.ts src/domain/edhrec tests/domain/commander-rules.test.ts tests/integration/providers.test.ts
git commit -m "feat: add commander rules and providers"
```

Expected: PASS and commit succeeds.

---

## Task 5: Generate Candidates And Assemble Decks

**Files:**
- Create: `src/domain/decks/commander-suggestions.ts`
- Create: `src/domain/decks/candidate-generator.ts`
- Create: `src/domain/decks/deck-assembler.ts`
- Create: `tests/domain/candidate-generator.test.ts`
- Create: `tests/domain/deck-assembler.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/domain/candidate-generator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { fixtureCard } from "@/domain/decks/demo-fixtures";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";

describe("generateCommanderCandidates", () => {
  it("ranks coherent owned synergy above raw pile size", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const owned = ["Alela, Artful Provocateur", "Sol Ring", "Arcane Signet", "Command Tower", "Bitterblossom", "Counterspell"].map(fixtureCard);
    const candidates = await generateCommanderCandidates({ ownedCards: owned, targetBracket: 2, budgetUsd: 60, catalog, edhrec });
    expect(candidates[0].commanderName).toBe("Alela, Artful Provocateur");
    expect(candidates[0].ownedSynergyCount).toBeGreaterThanOrEqual(4);
    expect(candidates[0].reasons.join(" ")).toContain("owned synergy cards");
  });

  it("suggests a commander for a non-commander seed card", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const candidates = await generateCommanderCandidates({ seedCard: fixtureCard("Bitterblossom"), ownedCards: [], targetBracket: 2, budgetUsd: 80, catalog, edhrec });
    expect(candidates[0].commanderName).toBe("Alela, Artful Provocateur");
  });
});
```

Create `tests/domain/deck-assembler.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";
import { assembleCommanderDeck } from "@/domain/decks/deck-assembler";
import { fixtureCard } from "@/domain/decks/demo-fixtures";

describe("assembleCommanderDeck", () => {
  it("builds exactly 100 legal cards including commander", async () => {
    const catalog = createFixtureCardCatalog();
    const edhrec = createFixtureEdhrecProvider(catalog);
    const ownedCards = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const [candidate] = await generateCommanderCandidates({ ownedCards, targetBracket: 2, budgetUsd: 75, catalog, edhrec });
    const deck = await assembleCommanderDeck({ candidate, ownedCards, budgetUsd: 75, catalog });
    expect(deck.cards).toHaveLength(100);
    expect(deck.cards[0].card.name).toBe("Alela, Artful Provocateur");
    expect(deck.validation.ok).toBe(true);
  });
});
```

Run:

```powershell
npm run test -- tests/domain/candidate-generator.test.ts tests/domain/deck-assembler.test.ts
```

Expected: FAIL because candidate and assembly modules do not exist.

- [ ] **Step 2: Implement suggestions and candidates**

Create `src/domain/decks/commander-suggestions.ts` to return owned legal commanders first; if no owned commander exists, return legal commanders from catalog whose color identity contains the seed card's colors. Sort by lower `edhrecRank` and cap at five.

Create `src/domain/decks/candidate-generator.ts` with type:

```ts
export type DeckCandidate = {
  id: string;
  commanderName: string;
  commander: Card;
  theme: string;
  score: number;
  ownedCount: number;
  ownedSynergyCount: number;
  missingEstimatedUsd: number;
  targetBracket: number;
  reasons: string[];
  recommendedCards: Card[];
};
```

Scoring formula:

```ts
const score = ownedSynergyCount * 12 + legalOwned.length * 3 - Math.max(0, missingEstimatedUsd - budgetUsd) * 0.6;
```

Theme inference:

```ts
if (text.includes("faerie") || text.includes("flying")) return "Esper flying tokens";
if (text.includes("graveyard")) return "graveyard value";
if (text.includes("artifact")) return "artifact value";
return "balanced value";
```

- [ ] **Step 3: Implement deck assembler**

Create `src/domain/decks/deck-assembler.ts` with:

```ts
export type DeckCardEntry = {
  card: Card;
  quantity: number;
  ownedQuantity: number;
  role: DeckRole[];
  sourceReason: string;
};

export type AssembledDeck = {
  commander: Card;
  cards: DeckCardEntry[];
  validation: ReturnType<typeof validateCommanderDeck>;
};
```

Assembly order:

```text
1. Add commander.
2. Add legal owned cards in commander color identity.
3. Add EDHREC recommended cards within budget.
4. Fill ramp to 10, draw to 10, targeted removal to 8, wipes to 2.
5. Fill lands to 37 using nonbasic lands first and repeated legal basics.
6. Fill remaining slots with legal utility/payoff cards within budget.
7. Validate exactly 100 cards including commander.
```

Use `allowsMultipleCopies` only for basics and cards with explicit text allowing extra copies. If fixture assembly cannot reach 100 cards, expand `fixtureCards` with more legal Esper cards and repeated basics rather than relaxing singleton rules.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run test -- tests/domain/candidate-generator.test.ts tests/domain/deck-assembler.test.ts
git add src/domain/decks/commander-suggestions.ts src/domain/decks/candidate-generator.ts src/domain/decks/deck-assembler.ts src/domain/decks/demo-fixtures.ts tests/domain/candidate-generator.test.ts tests/domain/deck-assembler.test.ts
git commit -m "feat: generate and assemble commander decks"
```

Expected: PASS and commit succeeds.

---

## Task 6: Analyze Decks, Buy Lists, And Exports

**Files:**
- Create: `src/domain/decks/deck-analysis.ts`
- Create: `src/domain/decks/buy-list.ts`
- Create: `src/domain/decks/exporter.ts`
- Create: `tests/domain/deck-analysis.test.ts`
- Create: `tests/domain/buy-list.test.ts`
- Create: `tests/domain/exporter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/domain/deck-analysis.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { analyzeDeck } from "@/domain/decks/deck-analysis";
import { fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("analyzeDeck", () => {
  it("summarizes curve, roles, price, and bracket reasons", () => {
    const analysis = analyzeDeck(fixtureDeck());
    expect(analysis.roles.land).toBeGreaterThanOrEqual(34);
    expect(analysis.estimatedPriceUsd).toBeGreaterThan(0);
    expect(analysis.bracket.recommended).toBeGreaterThanOrEqual(1);
    expect(analysis.bracket.reasons.join(" ")).toContain("Rule Zero");
  });
});
```

Create `tests/domain/buy-list.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildBuyList } from "@/domain/decks/buy-list";
import { fixtureCard, fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("buildBuyList", () => {
  it("prioritizes missing functional cards within budget", () => {
    const owned = ["Alela, Artful Provocateur", "Sol Ring", "Command Tower"].map(fixtureCard);
    const buyList = buildBuyList({ deck: fixtureDeck(), ownedCards: owned, budgetUsd: 40 });
    expect(buyList.items[0].priority).toMatch(/Required|High-impact/);
    expect(buyList.totalSelectedUsd).toBeLessThanOrEqual(40);
  });
});
```

Create `tests/domain/exporter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { exportDeckAsCsv, exportDeckAsText } from "@/domain/decks/exporter";
import { fixtureDeck } from "@/domain/decks/demo-fixtures";

describe("deck exporter", () => {
  it("exports commander and main deck sections", () => {
    expect(exportDeckAsText(fixtureDeck())).toContain("Commander\n1 Alela, Artful Provocateur");
  });

  it("exports CSV columns", () => {
    expect(exportDeckAsCsv(fixtureDeck()).split("\n")[0]).toBe("Quantity,Name,Role,Owned Quantity,Estimated USD");
  });
});
```

Run:

```powershell
npm run test -- tests/domain/deck-analysis.test.ts tests/domain/buy-list.test.ts tests/domain/exporter.test.ts
```

Expected: FAIL because analysis, buy-list, and exporter modules do not exist.

- [ ] **Step 2: Implement analysis**

Create `src/domain/decks/deck-analysis.ts` to return:

```ts
export type BracketEstimate = {
  recommended: 1 | 2 | 3 | 4 | 5;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  ruleZeroNotes: string[];
};

export type DeckAnalysis = {
  curve: Record<number, number>;
  averageManaValue: number;
  roles: Record<DeckRole, number>;
  estimatedPriceUsd: number;
  gameChangerCount: number;
  bracket: BracketEstimate;
};
```

Bracket signal rules:

```text
Start at bracket 2.
If Game Changer count is 1 or 2, raise to bracket 3.
If Game Changer count is 3 or more, raise to bracket 4.
If fast mana count is 2 or more, raise to at least bracket 4.
If tutor count is 4 or more, raise to at least bracket 4.
If ramp or draw is below 8, include a confidence warning.
Always include a reason that says bracket estimates are Rule Zero conversation aids.
```

- [ ] **Step 3: Implement buy list and exporter**

Create `src/domain/decks/buy-list.ts` with priority rules:

```text
Land or ramp role -> Required.
Draw or removal role -> High-impact.
Price >= 15 USD and not Required/High-impact -> Optimization.
Everything else -> Nice-to-have.
```

Sort by priority weight then price ascending. Mark `selectedWithinBudget` true until adding another card would exceed `budgetUsd`.

Create `src/domain/decks/exporter.ts`:

```ts
import type { AssembledDeck } from "@/domain/decks/deck-assembler";

export function exportDeckAsText(deck: AssembledDeck): string {
  const commander = deck.cards[0];
  const body = deck.cards.slice(1).map((entry) => `1 ${entry.card.name}`).join("\n");
  return `Commander\n1 ${commander.card.name}\n\nDeck\n${body}\n`;
}

export function exportDeckAsCsv(deck: AssembledDeck): string {
  const rows = deck.cards.map((entry) =>
    [entry.quantity, quote(entry.card.name), quote(entry.role.join("/")), entry.ownedQuantity, entry.card.prices.usd ?? ""].join(",")
  );
  return ["Quantity,Name,Role,Owned Quantity,Estimated USD", ...rows].join("\n");
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
```

- [ ] **Step 4: Verify and commit**

Run:

```powershell
npm run test -- tests/domain/deck-analysis.test.ts tests/domain/buy-list.test.ts tests/domain/exporter.test.ts
git add src/domain/decks/deck-analysis.ts src/domain/decks/buy-list.ts src/domain/decks/exporter.ts tests/domain/deck-analysis.test.ts tests/domain/buy-list.test.ts tests/domain/exporter.test.ts
git commit -m "feat: analyze decks and prioritize buys"
```

Expected: PASS and commit succeeds.

---

## Task 7: Add API Routes

**Files:**
- Create: `src/app/api/cards/search/route.ts`
- Create: `src/app/api/import/route.ts`
- Create: `src/app/api/deck/build/route.ts`
- Create: `src/app/api/export/route.ts`

- [ ] **Step 1: Add card search route**

Create `src/app/api/cards/search/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length < 2) return NextResponse.json({ cards: [] });
  const cards = await createFixtureCardCatalog().search(query);
  return NextResponse.json({ cards });
}
```

- [ ] **Step 2: Add import route**

Create `src/app/api/import/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { parseImportedList } from "@/domain/import/import-parser";
import { resolveImportedRows } from "@/domain/import/import-resolver";

export async function POST(request: Request) {
  const body = (await request.json()) as { input?: string };
  const parsed = parseImportedList(body.input ?? "");
  const resolved = await resolveImportedRows(parsed.rows, createFixtureCardCatalog());
  return NextResponse.json({ parsed, resolved });
}
```

- [ ] **Step 3: Add build route**

Create `src/app/api/deck/build/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createFixtureCardCatalog } from "@/domain/cards/card-catalog";
import { createFixtureEdhrecProvider } from "@/domain/edhrec/edhrec-provider";
import { generateCommanderCandidates } from "@/domain/decks/candidate-generator";
import { assembleCommanderDeck } from "@/domain/decks/deck-assembler";
import { analyzeDeck } from "@/domain/decks/deck-analysis";
import { buildBuyList } from "@/domain/decks/buy-list";

export async function POST(request: Request) {
  const body = (await request.json()) as { seedCardName?: string; ownedCardNames?: string[]; targetBracket?: number; budgetUsd?: number };
  const catalog = createFixtureCardCatalog();
  const edhrec = createFixtureEdhrecProvider(catalog);
  const ownedCards = [];
  for (const name of body.ownedCardNames ?? []) {
    const card = await catalog.findByName(name);
    if (card) ownedCards.push(card);
  }
  const seedCard = body.seedCardName ? await catalog.findByName(body.seedCardName) : undefined;
  const candidates = await generateCommanderCandidates({
    seedCard: seedCard ?? undefined,
    ownedCards,
    targetBracket: body.targetBracket ?? 2,
    budgetUsd: body.budgetUsd ?? 75,
    catalog,
    edhrec
  });
  const deck = candidates[0] ? await assembleCommanderDeck({ candidate: candidates[0], ownedCards, budgetUsd: body.budgetUsd ?? 75, catalog }) : null;
  const analysis = deck ? analyzeDeck(deck) : null;
  const buyList = deck ? buildBuyList({ deck, ownedCards, budgetUsd: body.budgetUsd ?? 75 }) : null;
  return NextResponse.json({ candidates, deck, analysis, buyList });
}
```

- [ ] **Step 4: Add export route**

Create `src/app/api/export/route.ts`:

```ts
import { NextResponse } from "next/server";
import { exportDeckAsCsv, exportDeckAsText } from "@/domain/decks/exporter";

export async function POST(request: Request) {
  const body = (await request.json()) as { deck: Parameters<typeof exportDeckAsText>[0]; format?: "text" | "csv" };
  const content = body.format === "csv" ? exportDeckAsCsv(body.deck) : exportDeckAsText(body.deck);
  return NextResponse.json({ content });
}
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run test
npm run build
git add src/app/api
git commit -m "feat: expose deck builder api"
```

Expected: all tests pass, Next builds, and commit succeeds.

---

## Task 8: Build Workbench UI

**Files:**
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/ManaPip.tsx`
- Create: `src/components/ui/Meter.tsx`
- Create: `src/components/builder/BuilderShell.tsx`
- Create: `src/components/builder/LeftRail.tsx`
- Create: `src/components/builder/CardSearch.tsx`
- Create: `src/components/builder/OwnedListImporter.tsx`
- Create: `src/components/builder/CandidateBoard.tsx`
- Create: `src/components/builder/DeckWorkspace.tsx`
- Create: `src/components/builder/BuyRail.tsx`
- Create: `src/components/builder/ExportMenu.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/styles/globals.css`
- Create: `tests/e2e/builder.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

Create `tests/e2e/builder.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("builds a Commander deck from a seed card", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Card or commander").fill("Bitterblossom");
  await page.getByRole("button", { name: "Use Bitterblossom" }).click();
  await page.getByRole("button", { name: "Build deck" }).click();
  await expect(page.getByText("Alela, Artful Provocateur")).toBeVisible();
  await expect(page.getByText("100 cards")).toBeVisible();
  await expect(page.getByText("Buy first")).toBeVisible();
});

test("imports owned cards and shows ranked candidates", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Owned cards").fill("Commander: Alela, Artful Provocateur\n1 Sol Ring\n1 Arcane Signet\n1 Bitterblossom\n1 Command Tower");
  await page.getByRole("button", { name: "Analyze owned list" }).click();
  await expect(page.getByText("Ranked builds from owned cards")).toBeVisible();
  await expect(page.getByText("owned synergy cards")).toBeVisible();
});
```

Run:

```powershell
npm run test:e2e
```

Expected: FAIL because builder components do not exist.

- [ ] **Step 2: Add UI primitives**

Create `Badge`, `ManaPip`, and `Meter`:

```tsx
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "owned" | "missing" | "warning" | "power"; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
```

```tsx
import type { Color } from "@/domain/cards/types";

export function ManaPip({ color }: { color: Color }) {
  return <span className={`manaPip mana-${color.toLowerCase()}`} aria-label={`${color} mana`}>{color}</span>;
}
```

```tsx
export function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="meter" aria-label={`${label}: ${value} of ${max}`}>
      <span>{label}</span>
      <div className="meterTrack"><div className="meterFill" style={{ width: `${width}%` }} /></div>
      <strong>{value}</strong>
    </div>
  );
}
```

- [ ] **Step 3: Add builder shell**

Create `src/components/builder/BuilderShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BuyRail } from "@/components/builder/BuyRail";
import { CandidateBoard } from "@/components/builder/CandidateBoard";
import { DeckWorkspace } from "@/components/builder/DeckWorkspace";
import { LeftRail } from "@/components/builder/LeftRail";

export function BuilderShell() {
  const [seedCardName, setSeedCardName] = useState("Bitterblossom");
  const [ownedInput, setOwnedInput] = useState("");
  const [budgetUsd, setBudgetUsd] = useState(75);
  const [targetBracket, setTargetBracket] = useState(2);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function buildDeck(ownedCardNames: string[] = []) {
    setLoading(true);
    const response = await fetch("/api/deck/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedCardName, ownedCardNames, budgetUsd, targetBracket })
    });
    setResult(await response.json());
    setLoading(false);
  }

  async function analyzeOwnedList() {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: ownedInput })
    });
    const importResult = await response.json();
    await buildDeck(importResult.resolved.cards.map((row: any) => row.card.name));
  }

  return (
    <main className="builderGrid">
      <LeftRail
        seedCardName={seedCardName}
        onSeedCardNameChange={setSeedCardName}
        ownedInput={ownedInput}
        onOwnedInputChange={setOwnedInput}
        budgetUsd={budgetUsd}
        onBudgetUsdChange={setBudgetUsd}
        targetBracket={targetBracket}
        onTargetBracketChange={setTargetBracket}
        onBuild={() => buildDeck()}
        onAnalyzeOwnedList={analyzeOwnedList}
        loading={loading}
      />
      <CandidateBoard candidates={result?.candidates ?? []} />
      <DeckWorkspace deck={result?.deck} analysis={result?.analysis} />
      <BuyRail buyList={result?.buyList} />
    </main>
  );
}
```

Create `LeftRail` with visible labels `Card or commander`, `Owned cards`, buttons `Use Bitterblossom`, `Build deck`, `Analyze owned list`, budget input, and bracket select.

Create `CandidateBoard` with heading `Ranked builds from owned cards`, candidate commander, theme, score, owned count, missing estimate, and reasons.

Create `DeckWorkspace` with `100 cards`, curve rows, role meters, bracket, confidence, and Rule Zero notes.

Create `BuyRail` with heading `Buy first`, priority, estimated USD, selected-within-budget state, and purchase links.

Create `ExportMenu` with text and CSV export buttons that call `/api/export` and render returned content in a read-only `textarea`.

- [ ] **Step 4: Replace page and CSS**

Modify `src/app/page.tsx`:

```tsx
import { BuilderShell } from "@/components/builder/BuilderShell";

export default function HomePage() {
  return <BuilderShell />;
}
```

Add workbench CSS to `src/styles/globals.css`:

```css
.builderGrid {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(260px, 360px) minmax(420px, 1fr) minmax(260px, 340px);
  gap: 12px;
  min-height: 100vh;
  padding: 16px;
}

.panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--white);
  box-shadow: var(--shadow);
  padding: 16px;
}

.controlStack { display: grid; gap: 12px; }
label { display: grid; gap: 6px; color: var(--muted); font-size: 0.85rem; font-weight: 700; }
input, textarea, select, button { border: 1px solid var(--line); border-radius: var(--radius-sm); font: inherit; }
input, textarea, select { background: #fffdf7; color: var(--ink); padding: 10px; }
button { cursor: pointer; background: var(--ink); color: var(--white); padding: 10px 12px; font-weight: 800; }
.badge { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 3px 8px; font-size: 0.75rem; font-weight: 800; }
.badge-owned { background: #edf4e9; color: #35512f; }
.badge-missing { background: #f7ece5; color: #793f2c; }
.badge-warning { background: #f7f0d7; color: #66521d; }
.badge-power { background: #ebe9ef; color: #463b4b; }
.manaPip { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgb(29 26 22 / 30%); font-size: 0.72rem; font-weight: 900; }
.mana-w { background: var(--accent-w); }
.mana-u { background: var(--accent-u); color: white; }
.mana-b { background: var(--accent-b); color: white; }
.mana-r { background: var(--accent-r); color: white; }
.mana-g { background: var(--accent-g); color: white; }
.meter { display: grid; grid-template-columns: 90px 1fr 36px; align-items: center; gap: 8px; }
.meterTrack { height: 8px; border-radius: 99px; background: var(--paper-deep); overflow: hidden; }
.meterFill { height: 100%; background: var(--ink); }
.attribution { color: var(--muted); font-size: 0.78rem; }

@media (max-width: 1100px) {
  .builderGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm run test:e2e
npm run build
git add src/components src/app/page.tsx src/styles/globals.css tests/e2e/builder.spec.ts
git commit -m "feat: build commander workbench ui"
```

Expected: Playwright passes both flows, Next builds, and commit succeeds.

---

## Task 9: Add Compliance, README, And Final Verification

**Files:**
- Create: `docs/provider-compliance.md`
- Modify: `src/components/builder/DeckWorkspace.tsx`
- Modify: `src/components/builder/BuyRail.tsx`
- Modify: `tests/e2e/builder.spec.ts`
- Create: `README.md`

- [ ] **Step 1: Add provider compliance doc**

Create `docs/provider-compliance.md`:

```markdown
# Provider Compliance

Deckroot uses Scryfall as the canonical card database and may use EDHREC recommendation surfaces through an internal adapter.

## Scryfall

- Send `User-Agent` and `Accept: application/json` headers on all live API requests.
- Keep app-level live requests at or below 5 requests per second.
- Prefer cached and bulk data for repeated lookups.
- Show Scryfall attribution near card data, price estimates, images, and purchase links.
- Treat prices as estimates and send users to linked retailers for final prices.

## EDHREC

- Use `EdhrecProvider` rather than coupling application code to third-party wrapper packages.
- Cache successful recommendation responses for seven days in the MVP.
- Limit live recommendation requests to one request per second.
- Show EDHREC attribution wherever recommendation data affects candidates or card choices.
- Before public launch, contact EDHREC for permission and usage expectations because EDHREC does not advertise an official public API for product-scale automated access.
- If EDHREC is unavailable or permission is not granted, run `DECKROOT_EDHREC_MODE=fixture`.

## Wizards Fan Content

Deckroot is unofficial Fan Content permitted under the Fan Content Policy. Deckroot is not approved or endorsed by Wizards. Magic: The Gathering and related marks belong to Wizards of the Coast.
```

- [ ] **Step 2: Add attribution UI**

In `DeckWorkspace.tsx`, show:

```tsx
<p className="attribution">
  Card data and prices are powered by Scryfall. Recommendation signals may include EDHREC data. Bracket estimates are conversation aids, not official ratings.
</p>
```

In `BuyRail.tsx`, show:

```tsx
<p className="attribution">
  Prices are estimates. Use retailer links to confirm availability and final checkout price.
</p>
```

Add this assertion to the first Playwright test:

```ts
await expect(page.getByText("Card data and prices are powered by Scryfall")).toBeVisible();
```

- [ ] **Step 3: Add README**

Create `README.md`:

```markdown
# Deckroot

Deckroot is a free Commander deck workbench for players who want to build from a favorite card or from cards they already own.

## MVP Features

- Build around a seed card.
- Import owned cards from plain text or CSV-style exports.
- Generate up to five ranked Commander candidates.
- Assemble a legal 100-card Commander deck.
- Show mana curve, role balance, estimated bracket, and Rule Zero notes.
- Create a budget-aware buy list for missing singles.
- Export text or CSV decklists.

## Local Development

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Test Commands

```powershell
npm run test
npm run build
npm run test:e2e
```

## Provider Modes

The MVP defaults to fixture-backed providers. Copy `.env.example` to `.env.local` and set provider modes when live API usage is enabled.

```bash
DECKROOT_SCRYFALL_MODE=fixture
DECKROOT_EDHREC_MODE=fixture
DECKROOT_CACHE_DIR=.deckroot-cache
DECKROOT_USER_AGENT=Deckroot/0.1 contact@example.com
```

## Attribution

Card data, prices, and purchase links are provided by Scryfall. Recommendation signals may include EDHREC data. Deckroot is unofficial Fan Content and is not approved or endorsed by Wizards of the Coast.
```

- [ ] **Step 4: Final verification**

Run:

```powershell
npm run test
npm run build
npm run test:e2e
git status --short
```

Expected:

```text
PASS tests/domain/import-parser.test.ts
PASS tests/domain/commander-rules.test.ts
PASS tests/domain/candidate-generator.test.ts
PASS tests/domain/deck-assembler.test.ts
PASS tests/domain/deck-analysis.test.ts
PASS tests/domain/buy-list.test.ts
PASS tests/domain/exporter.test.ts
PASS tests/integration/providers.test.ts
Next build completed successfully
2 passed
```

`git status --short` shows only the compliance and README files before the final commit.

- [ ] **Step 5: Commit and confirm clean status**

Run:

```powershell
git add docs/provider-compliance.md src/components/builder/DeckWorkspace.tsx src/components/builder/BuyRail.tsx tests/e2e/builder.spec.ts README.md
git commit -m "docs: add provider compliance and usage"
git status --short
```

Expected: no output from final `git status --short`.

---

## Self-Review

Spec coverage:

- Commander-only build: Tasks 4 and 5.
- Any-card flow: Tasks 5, 7, and 8.
- Owned-list flow: Tasks 3, 5, 7, and 8.
- EDHREC wrapper-centered adapter with cache and rate limits: Tasks 2 and 4.
- Scryfall normalization and live client: Task 4.
- Legal 100-card assembly: Task 5.
- Mana curve, roles, bracket explanation: Task 6.
- Budget-aware buy list: Task 6.
- Export: Tasks 6 and 7.
- Non-gradient modern workbench design: Tasks 1 and 8.
- Compliance and attribution: Task 9.

Type consistency:

- `Card`, `CardCatalog`, `EdhrecProvider`, `DeckCandidate`, `AssembledDeck`, `DeckAnalysis`, and `BuyList` are introduced before later tasks consume them.
- Route payload names match `BuilderShell`: `seedCardName`, `ownedCardNames`, `budgetUsd`, `targetBracket`.
- Playwright labels match `LeftRail`: `Card or commander`, `Owned cards`, `Use Bitterblossom`, `Build deck`, `Analyze owned list`.

Known execution risk:

- The fixture catalog must be large enough to build a 100-card Esper deck. The plan requires expanding fixture data before weakening Commander legality or singleton validation.
- Live EDHREC can change response shape or usage expectations. The MVP defaults to fixture mode and documents the public-launch permission step.
