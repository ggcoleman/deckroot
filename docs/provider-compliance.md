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