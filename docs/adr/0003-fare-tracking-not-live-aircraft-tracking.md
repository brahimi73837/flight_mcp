# ADR-0003 — Deliver "tracking" as fare tracking, not live aircraft tracking

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** spec §2 (scope), FR-06..FR-08; research R4

## Context
The brief calls for a "flight search **and tracking** app." `fli` provides
search/pricing only — it returns **no** live position, altitude, or status data
(confirmed: no such fields in any `fli` model, research R2/R4). Real-time
aircraft tracking would require a **second** live data source.

A free, no-key option exists and was probed: **OpenSky Network** returned 129
live aircraft in an NYC bounding box with lat/lon/velocity/callsign (research R4).
So live tracking is *technically* feasible.

## Decision
**Do not** add live aircraft tracking. Keep a **single verified data source**
(`fli`) and reinterpret "tracking" as **fare tracking**: a cheapest-fare-per-date
calendar over a date window (FR-06..FR-08), powered by `fli`'s `SearchDates`.

This reflects an explicit product decision made during planning (search-only,
single source) over the alternative of adding OpenSky.

## Consequences
- **+** One data source, no second integration, no map/geo stack, smaller surface.
- **+** "Tracking" still has real meaning and utility: track how a route's fare
  moves across dates and pick the cheapest day.
- **−** No live map of planes in the sky. If that's wanted later, the OpenSky
  probe in research R4 is the documented starting point and this ADR would be
  superseded.

## Alternatives considered
- **Add OpenSky live tracking (2nd source).** Feasible and free (probe passed),
  but adds a geo/map UI and a second upstream to keep healthy. Deferred.
- **Drop "tracking" entirely, search-only.** Rejected as too thin — fare tracking
  reuses the same source for a genuinely distinct, useful second pillar.
