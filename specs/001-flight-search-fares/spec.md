# Spec 001 — Flight Search & Fare Tracker

- **Feature:** `001-flight-search-fares`
- **Status:** Accepted
- **Created:** 2026-06-10
- **Constitution:** [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)

> This document describes **what** we are building and **why**. The **how** lives
> in [`plan.md`](./plan.md). Requirements are testable; each has an ID (`FR-xx`).

---

## 1. Problem & intent

People comparing flights juggle two distinct questions:

1. **"What can I fly on this date?"** — concrete itineraries with prices, times,
   stops, and airlines for a fixed route and day.
2. **"When is this route cheapest?"** — how fare varies across a window of dates,
   so they can shift their trip a few days to save.

Most travel UIs answer these in a flat, generic, ad-heavy interface. We build a
focused, **instrument-grade** tool that answers both crisply, backed by real
Google Flights data via the `fli` library, and exposed through an **MCP server**
so the same capability is reusable by any MCP client (our frontend, Claude
Desktop, future agents).

## 2. Scope

**In scope**
- One-way and round-trip **flight search** for a route + date(s) with filters
  (cabin class, max stops, passengers, sort order).
- **Fare tracking** = a cheapest-by-date calendar across a date window for a
  route (the "track fares over time" reading of *tracking*).
- **Airport resolution** — turn user text ("jfk", "new york", "kennedy") into a
  valid IATA airport for the other two features.
- An MCP server exposing the above as tools, plus a Next.js cockpit frontend
  consuming them server-side.

**Out of scope (with rationale → ADR-0003)**
- **Live aircraft tracking** (real-time positions/altitude). `fli` does not
  provide it; adding a second live API was explicitly deprioritized to keep one
  verified data source. "Tracking" is delivered as **fare tracking** instead.
- Booking/payment, user accounts, persistence, price-drop notifications.

## 3. Users & stories

**U1 — The date-fixed comparer.** Knows when they must travel.
> *As a traveler with fixed dates, I enter origin, destination, and date and see
> the day's flights ranked by price (or duration), with stops, times, airline,
> and flight number, so I can pick an itinerary.*

**U2 — The flexible saver.** Can move their trip to save money.
> *As a flexible traveler, I enter a route and a date window and see a calendar
> of the cheapest fare per day, so I can spot the cheapest day and drill into
> that day's flights.*

**U3 — The fast typist.** Doesn't know exact IATA codes.
> *As a user typing "new york", I get airport suggestions to choose from, so my
> search targets a real airport.*

## 4. Functional requirements

### Search (U1)
- **FR-01** Given origin, destination, and a departure date, the system returns a
  ranked list of flight offers for that date.
- **FR-02** Each offer exposes: total price + currency, total duration, stop
  count, and per-leg detail (airline name, flight number, departure & arrival
  airport codes, departure & arrival timestamps).
- **FR-03** Search accepts filters: cabin class (economy / premium economy /
  business / first), max stops (any / non-stop / ≤1 / ≤2), passenger counts
  (adults, children, infants), and sort order (cheapest / duration / departure /
  arrival, etc.).
- **FR-04** Search optionally accepts a **return date**; when present, results
  are priced as round trips.
- **FR-05** Invalid input (unknown airport, malformed/past date) yields a clear,
  structured error rather than a crash.

### Fare tracking (U2)
- **FR-06** Given a route and a `[from_date, to_date]` window, the system returns
  one cheapest-fare cell **per candidate date** (`{date, price, currency}`).
- **FR-07** Round-trip fare tracking accepts a trip **duration** (nights) so each
  cell prices a round trip of that length departing on that date.
- **FR-08** The frontend renders the cells as a **heatmap calendar** (relative
  price → color) and lets the user pick a day to run a full FR-01 search for it.

### Airport resolution (U3)
- **FR-09** Given a free-text query, the system returns matching airports
  (IATA code + name), ranked, suitable for autocomplete; an exact 3-letter code
  resolves to that airport first.

### Platform / integration
- **FR-10** All three capabilities are exposed as **MCP tools** with frozen
  input/output contracts (`contracts/mcp-tools.md`).
- **FR-11** The MCP server runs over **Streamable HTTP** (for the web server)
  and **stdio** (for desktop MCP clients) from one codebase.
- **FR-12** The browser never calls MCP directly; **Next.js server route
  handlers** act as the MCP client and return plain JSON (`contracts/api-routes.md`).

## 5. Non-functional requirements
- **NFR-1 (Design)** The UI commits fully to the **cockpit instrumentation**
  aesthetic (ADR-0005, `docs/design/cockpit-language.md`); no generic AI-slop.
- **NFR-2 (No secrets)** No API keys or paid services anywhere in the stack.
- **NFR-3 (Replayable)** Build is documented so `git log` replays it in order.
- **NFR-4 (Resilience)** Upstream (Google Flights) errors/timeouts surface as
  structured tool/route errors, never as opaque 500s with stack traces.

## 6. Acceptance criteria
- **AC-1** A live `JFK→LAX` search ~30 days out returns multiple real offers with
  populated price, duration, stops, and per-leg airline/flight-number/time. *(FR-01–FR-03)*
- **AC-2** A live fare-tracking call over a 2-week window returns a cell per date
  with real prices, and the frontend shows them as a color-graded calendar whose
  cells drill into that day's search. *(FR-06, FR-08)*
- **AC-3** `resolve_airport("new york")` returns JFK/LGA/EWR-class results;
  `resolve_airport("jfk")` returns JFK first. *(FR-09)*
- **AC-4** `curl` against `/api/search`, `/api/fares`, `/api/airports` returns
  normalized JSON matching the contracts. *(FR-10, FR-12)*
- **AC-5** Bad input (`XXX→LAX`, a past date) returns a structured error, not a
  crash. *(FR-05)*
- **AC-6** The frontend is visually distinctive and unmistakably aviation-cockpit,
  not a generic travel UI. *(NFR-1)*

## 7. Clarifications (resolved)
- **Q: Does "tracking" mean live aircraft tracking?** → **No.** `fli` has no live
  position data; per the user we keep a single verified source and deliver
  **fare tracking** (cheapest-by-date). See ADR-0003.
- **Q: Reuse the bundled `fli-mcp` server, or build our own?** → **Build our own**
  thin MCP wrapping the `fli` *library*, to freeze frontend-shaped JSON contracts
  and add `resolve_airport`. See ADR-0002.
- **Q: How does a React browser consume MCP tools?** → It doesn't directly; the
  Next.js server is the MCP client. See ADR-0004.

## 8. Review checklist
- [x] Every story maps to ≥1 FR; every FR is testable.
- [x] Scope cuts are justified and linked to an ADR.
- [x] Acceptance criteria reference live data, not mocks.
- [x] Contracts are named and will be frozen before frontend work.
- [x] Complies with all seven constitution principles.
