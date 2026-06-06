"""Map fli models to the frozen JSON data-model (see specs/.../data-model.md).

Centralizes the upstream-shape risk from ADR-0001: if fli's models change, this
is the only file to touch. All functions return plain JSON-safe dicts.
"""

from __future__ import annotations

import hashlib
from datetime import date, datetime

from fli.models import MaxStops, SeatType, SortBy

# ---------------------------------------------------------------------------
# Enum bridges: contract strings <-> fli enums (data-model.md)
# ---------------------------------------------------------------------------

SEAT_TYPES = {
    "economy": SeatType.ECONOMY,
    "premium_economy": SeatType.PREMIUM_ECONOMY,
    "business": SeatType.BUSINESS,
    "first": SeatType.FIRST,
}

MAX_STOPS = {
    "any": MaxStops.ANY,
    "non_stop": MaxStops.NON_STOP,
    "one_stop_or_fewer": MaxStops.ONE_STOP_OR_FEWER,
    "two_or_fewer_stops": MaxStops.TWO_OR_FEWER_STOPS,
}

SORT_BY = {
    "top": SortBy.TOP_FLIGHTS,
    "best": SortBy.BEST,
    "cheapest": SortBy.CHEAPEST,
    "departure": SortBy.DEPARTURE_TIME,
    "arrival": SortBy.ARRIVAL_TIME,
    "duration": SortBy.DURATION,
    "emissions": SortBy.EMISSIONS,
}


class ValidationError(ValueError):
    """Raised on a bad enum string; surfaced as a VALIDATION error envelope."""


def seat_type(value: str) -> SeatType:
    try:
        return SEAT_TYPES[(value or "economy").lower()]
    except KeyError as e:
        raise ValidationError(f"unknown seat_type '{value}'") from e


def max_stops(value: str) -> MaxStops:
    try:
        return MAX_STOPS[(value or "any").lower()]
    except KeyError as e:
        raise ValidationError(f"unknown max_stops '{value}'") from e


def sort_by(value: str) -> SortBy:
    try:
        return SORT_BY[(value or "cheapest").lower()]
    except KeyError as e:
        raise ValidationError(f"unknown sort_by '{value}'") from e


# ---------------------------------------------------------------------------
# fli result objects -> data-model JSON
# ---------------------------------------------------------------------------

def _iso(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def leg_to_dict(leg) -> dict:
    airline = leg.airline
    return {
        "airline": getattr(airline, "value", str(airline)),       # full name
        "airlineCode": getattr(airline, "name", str(airline)),    # IATA code
        "flightNumber": str(leg.flight_number),
        "from": getattr(leg.departure_airport, "name", str(leg.departure_airport)),
        "to": getattr(leg.arrival_airport, "name", str(leg.arrival_airport)),
        "departure": _iso(leg.departure_datetime),
        "arrival": _iso(leg.arrival_datetime),
        "durationMinutes": leg.duration,
        "aircraft": getattr(leg, "aircraft", None),
    }


def offer_to_dict(result) -> dict:
    legs = [leg_to_dict(l) for l in result.legs]
    primary = (
        getattr(result, "primary_airline_name", None)
        or (legs[0]["airline"] if legs else None)
    )
    raw = f"{primary}|{result.price}|" + "|".join(
        f"{l['airlineCode']}{l['flightNumber']}@{l['departure']}" for l in legs
    )
    return {
        "id": hashlib.sha1(raw.encode()).hexdigest()[:12],
        "price": result.price,
        "currency": result.currency,
        "durationMinutes": result.duration,
        "stops": result.stops,
        "legs": legs,
        "primaryAirline": primary,
        "co2Grams": getattr(result, "co2_emissions_g", None),
        "basicEconomy": bool(getattr(result, "is_basic_economy", False)),
    }


def fare_to_dict(dp) -> dict:
    # fli's DatePrice.date is a 1-tuple wrapping a datetime; unwrap and emit a
    # plain YYYY-MM-DD (the FareCell contract).
    raw = dp.date
    if isinstance(raw, (tuple, list)) and raw:
        raw = raw[0]
    day = raw.date().isoformat() if isinstance(raw, datetime) else _iso(raw)
    return {
        "date": day,
        "price": dp.price,
        "currency": getattr(dp, "currency", None),
    }


# ---------------------------------------------------------------------------
# Error envelope (data-model.md / FR-05)
# ---------------------------------------------------------------------------

def error(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}
