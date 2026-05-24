# Commander Deck Platform Design

## Summary

Deckroot is a free web platform for Magic: The Gathering Commander players who want strong, playable decks without spending hours researching the meta. A user starts with either a card they like or an exported card/deck list they already own. The platform chooses or confirms a commander, builds one or more legal Commander deck candidates, estimates bracket/power, explains the mana curve and deck roles, and produces a prioritized buy list for missing singles within a user-set budget.

The MVP focuses on Commander only. Other formats are intentionally out of scope until the recommendation, import, budget, and analysis loops are trusted for one format.

## Target User

The primary user is a paper Commander player who wants to play Magic but does not have the time or energy to research the meta, compare decklists, calculate curve, tune a mana base, and figure out which singles to buy. They may own cards in ManaBox, Moxfield, Archidekt, or another tool, and they want the platform to make the best use of what they already have before asking them to spend more.

## Core Product Promise

Deckroot should answer four questions quickly:

1. What Commander decks can I build from this card or from cards I already own?
2. Which deck option is most playable, synergistic, and close to my budget?
3. How strong is the deck, and why?
4. What should I buy first to complete or improve it?

## MVP Scope

The MVP includes:

- Commander-only deck generation.
- Any-card entry point.
- Owned-list entry point for exported card lists.
- Commander selection or recommendation.
- EDHREC-backed recommendation adapter.
- Scryfall-backed card normalization, legality, images, prices, purchase links, EDHREC rank, and Game Changer flags.
- Legal 100-card Commander deck assembly.
- Mana curve and deck role analysis.
- Commander Bracket estimate with explainable signals.
- Missing-card buy list with budget-aware priorities.
- Export to common decklist text formats.

The MVP excludes:

- Non-Commander formats.
- Real-time inventory sync with third-party accounts.
- Direct checkout or cart management.
- User-to-user marketplace features.
- Fully automated cEDH tournament optimization.
- Mobile app native builds.

## User Flows

### Flow 1: Build Around Any Card

1. User searches for or enters a card.
2. Platform resolves the card through Scryfall.
3. Platform checks Commander legality and whether the card can be a commander.
4. If the card can be a commander, the user can build directly around it.
5. If the card cannot be a commander, the platform suggests commanders and themes that make the card relevant in the 99.
6. User selects commander, target bracket, casual/competitive intent, budget, and optional owned-card preference.
7. Platform generates a legal deck, analysis, and buy list.

### Flow 2: Build From Owned Cards

1. User pastes or uploads an exported list from ManaBox, Moxfield, Archidekt, MTGO, CSV, or plain text.
2. Platform parses quantities, card names, optional set codes, collector numbers, sections, and commander markers where available.
3. Platform normalizes each card through Scryfall identifiers and flags unresolved rows for review.
4. Platform detects possible commanders in the owned list.
5. Platform clusters owned cards by color identity, card roles, themes, typal signals, mechanics, and EDHREC relevance.
6. Platform generates several owned-first Commander candidates.
7. Each candidate shows owned coverage, missing cost, commander/theme, bracket estimate, mana curve health, and a short game plan.
8. User chooses a candidate.
9. Platform fills gaps with EDHREC recommendations and Scryfall-validated budget alternatives.
10. Platform produces a "playable now" version, a "buy these first" upgrade path, and an optimized within-budget version.

## Deck Candidate Ranking

Owned-list candidates are ranked by a blended score:

- Commander legality and color identity fit.
- Number of final deck cards already owned.
- Density of owned cards that match the commander plan.
- EDHREC recommendation overlap.
- Mana base completeness.
- Role completeness across ramp, draw, removal, protection, finishers, recursion, and utility.
- Missing-card cost.
- Target bracket fit.
- Combo presence or avoidance based on casual/competitive intent.

The platform should not simply maximize owned-card count. A 92-owned-card pile with no coherent plan should lose to a 70-owned-card deck with a clear commander, mana base, and win condition.

## Recommendation Strategy

The MVP uses an internal `EdhrecProvider` adapter instead of depending directly on a third-party wrapper package. Existing wrappers such as `edhrec-recs`, `mightstone`, and `pyedhrec` prove the integration path exists, but our adapter owns caching, throttling, retries, response validation, and fallback behavior.

Initial EDHREC surfaces:

- `POST https://edhrec.com/api/recs` for deck recommendations.
- Static commander pages from `https://json.edhrec.com/pages/...` where useful for commander cards, average decks, themes, typal pages, staples, mana staples, and combos.

The adapter must:

- Use a clear user agent.
- Cache recommendation responses by commander, partner, card set, options, and timestamp.
- Rate limit outbound requests.
- Persist successful responses for reuse.
- Treat EDHREC downtime or response changes as recoverable.
- Include attribution and source links in the UI.
- Keep a documented contact/permission step before public launch.

## Scryfall Integration

Scryfall is the canonical card database for the MVP.

Use Scryfall for:

- Card search and autocomplete.
- Name normalization.
- Oracle ID and Scryfall ID mapping.
- Commander legality.
- Color identity.
- Mana value and mana cost.
- Type line and oracle text.
- Prices.
- Purchase URIs.
- Images.
- EDHREC rank.
- Game Changer flag.
- Bulk data sync.

The backend should prefer Scryfall bulk data for common lookups and use live API calls only for search, autocomplete, and cache misses. Requests to `api.scryfall.com` must stay below Scryfall's published guidance of under 10 requests per second and include a relevant `User-Agent` and `Accept` header.

## Import Formats

The importer accepts:

- Plain text lines like `1 Sol Ring`.
- Moxfield plain text and MTGO/Arena-style exports.
- Archidekt text exports.
- ManaBox CSV exports.
- Generic CSV files with recognizable columns such as card name, quantity, set code, collector number, foil, language, and Scryfall ID.

The parser returns:

- Parsed cards.
- Original rows.
- Source section if available.
- Quantity.
- Candidate card identifiers.
- Resolution confidence.
- Errors and warnings for user review.

Unresolved cards should not block the whole import. The user should be able to fix names, ignore rows, or continue with partial results.

## Deck Assembly

Every generated Commander deck must have:

- Exactly 100 cards including commander or legal partner pair.
- Singleton enforcement except basic lands and cards that explicitly allow more copies.
- Commander color identity enforcement.
- Commander legality enforcement.
- User budget enforcement unless the user explicitly allows over-budget suggestions.
- A land count and mana source balance appropriate to the deck.
- Role targets tuned by archetype and bracket.

Default role targets:

- Lands: 34 to 38, adjusted by curve and ramp.
- Ramp: 8 to 12.
- Card draw or card advantage: 8 to 14.
- Targeted removal: 6 to 10.
- Board wipes: 2 to 4.
- Protection or recursion: 3 to 8.
- Win conditions and payoffs: archetype-specific.

The deck builder should use EDHREC recommendations as candidate input, not as the only decision-maker. The final list is selected by legality, curve, role balance, owned-card priority, budget, bracket target, and synergy score.

## Power And Bracket Analysis

The MVP should present bracket estimates as explainable guidance, not an absolute truth. Wizards has emphasized that Commander Brackets are a tool for pregame conversation and that intent matters more than pure checklist math.

Signals include:

- Game Changer count.
- Fast mana density.
- Tutor density.
- Compact combo density.
- Infinite combo presence.
- Average mana value.
- Interaction density.
- Mana base speed.
- Reserved or high-price staple density.
- Salt score where available.
- EDHREC rank distribution.
- Stax, mass land denial, extra turns, and lock patterns.
- User-stated intent.

Output should include:

- Recommended bracket.
- Confidence level.
- Reasons that pushed the estimate up or down.
- Rule Zero conversation notes.
- Specific swaps to lower or raise the bracket.

## Buy List And Budgeting

The buy list should answer "what should I get first?"

Each missing card gets:

- Estimated price.
- Purchase links from Scryfall where available.
- Role in the deck.
- Synergy explanation.
- Priority tier.
- Cheaper alternatives.
- Owned-card substitute if available.
- Bracket impact.

The platform should optimize for impact per dollar, not just highest EDHREC score. It should distinguish between:

- Required cards to make the deck legal or functional.
- High-impact upgrades.
- Nice-to-have improvements.
- Expensive optimizations.
- Cards that push the deck above the chosen bracket.

## Design Language

The product should feel like a focused workshop, not a marketing landing page.

Visual direction:

- Builder-first dashboard as the first screen.
- No gradient-based identity.
- Clean off-white and ink base, with restrained color accents based on Magic color identity.
- Compact cards with 6px to 8px radii.
- Dense but readable layout.
- Left rail for inputs and constraints.
- Center workspace for candidates, decklist, curve, and analysis.
- Right rail for missing cards and buy priorities.
- Clear visual labels for owned, missing, recommended, over-budget, Game Changer, and bracket-impact cards.

The UI should avoid generic "AI assistant" styling. It should look like a serious deck workbench for people who care about paper Magic.

## System Architecture

Recommended MVP architecture:

- Web frontend: React/Next.js app.
- Backend API: Next.js route handlers or a small Node service.
- Database: PostgreSQL for users, imports, deck builds, cached recommendations, and card metadata indexes.
- Cache/queue: Redis for rate limits, request dedupe, background jobs, and short-lived recommendation cache.
- Background jobs: scheduled Scryfall bulk sync and optional EDHREC static cache refresh.
- Storage: object/file storage for uploaded lists if persistence is enabled.

Core services:

- `CardCatalogService`: Scryfall-backed card lookup and local index.
- `ImportParserService`: parses and normalizes uploaded lists.
- `EdhrecProvider`: EDHREC adapter with cache, throttling, and schema validation.
- `DeckCandidateService`: generates owned-first candidate decks.
- `DeckAssemblyService`: creates legal 100-card lists.
- `DeckAnalysisService`: curve, roles, bracket, combo, price, and warnings.
- `BuyListService`: missing-card prioritization and alternatives.
- `ExportService`: Moxfield-style text, CSV, and plain list export.

## Data Model

Primary entities:

- `Card`: Scryfall ID, Oracle ID, name, type line, color identity, mana value, legalities, prices, image URIs, purchase URIs, EDHREC rank, Game Changer flag.
- `ImportBatch`: user/session ID, source type, raw input, parse status, created time.
- `ImportedCard`: batch ID, raw row, normalized card ID, quantity, source section, resolution confidence.
- `DeckCandidate`: commander, partner, theme, owned coverage, missing cost, bracket estimate, score, generated reason.
- `DeckBuild`: selected candidate, final card list, budget, target bracket, analysis snapshot.
- `DeckCard`: deck ID, card ID, zone, role, owned quantity, recommended quantity, source reason.
- `BuyListItem`: deck ID, card ID, missing quantity, price, priority, alternatives, purchase URIs.
- `ProviderCacheEntry`: provider, cache key, response body, created time, expiry, schema version.

## Error Handling

Key failure states:

- Scryfall lookup fails: show unresolved card review and allow manual correction.
- EDHREC fails or rate limits: use cached results if available, show degraded mode, and avoid retry storms.
- Imported file is malformed: show line-level parse errors.
- Budget cannot produce a coherent deck: show closest playable option and explain what budget increase would unlock.
- Commander is illegal: explain why and suggest legal alternatives.
- Deck cannot reach 100 legal cards from current constraints: show which constraint is blocking completion.

## Privacy And Accounts

The MVP should support anonymous sessions first. Saved accounts can be added after the core builder works. Uploaded lists may reveal a user's collection value, so the platform should:

- Avoid requiring account creation for first use.
- Let users delete uploaded lists and generated builds.
- Avoid publishing lists unless explicitly shared.
- Store only what is needed for the feature.
- Make pricing estimates clearly non-guaranteed.

## Compliance And Attribution

The platform must include:

- Scryfall attribution and compliance with Scryfall API usage guidance.
- EDHREC attribution where EDHREC data influences recommendations.
- Wizards fan content disclaimer.
- Clear note that prices are estimates and final store prices may differ.
- Documented EDHREC permission/contact step before public launch.

Relevant sources:

- Scryfall API guidance: https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17
- Scryfall API docs: https://scryfall.com/docs/api
- EDHREC Terms: https://edhrec.com/terms
- EDHREC usage guide: https://edhrec.com/guides/how-to-use-edhrec
- EDHREC recommendations wrapper: https://npm.io/package/edhrec-recs
- Mightstone EDHREC wrapper docs: https://mightstone.readthedocs.io/en/latest/reference/api.html
- PyEDHRec wrapper: https://pypi.org/project/pyedhrec/
- Commander Brackets update: https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026

## Success Criteria

The MVP is successful when:

- A user can paste a single card and get a legal Commander deck candidate.
- A user can upload an owned list and see multiple Commander deck candidates ranked by owned coverage, coherence, missing cost, and bracket fit.
- Generated decks are legal Commander lists.
- Every generated deck includes curve, roles, budget, missing cards, and bracket explanation.
- EDHREC and Scryfall requests are cached and rate-limited.
- The buy list is actionable and budget-aware.
- The UI opens directly into the builder experience.

## Testing Strategy

Unit tests:

- Decklist parser formats.
- Scryfall card normalization.
- Commander legality and color identity enforcement.
- Singleton enforcement.
- Budget calculations.
- Role classification.
- Bracket signal calculations.
- Buy list prioritization.

Integration tests:

- Scryfall API client with recorded fixtures.
- EDHREC provider with recorded fixtures.
- Import-to-candidate generation.
- Candidate-to-final-deck assembly.
- Export formats.

End-to-end tests:

- Single-card build flow.
- Owned-list upload flow.
- Unresolved import row correction.
- Budget-constrained deck generation.
- EDHREC degraded mode using cache.

## Open Product Decisions

These can be decided during implementation planning:

- Whether the first release uses anonymous sessions only or lightweight accounts.
- Whether price region defaults to USD, EUR, or user-selectable.
- Whether deck candidates should be capped at three or five per import.
- Whether Commander Spellbook combo detection ships in MVP or immediately after MVP.
- Whether to call the product Deckroot permanently or treat it as a working name.
