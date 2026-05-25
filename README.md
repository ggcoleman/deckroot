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
- Optional local Scryfall live mode for real card search and card-name resolution.

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
Fixture mode is the default. It keeps the demo deterministic and does not require third-party network access.

```bash
DECKROOT_SCRYFALL_MODE=fixture
DECKROOT_EDHREC_MODE=fixture
DECKROOT_EDHREC_LIVE_ACK=false
DECKROOT_CACHE_DIR=.deckroot-cache
DECKROOT_USER_AGENT="Deckroot/0.1 (mailto:you@your-domain.com)"
```

### Scryfall Live Mode
Scryfall live mode powers `/api/cards/search`, `/api/import`, and `/api/deck/build` card resolution with live Scryfall responses. Deckroot sends `Accept: application/json`, a configured `User-Agent`, caches responses under `DECKROOT_CACHE_DIR`, and spaces requests at one-at-a-time / 200ms minimum.

PowerShell:
```powershell
$env:DECKROOT_SCRYFALL_MODE="live"
$env:DECKROOT_USER_AGENT="Deckroot/0.1 (mailto:your-real-email@your-domain.com)"
npm run dev
```

Do not use placeholder contact values such as `contact@example.com`; live mode rejects them so requests identify the app responsibly.

### EDHREC Experimental Mode
EDHREC live mode is experimental because EDHREC does not advertise an official public product API. Deckroot only attempts the existing endpoint-oriented adapter when you explicitly acknowledge that risk:

```powershell
$env:DECKROOT_EDHREC_MODE="live"
$env:DECKROOT_EDHREC_LIVE_ACK="true"
$env:DECKROOT_USER_AGENT="Deckroot/0.1 (mailto:your-real-email@your-domain.com)"
npm run dev
```

If EDHREC live mode is requested without acknowledgement, Deckroot uses fixture recommendations and returns a provider warning. If an acknowledged EDHREC live request fails during deck build, Deckroot falls back to fixture recommendations and includes a warning in the API response.

## Attribution
Card data, prices, and purchase links are provided by Scryfall. Recommendation signals may include EDHREC data when experimental live mode is enabled. Deckroot is unofficial Fan Content permitted under the Fan Content Policy. Not approved or endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast LLC.
