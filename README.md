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