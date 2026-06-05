# Research — Spec 001

> Findings that de-risked the spec. Every adopted capability is backed by a
> **live probe** run during planning (Constitution, Principle IV). Probe output
> below is real, captured 2026-06-10.

## R1 — Data source: `fli` (Google Flights)

`fli` (`pip install flights`) gives programmatic access to Google Flights by
reverse-engineering its API — no scraping, no browser, no API key.

**Probe 1 — install & import (Python 3.14 venv):**
```
$ python3 -m venv .venv && .venv/bin/pip install flights      # EXIT=0
$ .venv/bin/python -c "import fli; from fli.search import SearchFlights"  # imports OK
```

**Probe 2 — live one-way search JFK→LAX, +30 days:**
```
results: 99 for 2026-07-10
price 155.0 dur 355 stops 0
legs [(Airline.DL 'Delta Air Lines', '742', Airport.JFK, Airport.LAX)]
```
→ Real offers, real prices, per-leg airline + flight number. **Adopted.**

**Conclusion:** `fli` satisfies FR-01..FR-04 and FR-06..FR-07. No alternative
needed (the MUST-USE held up). If it had failed, fallbacks were Amadeus
Self-Service (free tier, needs key) or Kiwi/Tequila — both rejected once `fli`
worked, since they require keys (violates NFR-2).

## R2 — API surface actually available (drives the contracts)

From `dir(fli.search)` / `dir(fli.models)` and `model_fields`:

- **Search:** `SearchFlights().search(FlightSearchFilters)` → `list[FlightResult]`.
- **Date prices:** `SearchDates().search(DateSearchFilters)` → `list[DatePrice]`.
- **`FlightSearchFilters`** fields: `trip_type, passenger_info, flight_segments,
  stops, seat_type, sort_by, airlines, max_duration, price_limit, …`.
- **`DateSearchFilters`** adds: `from_date, to_date, duration` (no `sort_by`).
- **`FlightSegment`**: `departure_airport=[[Airport.X, 0]]`,
  `arrival_airport=[[Airport.Y, 0]]`, `travel_date="YYYY-MM-DD"`.
- **`FlightResult`**: `legs, price, currency, duration, stops, layovers,
  co2_emissions_g, primary_airline_name, booking_token, …`.
- **`FlightLeg`**: `airline, flight_number, departure_airport, arrival_airport,
  departure_datetime, arrival_datetime, duration, aircraft, legroom, …`.
- **`DatePrice`**: `date, price, currency`.
- **`PassengerInfo`**: `adults, children, infants_in_seat, infants_on_lap`.

**Enums (for contracts & validation):**
- `SeatType`: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
- `MaxStops`: ANY, NON_STOP, ONE_STOP_OR_FEWER, TWO_OR_FEWER_STOPS
- `SortBy`: TOP_FLIGHTS, BEST, CHEAPEST, DEPARTURE_TIME, ARRIVAL_TIME, DURATION, EMISSIONS
- `TripType`: ROUND_TRIP, ONE_WAY, MULTI_CITY
- `Airport`: **7835** members as `(IATA code, full name)` → backs `resolve_airport`
  (FR-09) and frontend autocomplete; e.g. `('AAA','Anaa Airport')`.

These exact names/types are mirrored 1:1 in `contracts/mcp-tools.md` and
`data-model.md` so the server maps `fli` objects to plain JSON without surprises.

## R3 — Bundled `fli-mcp` vs. our own server

`fli` ships `fli-mcp` (stdio) and `fli-mcp-http` entrypoints exposing
`search_flights` and `search_dates`. We **do not reuse them** because:
- We want **frozen, frontend-shaped JSON contracts** we control (stable field
  names, normalized enums, ISO timestamps) rather than whatever the bundled
  server emits.
- We need a third tool, **`resolve_airport`**, for autocomplete/validation,
  which the bundled server lacks.
- Importing the `fli` *library* still satisfies the MUST-USE requirement while
  giving us full control. → **ADR-0002.**

## R4 — "Tracking": why fare, not aircraft

`fli` returns **no live position/altitude/status** data — confirmed in R2 (no
such fields anywhere in the models). True live tracking would require a second
live API (OpenSky was probed and works — 129 live aircraft in an NYC bbox with
lat/lon/velocity, anonymous/no-key). Per the user's decision we keep a **single
verified source** and reinterpret *tracking* as **fare tracking** (cheapest fare
per date), served by `SearchDates`. → **ADR-0003.** (OpenSky probe retained here
as the evidence behind the scope cut, should the decision ever be revisited.)

## R5 — Frontend ↔ MCP wiring

MCP is server-to-server. A browser can't hold an MCP session cleanly, and doing
so would leak the server location/transport to the client. Chosen wiring: the
**Next.js server** is the MCP client (`@modelcontextprotocol/sdk`,
Streamable-HTTP transport) inside route handlers; the browser calls our own
`/api/*` routes and gets plain JSON. → **ADR-0004.**

## R6 — Environment notes
- Python **3.14** (Homebrew); no global `pip`/`uv` → `mcp-server/.venv`.
- Node **24** + `npm`/`npx` for Next.js.
- The throwaway `.venv-probe/` used for these probes was deleted; the real venv
  is recreated under `mcp-server/.venv` during implementation.
