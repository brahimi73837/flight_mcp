"""Airport resolution over fli's Airport enum (FR-09).

`fli.models.Airport` has 7835 members where ``member.name`` is the IATA 3-letter
code and ``member.value`` is the full airport name. We expose a small matcher
used both by the ``resolve_airport`` tool and to turn free-text origin/destination
into a concrete airport inside ``search_flights`` / ``cheapest_dates``.
"""

from __future__ import annotations

from functools import lru_cache

from fli.models import Airport

# Precomputed (code, name, lowercased haystacks) for fast scanning.
_INDEX = [
    (a.name, a.value, a.name.lower(), a.value.lower())
    for a in Airport
]

# fli's Airport enum stores airport *names*, not city names, so a query like
# "new york" can't reach JFK/LGA/EWR by substring. This curated metro->airports
# table bridges common city searches to their primary airports (convenience
# only; the substring matcher still handles everything else).
_CITY_ALIASES: dict[str, list[str]] = {
    "new york": ["JFK", "LGA", "EWR"],
    "nyc": ["JFK", "LGA", "EWR"],
    "london": ["LHR", "LGW", "LCY", "STN", "LTN"],
    "paris": ["CDG", "ORY"],
    "tokyo": ["HND", "NRT"],
    "los angeles": ["LAX"],
    "la": ["LAX"],
    "chicago": ["ORD", "MDW"],
    "san francisco": ["SFO"],
    "bay area": ["SFO", "OAK", "SJC"],
    "washington": ["IAD", "DCA", "BWI"],
    "dc": ["IAD", "DCA", "BWI"],
    # major US metros whose primary airport name does NOT contain the city name
    # (e.g. Boston's BOS = "General Edward Lawrence Logan Intl"), so substring
    # matching alone would pick the wrong airport.
    "boston": ["BOS"],
    "miami": ["MIA", "FLL"],
    "atlanta": ["ATL"],
    "denver": ["DEN"],
    "seattle": ["SEA"],
    "dallas": ["DFW", "DAL"],
    "houston": ["IAH", "HOU"],
    "phoenix": ["PHX"],
    "las vegas": ["LAS"],
    "vegas": ["LAS"],
    "orlando": ["MCO"],
    "san diego": ["SAN"],
    "milan": ["MXP", "LIN", "BGY"],
    "moscow": ["SVO", "DME", "VKO"],
    "dubai": ["DXB", "DWC"],
    "istanbul": ["IST", "SAW"],
    "bangkok": ["BKK", "DMK"],
    "seoul": ["ICN", "GMP"],
    "rome": ["FCO", "CIA"],
    "berlin": ["BER"],
    "toronto": ["YYZ", "YTZ"],
}


def match(query: str, limit: int = 8) -> list[dict]:
    """Return ranked airport candidates for free text.

    Ranking: exact code > code prefix > name word-prefix > substring. Stable and
    deterministic so autocomplete and origin/destination resolution agree.
    """
    q = (query or "").strip().lower()
    if not q:
        return []

    # City aliases first (rank -1 so they precede substring hits), de-duplicated.
    out: list[dict] = []
    seen: set[str] = set()
    if q in _CITY_ALIASES:
        for code in _CITY_ALIASES[q]:
            if code in Airport.__members__ and code not in seen:
                seen.add(code)
                out.append({"code": code, "name": Airport[code].value})

    scored: list[tuple[int, str, dict]] = []
    for code, name, code_l, name_l in _INDEX:
        score: int | None = None
        if code_l == q:
            score = 0
        elif code_l.startswith(q):
            score = 1
        elif any(w.startswith(q) for w in name_l.split()):
            score = 2
        elif q in name_l:
            score = 3
        if score is not None:
            scored.append((score, code, {"code": code, "name": name}))

    scored.sort(key=lambda t: (t[0], t[1]))
    for _, code, item in scored:
        if code not in seen:
            seen.add(code)
            out.append(item)
    return out[:limit]


@lru_cache(maxsize=2048)
def resolve(token: str) -> Airport | None:
    """Resolve a single origin/destination token to one Airport enum member.

    An exact 3-letter code wins outright; otherwise the top-ranked match is used.
    Returns ``None`` when nothing matches (caller raises BAD_AIRPORT).
    """
    t = (token or "").strip()
    if not t:
        return None
    if len(t) == 3 and t.upper() in Airport.__members__:
        return Airport[t.upper()]
    hits = match(t, limit=1)
    if not hits:
        return None
    return Airport[hits[0]["code"]]
