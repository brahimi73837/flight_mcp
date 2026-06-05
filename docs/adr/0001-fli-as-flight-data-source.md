# ADR-0001 — Use `fli` (Google Flights) as the flight-data source

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** Constitution Principle IV; spec FR-01..FR-07; research R1

## Context
The app needs real flight itineraries and prices with no API key and no scraping
fragility. The brief mandates the [`fli`](https://github.com/punitarani/fli)
library ("MUST USE … if it doesn't work find an alternative").

## Decision
Adopt `fli` (`pip install flights`) as the **single** flight-data source, used
as a **Python library** inside our own MCP server.

The decision was gated on a live probe (research R1), not the README:
```
JFK->LAX +30d  ->  99 results; top: $155, 5h55m, non-stop, DL742
```
Install, import, and a live search all succeeded on Python 3.14.

## Consequences
- **+** Real Google Flights data, no key, no browser/scraper to maintain (NFR-2).
- **+** Rich models (per-leg airline, flight number, times, CO₂) → a detailed
  contract.
- **−** Unofficial/reverse-engineered: Google can change its private API; we
  isolate this risk behind our tool layer and surface upstream failures as
  structured errors (FR-05, NFR-4).
- **−** No live aircraft status → forces the tracking scope decision (ADR-0003).

## Alternatives considered
- **Amadeus Self-Service API** — official, free tier, but **requires an API key**
  (violates NFR-2) and has quota limits. Rejected once `fli` worked.
- **Kiwi/Tequila API** — also key-gated. Rejected.
- **Direct scraping of Google Flights HTML** — brittle, slow, breaks often.
  Rejected; `fli`'s API approach is strictly better.
