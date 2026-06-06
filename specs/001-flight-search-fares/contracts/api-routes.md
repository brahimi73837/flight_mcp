# Contract — Next.js HTTP API Routes

> The browser's only interface. Each route handler is the **MCP client**: it opens
> a Streamable-HTTP MCP session to `FLIGHT_MCP_URL`, calls one tool, and returns
> the tool's JSON (or its error envelope) verbatim with the right HTTP status.
> Shapes mirror `contracts/mcp-tools.md` / `data-model.md`.

## `GET /api/airports`
Autocomplete. → MCP `resolve_airport`.
- **Query:** `q` (string, required), `limit` (int, default 8)
- **200:** `{ "airports": Airport[] }`
- **400:** error envelope when `q` missing.

## `GET /api/search`
Flight search. → MCP `search_flights`.
- **Query:** `origin`, `destination`, `departure_date` (required); optional
  `return_date`, `seat_type`, `max_stops`, `adults`, `children`, `infants`,
  `sort_by`, `limit`.
- **200:** `{ "offers": FlightOffer[], "query": {…} }`
- **400:** `BAD_AIRPORT` / `BAD_DATE` / `VALIDATION` envelope.
- **502:** `UPSTREAM` envelope when `fli`/Google Flights fails.

## `GET /api/fares`
Fare calendar. → MCP `cheapest_dates`.
- **Query:** `origin`, `destination`, `from_date`, `to_date` (required); optional
  `trip_duration`, `seat_type`.
- **200:** `{ "cells": FareCell[], "query": {…} }`
- **400 / 502:** as above.

## Status mapping
| tool error `code` | HTTP |
|-------------------|------|
| `BAD_AIRPORT`, `BAD_DATE`, `VALIDATION` | 400 |
| `UPSTREAM` | 502 |
| (none / success) | 200 |

## Notes
- All routes run on the Node server runtime (`export const runtime = "nodejs"`),
  never the browser. MCP session is opened per request and closed in `finally`.
- `FLIGHT_MCP_URL` defaults to `http://127.0.0.1:8000/mcp`.
- Generous timeout (a live `fli` query can take several seconds); on timeout →
  `UPSTREAM` / 502.
