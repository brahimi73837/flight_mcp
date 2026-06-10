"""Flight MCP server — wraps the fli library (Google Flights).

Exposes three tools per specs/001-flight-search-fares/contracts/mcp-tools.md:
  - search_flights   : itineraries for a route + date
  - cheapest_dates   : cheapest fare per date across a window (Fare Tracker)
  - resolve_airport  : free-text -> candidate airports (autocomplete/validation)

Run:
  python server.py            # Streamable HTTP on :8000 at /mcp (for the web app)
  python server.py --http     # same
  python server.py --stdio    # stdio (for Claude Desktop / agents)

See ADR-0002 (own server over bundled fli-mcp) and ADR-0004 (transports).
"""

from __future__ import annotations

import sys
import time
from datetime import date, datetime

from mcp.server.fastmcp import FastMCP

import airports
import mapping
from mapping import error

from fli.models import (
    DateSearchFilters,
    FlightSearchFilters,
    FlightSegment,
    PassengerInfo,
    TripType,
)
from fli.search import SearchDates, SearchFlights
from fli.search.exceptions import (
    SearchClientError,
    SearchConnectionError,
    SearchHTTPError,
    SearchTimeoutError,
)

mcp = FastMCP(
    "flight-mcp",
    instructions=(
        "Flight search and fare tracking via Google Flights. Use resolve_airport "
        "to turn place names into IATA codes, search_flights for a specific date, "
        "and cheapest_dates to find the cheapest day across a window."
    ),
    host="127.0.0.1",
    port=8000,
    stateless_http=True,
)

_UPSTREAM = (
    SearchClientError,
    SearchConnectionError,
    SearchHTTPError,
    SearchTimeoutError,
)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _parse_date(value: str, field: str):
    """Validate a YYYY-MM-DD date that is today or later. Raises ValueError."""
    try:
        d = datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be YYYY-MM-DD (got {value!r})")
    if d < date.today():
        raise ValueError(f"{field} {value} is in the past")
    return d


def _resolve_or_raise(token: str, field: str):
    ap = airports.resolve(token)
    if ap is None:
        raise LookupError(f"could not resolve {field} {token!r} to an airport")
    return ap


def _search_with_retry(search_fn, filters, attempts: int = 3, backoff: float = 1.2):
    """Run an fli search, retrying when it returns an empty/None result.

    Google Flights' detailed-search endpoint intermittently returns nothing for a
    query that succeeds on retry (observed: same route empty on one call, full on
    the next). A true "no flights" is rare for real routes, so a few bounded
    retries materially improves reliability (ADR-0001 upstream risk). Raises the
    last upstream exception if every attempt errored.
    """
    last_exc = None
    for attempt in range(attempts):
        try:
            results = search_fn().search(filters)
            if results:
                return results
        except _UPSTREAM as e:
            last_exc = e
        if attempt < attempts - 1:
            time.sleep(backoff)
    if last_exc is not None:
        raise last_exc
    return []


# --------------------------------------------------------------------------- #
# Tools
# --------------------------------------------------------------------------- #
@mcp.tool()
def resolve_airport(query: str, limit: int = 8) -> dict:
    """Resolve free text (code or name) to candidate airports for autocomplete."""
    if not query or not query.strip():
        return error("VALIDATION", "query is required")
    return {"airports": airports.match(query, limit=limit)}


@mcp.tool()
def search_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None = None,
    seat_type: str = "economy",
    max_stops: str = "any",
    adults: int = 1,
    children: int = 0,
    infants: int = 0,
    sort_by: str = "cheapest",
    limit: int = 30,
) -> dict:
    """Search flight itineraries for a route on a specific date (FR-01..FR-05)."""
    try:
        org = _resolve_or_raise(origin, "origin")
        dst = _resolve_or_raise(destination, "destination")
        dep = _parse_date(departure_date, "departure_date")
        seat = mapping.seat_type(seat_type)
        stops = mapping.max_stops(max_stops)
        order = mapping.sort_by(sort_by)
        ret = _parse_date(return_date, "return_date") if return_date else None
    except LookupError as e:
        return error("BAD_AIRPORT", str(e))
    except mapping.ValidationError as e:
        return error("VALIDATION", str(e))
    except ValueError as e:
        return error("BAD_DATE", str(e))

    segments = [
        FlightSegment(
            departure_airport=[[org, 0]],
            arrival_airport=[[dst, 0]],
            travel_date=dep.strftime("%Y-%m-%d"),
        )
    ]
    if ret:
        segments.append(
            FlightSegment(
                departure_airport=[[dst, 0]],
                arrival_airport=[[org, 0]],
                travel_date=ret.strftime("%Y-%m-%d"),
            )
        )

    filters = FlightSearchFilters(
        trip_type=TripType.ROUND_TRIP if ret else TripType.ONE_WAY,
        passenger_info=PassengerInfo(
            adults=max(1, adults), children=children, infants_in_seat=infants
        ),
        flight_segments=segments,
        stops=stops,
        seat_type=seat,
        sort_by=order,
    )

    try:
        results = _search_with_retry(SearchFlights, filters)
    except _UPSTREAM as e:
        return error("UPSTREAM", f"Google Flights search failed: {e}")
    except Exception as e:  # defensive: never leak a traceback (FR-05)
        return error("UPSTREAM", f"unexpected search error: {e}")

    offers = [mapping.offer_to_dict(r) for r in results[: max(1, limit)]]
    return {
        "offers": offers,
        "query": {
            "origin": org.name,
            "destination": dst.name,
            "departure_date": departure_date,
            "return_date": return_date,
            "seat_type": seat_type,
            "max_stops": max_stops,
            "sort_by": sort_by,
            "passengers": {"adults": adults, "children": children, "infants": infants},
        },
    }


@mcp.tool()
def cheapest_dates(
    origin: str,
    destination: str,
    from_date: str,
    to_date: str,
    trip_duration: int | None = None,
    seat_type: str = "economy",
) -> dict:
    """Cheapest fare per date across a window for the Fare Tracker (FR-06..FR-07)."""
    try:
        org = _resolve_or_raise(origin, "origin")
        dst = _resolve_or_raise(destination, "destination")
        start = _parse_date(from_date, "from_date")
        end = _parse_date(to_date, "to_date")
        seat = mapping.seat_type(seat_type)
    except LookupError as e:
        return error("BAD_AIRPORT", str(e))
    except mapping.ValidationError as e:
        return error("VALIDATION", str(e))
    except ValueError as e:
        return error("BAD_DATE", str(e))
    if end < start:
        return error("BAD_DATE", "to_date must be on or after from_date")

    round_trip = bool(trip_duration)
    filters = DateSearchFilters(
        trip_type=TripType.ROUND_TRIP if round_trip else TripType.ONE_WAY,
        passenger_info=PassengerInfo(adults=1),
        flight_segments=[
            FlightSegment(
                departure_airport=[[org, 0]],
                arrival_airport=[[dst, 0]],
                travel_date=start.strftime("%Y-%m-%d"),
            )
        ],
        seat_type=seat,
        from_date=start.strftime("%Y-%m-%d"),
        to_date=end.strftime("%Y-%m-%d"),
        duration=trip_duration if round_trip else None,
    )

    try:
        prices = SearchDates().search(filters) or []
    except _UPSTREAM as e:
        return error("UPSTREAM", f"Google Flights date search failed: {e}")
    except Exception as e:
        return error("UPSTREAM", f"unexpected date search error: {e}")

    cells = [mapping.fare_to_dict(p) for p in prices]
    return {
        "cells": cells,
        "query": {
            "origin": org.name,
            "destination": dst.name,
            "from_date": from_date,
            "to_date": to_date,
            "trip_duration": trip_duration,
            "seat_type": seat_type,
        },
    }


# --------------------------------------------------------------------------- #
# Entrypoint — transport selection (ADR-0004)
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    transport = "streamable-http"
    if "--stdio" in sys.argv:
        transport = "stdio"
    elif "--sse" in sys.argv:
        transport = "sse"
    mcp.run(transport=transport)
