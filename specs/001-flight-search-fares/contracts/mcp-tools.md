# Contract — MCP Tools

> Frozen tool interface exposed by `mcp-server/server.py`. Both the server and
> the Next.js MCP client (`web/`) honor this. Types reference `data-model.md`.
> Tools return JSON (the SDK wraps it as text content; the client parses it).

## `search_flights`
Search itineraries for a route on a specific date.

**Input**
| param | type | req | default | notes |
|-------|------|-----|---------|-------|
| `origin` | string | ✓ | — | IATA code or text (resolved server-side) |
| `destination` | string | ✓ | — | IATA code or text |
| `departure_date` | string | ✓ | — | `YYYY-MM-DD`, today or later |
| `return_date` | string |  | null | `YYYY-MM-DD` ⇒ round trip |
| `seat_type` | enum |  | `economy` | see data-model |
| `max_stops` | enum |  | `any` | see data-model |
| `adults` | int |  | 1 | ≥1 |
| `children` | int |  | 0 | |
| `infants` | int |  | 0 | infants in seat |
| `sort_by` | enum |  | `cheapest` | see data-model |
| `limit` | int |  | 30 | cap returned offers |

**Output:** `{ "offers": FlightOffer[], "query": {…echo…} }` or error envelope.

## `cheapest_dates`
Cheapest fare per date across a window (Fare Tracker).

**Input**
| param | type | req | default | notes |
|-------|------|-----|---------|-------|
| `origin` | string | ✓ | — | IATA or text |
| `destination` | string | ✓ | — | IATA or text |
| `from_date` | string | ✓ | — | `YYYY-MM-DD` window start |
| `to_date` | string | ✓ | — | `YYYY-MM-DD` window end (≤ ~6 months out) |
| `trip_duration` | int |  | null | nights; present ⇒ round trip per cell |
| `seat_type` | enum |  | `economy` | |

**Output:** `{ "cells": FareCell[], "query": {…echo…} }` or error envelope.

## `resolve_airport`
Resolve free text to candidate airports (autocomplete + validation).

**Input**
| param | type | req | default | notes |
|-------|------|-----|---------|-------|
| `query` | string | ✓ | — | code or partial name |
| `limit` | int |  | 8 | max candidates |

**Output:** `{ "airports": Airport[] }`. An exact 3-letter code ranks first.

## Behavior
- Text origin/destination are run through the same matcher as `resolve_airport`;
  the top match is used; **no match ⇒ `BAD_AIRPORT` error** (FR-05).
- Past or malformed dates ⇒ `BAD_DATE`. Upstream `fli` errors ⇒ `UPSTREAM`.
- Enums are validated against `fli`'s real enums; bad value ⇒ `VALIDATION`.
