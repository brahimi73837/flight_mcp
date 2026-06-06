# Data Model — Spec 001

> The normalized entities our MCP server emits and the frontend consumes. These
> are the **plain-JSON projections** of `fli`'s models (research R2). Field names
> here are frozen and mirrored in `contracts/`.

## Airport
| field | type | notes |
|-------|------|-------|
| `code` | string | IATA 3-letter, uppercase (e.g. `JFK`) — from `Airport.name` |
| `name` | string | full airport name — from `Airport.value` |

Source: `fli.models.Airport` enum (7835 members).

## Leg
One operated flight segment within an offer.
| field | type | notes |
|-------|------|-------|
| `airline` | string | airline full name (e.g. `Delta Air Lines`) |
| `airlineCode` | string | IATA airline code (e.g. `DL`) — from enum name |
| `flightNumber` | string | e.g. `742` |
| `from` | string | departure IATA code |
| `to` | string | arrival IATA code |
| `departure` | string | ISO-8601 local datetime |
| `arrival` | string | ISO-8601 local datetime |
| `durationMinutes` | number | leg duration |
| `aircraft` | string \| null | e.g. `Airbus A321` |

Source: `fli.models.FlightLeg`.

## FlightOffer
A bookable itinerary for the searched date (a list of legs).
| field | type | notes |
|-------|------|-------|
| `id` | string | stable hash of legs+price (frontend keys) |
| `price` | number | total price |
| `currency` | string | e.g. `USD` |
| `durationMinutes` | number | total trip duration |
| `stops` | number | 0 = non-stop |
| `legs` | `Leg[]` | ordered |
| `primaryAirline` | string | marketing carrier name |
| `co2Grams` | number \| null | emissions, if present |
| `basicEconomy` | boolean | true if basic-economy fare |

Source: `fli.models.FlightResult`.

## FareCell
One cheapest-fare data point for a date (the Fare Tracker).
| field | type | notes |
|-------|------|-------|
| `date` | string | `YYYY-MM-DD` |
| `price` | number | cheapest fare departing that date |
| `currency` | string | e.g. `USD` |

Source: `fli.search.DatePrice`. The frontend derives `min`/`max` across the set
to color the heatmap (no server-side color logic).

## Enums (string-valued in JSON; validated server-side against `fli`)
- `SeatType`: `economy | premium_economy | business | first`
- `MaxStops`: `any | non_stop | one_stop_or_fewer | two_or_fewer_stops`
- `SortBy`: `top | best | cheapest | departure | arrival | duration | emissions`
- `TripType`: implicit — `return_date` present ⇒ round trip, else one-way.

## Error envelope (FR-05, NFR-4)
Every tool/route failure returns:
```json
{ "error": { "code": "BAD_AIRPORT|BAD_DATE|UPSTREAM|VALIDATION", "message": "human-readable" } }
```
Never a stack trace, never an opaque 500.
