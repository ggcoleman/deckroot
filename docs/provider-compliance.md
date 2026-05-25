# Provider Compliance
Deckroot uses Scryfall as the canonical card database and can optionally use EDHREC recommendation surfaces through the internal `EdhrecProvider` adapter. Fixture mode remains the default; live provider modes must be enabled explicitly with environment variables.

## Runtime Modes
- Fixture mode is the default for local development, demos, and automated tests.
- `DECKROOT_SCRYFALL_MODE=live` enables live Scryfall card search and card-name resolution for API routes.
- `DECKROOT_EDHREC_MODE=live` is experimental and only runs when `DECKROOT_EDHREC_LIVE_ACK=true` is also set.
- API responses include `providerMode` and `providerWarnings` when provider-backed work is performed.
- Automated tests use fake network responses and must not call third-party services.

## Scryfall
- Send `User-Agent` and `Accept: application/json` headers on all live API requests.
- Keep app-level live requests at or below 5 requests per second; the current runtime limiter allows one Scryfall request every 200ms.
- Cache repeated lookups in `DECKROOT_CACHE_DIR`; named lookups cache for one day and searches cache for one hour.
- Prefer cached and bulk data for future high-volume features.
- Show Scryfall attribution near card data, price estimates, images, and purchase links.
- Treat prices as estimates and send users to linked retailers for final prices.

## EDHREC
- Use `EdhrecProvider` rather than coupling application code to third-party wrapper packages or page scraping.
- Require `DECKROOT_EDHREC_LIVE_ACK=true` before any live EDHREC request is attempted.
- Cache successful recommendation responses for seven days.
- Limit live recommendation requests to one request per second.
- Fall back to fixture recommendations with a provider warning when live EDHREC is not acknowledged or fails during deck build.
- Show EDHREC attribution wherever live recommendation data affects candidates or card choices.
- Before public launch, contact EDHREC for permission and usage expectations because EDHREC does not advertise an official public API for product-scale automated access.

## Wizards Fan Content
Deckroot is unofficial Fan Content permitted under the Fan Content Policy. Not approved or endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast LLC.

## References
- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [Scryfall API access FAQ](https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17)
- [EDHREC Terms](https://edhrec.com/terms)
- [Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy)
