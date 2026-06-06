# Plan 001 — Technical Implementation

> **How** we build the spec. Pairs with [`spec.md`](./spec.md) (what/why),
> [`data-model.md`](./data-model.md), [`contracts/`](./contracts/), and ADRs
> 0001–0006.

## Architecture

```
Browser (React, cockpit UI)
   │  fetch /api/*  (plain JSON only)
   ▼
Next.js server route handlers  ──MCP client (Streamable HTTP)──►  flight-mcp (Python)
   (web/app/api/*)                @modelcontextprotocol/sdk         server.py
                                                                       │ imports
                                                                       ▼
                                                                  fli library → Google Flights
```
Two processes in dev: the Python MCP server (`:8000`) and Next.js (`:3000`).
The same `server.py` also runs over **stdio** for Claude Desktop. (ADR-0004.)

## Component 1 — MCP server (`mcp-server/`)

- **Runtime:** Python 3.14, venv at `mcp-server/.venv`; deps `flights`, `mcp`
  (Python SDK / FastMCP). Pinned in `requirements.txt`.
- **`server.py`:** a FastMCP server with three `@mcp.tool()`s implementing
  `contracts/mcp-tools.md`. Transport selected by entrypoint:
  - `python server.py` or `--http` → Streamable HTTP on `:8000` at `/mcp`.
  - `python server.py --stdio` → stdio.
- **`fli` mapping layer (`mapping.py`):** pure functions converting
  `FlightResult`/`FlightLeg`/`DatePrice` → the `data-model.md` JSON. Centralizes
  upstream-shape risk (ADR-0001). Datetimes → ISO-8601; enums → lowercase strings.
- **Airport matcher (`airports.py`):** over `fli.models.Airport`. Exact code →
  first; else case-insensitive substring on code+name, ranked (code-startswith >
  name-startswith > contains). Backs `resolve_airport` and text origin/dest
  resolution.
- **Validation & errors:** map enum/airport/date problems to the error envelope
  (`BAD_AIRPORT|BAD_DATE|VALIDATION`); wrap `fli` exceptions
  (`SearchClientError`/timeout/HTTP) → `UPSTREAM`. Never leak tracebacks (FR-05).
- **Enum bridges:** string ⇄ `SeatType/MaxStops/SortBy` per data-model.

### Tool → `fli` call mapping
| tool | builds | calls |
|------|--------|-------|
| `search_flights` | `FlightSearchFilters(trip_type, passenger_info, flight_segments=[FlightSegment(...)], stops, seat_type, sort_by)` | `SearchFlights().search()` → map → `offers` |
| `cheapest_dates` | `DateSearchFilters(..., from_date, to_date, duration)` | `SearchDates().search()` → map → `cells` |
| `resolve_airport` | — | `airports.match(query, limit)` |

## Component 2 — Frontend (`web/`)

- **Stack:** Next.js (App Router) + TypeScript, `npx create-next-app`. Deps:
  `@modelcontextprotocol/sdk` (MCP client), `motion` (animation),
  `next/font/google` for `IBM Plex Mono` + `Saira`.
- **MCP client (`web/lib/mcp.ts`):** one helper `callTool(name, args)` that opens
  a `StreamableHTTPClientTransport` to `FLIGHT_MCP_URL`, calls the tool, parses
  the JSON text content, returns it; closes the session in `finally`. Reused by
  all three routes.
- **Route handlers** (`app/api/{search,fares,airports}/route.ts`): parse/validate
  query → `callTool` → map error `code` to HTTP status (`api-routes.md`) → JSON.
- **UI (cockpit, per `docs/design/cockpit-language.md`):**
  - `app/globals.css` — design tokens (CSS vars), grid/scanline/grain textures,
    base panel/bezel styles, fonts.
  - Components: `CommandBar` (route + dates + cabin/stops, airport autocomplete),
    `ModeToggle` (SEARCH / FARE TRACK rocker), `ReadoutRow` + `PriceGauge` +
    `DurationArc` (offer), `FareGrid` (heat calendar), `StatusStrip` (annunciator).
  - `app/page.tsx` — client page holding mode state, calling `/api/*`, rendering
    readouts or the fare grid; Motion for staggered reveals + gauge sweeps;
    honors `prefers-reduced-motion`.

## Sequencing & dependencies
1. **Contracts are frozen first** (done) → server and frontend built against them.
2. **MCP server before frontend** (frontend needs live tools to verify against).
3. Within frontend: API routes before UI; `CommandBar`/`ReadoutRow` before the
   richer `PriceGauge`/`FareGrid`.
Full ordered breakdown → [`tasks.md`](./tasks.md).

## Risks & mitigations
- **Upstream API drift / latency (ADR-0001).** Isolated in `mapping.py`; errors →
  `UPSTREAM`; generous server-side timeouts.
- **MCP SDK transport mismatch.** Pin SDK versions; smoke-test the HTTP handshake
  before building routes (task T5xx).
- **Dark-theme accessibility.** Tokens enforce contrast; accents only on numerals/
  short labels; `prefers-reduced-motion` honored.

## Definition of done
All acceptance criteria AC-1..AC-6 demonstrated live (see `quickstart.md`), with
`git log` matching `tasks.md` IDs.
