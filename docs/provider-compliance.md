# Provider Compliance
Deckroot uses Scryfall as the canonical card database and may use EDHREC recommendation surfaces through internal adapters. The current MVP runtime and API routes are fixture-backed demos; live Scryfall and EDHREC adapter code, cache settings, and provider environment variables are preparatory/experimental until provider factory wiring, cache configuration, permission review, and production deployment work are completed.

## Current Runtime Mode
- API routes currently instantiate fixture-backed card catalog and EDHREC providers directly.
- Setting `DECKROOT_SCRYFALL_MODE` or `DECKROOT_EDHREC_MODE` does not enable live runtime behavior in the MVP.
- Treat live adapters as implementation groundwork for future integration testing and production hardening, not as a supported deployment mode yet.

## Scryfall
- Send `User-Agent` and `Accept: application/json` headers on all live API requests.
- Keep app-level live requests at or below 5 requests per second.
- Prefer cached and bulk data for repeated lookups.
- Show Scryfall attribution near card data, price estimates, images, and purchase links.
- Treat prices as estimates and send users to linked retailers for final prices.

## EDHREC
- Use `EdhrecProvider` rather than coupling application code to third-party wrapper packages.
- Cache successful recommendation responses for seven days when live provider mode is eventually wired.
- Limit live recommendation requests to one request per second.
- Show EDHREC attribution wherever recommendation data affects candidates or card choices.
- Before public launch, contact EDHREC for permission and usage expectations because EDHREC does not advertise an official public API for product-scale automated access.
- If EDHREC is unavailable or permission is not granted, keep runtime behavior fixture-backed.

## Wizards Fan Content
Deckroot is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

## References
- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [Scryfall API access FAQ](https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17)
- [EDHREC Terms](https://edhrec.com/terms)
- [Wizards Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy)
