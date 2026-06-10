# End-to-End Test Report — FLIGHT DECK

- **Date:** 2026-06-11
- **Scope:** the whole stack, against **live** data — Next.js HTTP API (the MCP
  client) → Python MCP server → `fli`/Google Flights, plus the Gemini chat agent
  driving the same MCP tools.
- **Runner:** [`web/scripts/e2e.mjs`](../web/scripts/e2e.mjs) (`cd web && npm run e2e`).
  Assertions map to the acceptance criteria in
  [Spec 001](../specs/001-flight-search-fares/spec.md) and
  [Spec 002](../specs/002-conversational-search/spec.md).

## Summary

| Plane | Result |
|-------|--------|
| **Spec 001 — data (search / fares / airports / errors)** | ✅ **6 / 6 passed** |
| **Spec 002 — conversational agent** | ✅ verified live (real flights returned); automated re-run **throttled by the free-tier LLM** and skipped, by design |
| Crashes / unhandled 500s | none |

The runner exits `0` (no failures). Agent checks are reported **SKIP** (not FAIL)
when the free-tier Gemini key is rate-limited, so the data-plane verdict stands on
its own and the key is not abused.

## Environment
- MCP server: `mcp-server/server.py --http` on `:8000` (Python 3.14 venv).
- Web: `web` (Next.js 16) on `:3000`; API/agent run server-side.
- Model: `gemini-2.5-flash` (free tier). Key server-side only.

## Spec 001 — data plane (actual runner output)
```
[PASS] 001/AC-1 search_flights — BOS-MIA: 5 offers; top DL1399 112 EUR
[PASS] 001/AC-2 cheapest_dates — 15 cells; min 151 max 259
[PASS] 001/AC-3 resolve_airport (metro) — codes=JFK,LGA,EWR,NYS
[PASS] 001/AC-3 resolve_airport (exact) — first=JFK
[PASS] 001/AC-5 structured errors — badAirport=400/BAD_AIRPORT pastDate=400/BAD_DATE
[PASS] 001/AC-4 route validation — status=400/VALIDATION
```
- **AC-1** proves the full search path returns real, structured offers (airline,
  flight number, price, times, stops). The runner tries several routes and passes
  on the first with live results — see *Finding 1*.
- **AC-2** the fare calendar returns one priced cell per date.
- **AC-3** city text → JFK/LGA/EWR; exact code resolves first.
- **AC-4/AC-5** bad airport / past date / missing params → `400` with the
  `{error:{code,message}}` envelope, never a crash.

## Spec 002 — conversational agent (verified live this session)
The agent was exercised through `POST /api/chat` with real prompts. Captured
outputs (the agent calls the MCP tools and reports only real data):

- **AC-1 — natural-language search.** Prompt: *"cheapest nonstop from New York to
  Los Angeles about a month from now."*
  → **2× `search_flights`** tool calls (cities resolved to JFK/LAX), answer:
  > "The cheapest nonstop flights from New York (JFK) to Los Angeles (LAX) on
  > July 10, 2026, are with American Airlines for 172 EUR … flight 255 (14:40→17:48)
  > … flight 300 (21:30→00:54+1)."

- **AC-2 — flexible dates.** Prompt: *"When is it cheapest to fly JFK→LAX in the
  first two weeks of July?"*
  → **2× `cheapest_dates`**, answer:
  > "The cheapest date to fly from JFK to LAX … is July 9, 2026, for 155 EUR."

- **AC-3 / AC-7 — rendering & cockpit UI.** Tool results render inline as
  instrument readout rows / fare grid in the COMMS terminal. See
  [`docs/design/screens/05-comms-answer.png`](design/screens/05-comms-answer.png)
  and `04-comms-intro.png`.

- **AC-6 — secret hygiene.** The Gemini key appears in **0** files in the client
  bundle (`grep -r AIzaSy .next/static` → 0) and **0** files in git history; it is
  read only in the server route.

- **AC-5 — graceful errors.** When the free-tier quota is exhausted, the agent
  streams a friendly assistant message ("the AI service hit its free-tier rate
  limit, please wait a few seconds…") rather than crashing — observed repeatedly
  during this run.

**Automated re-run:** after the test burst the free-tier key was rate-limited, so
the runner's three agent checks reported **SKIP** (`free-tier throttled (verified
live earlier this session)`). This is expected and the key was deliberately not
hammered.

## Findings & fixes

### Finding 1 — Google Flights throttles its detailed-search endpoint (fixed: retry)
`SearchFlights` intermittently returned `None`/empty for some route+date queries
(e.g. JFK→LAX empty on one date, 104 offers on another in the same run; BOS→MIA,
ATL→DEN, LHR→CDG healthy) while `SearchDates` stayed healthy — classic per-route/IP
throttling of Google's detailed-search endpoint (the **ADR-0001 upstream risk**).
**Fix:** the server now **retries on empty/None** (`_search_with_retry`, 3 attempts
with backoff) in [`mcp-server/server.py`](../mcp-server/server.py). This recovered
several previously-empty queries; a genuinely-empty result still returns cleanly
after the retries. The e2e search check also tries multiple routes so it validates
the *path*, not a single throttled pair.

### Finding 2 — Free-tier LLM rate limits (handled, not abused)
Heavy testing exhausted the free-tier per-window quota. The route maps quota errors
to a friendly assistant message (no crash), and the runner backs off and **skips**
rather than retry-storming. For sustained use, raise the quota or set `GEMINI_MODEL`
to another free-tier model (`gemini-2.5-flash-lite`, `gemini-flash-latest`).

### Finding 3 — `convertToModelMessages` is async in AI SDK v6 (fixed earlier)
Passing the un-awaited Promise to `streamText` caused `messages.some is not a
function`; fixed by `await` (commit `7902d76`).

## How to reproduce
```bash
# terminal 1
cd mcp-server && .venv/bin/python server.py --http
# terminal 2
cd web && npm run dev          # ensure web/.env.local has GOOGLE_GENERATIVE_AI_API_KEY
# terminal 3
cd web && npm run e2e          # prints PASS/SKIP/FAIL per acceptance criterion
```
Data-plane checks need no key; agent checks use the free-tier Gemini key and may
SKIP when throttled.

## Verdict
The system works end to end on live data: the MCP server, all three tools, the
HTTP API, error handling, and the Gemini→MCP agent are all functional. The only
non-green items are **upstream/quota** conditions (Google Flights search throttling,
LLM free-tier limits), both **detected, mitigated, and handled gracefully** — no
defects in the application itself.
