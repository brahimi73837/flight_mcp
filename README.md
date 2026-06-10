# FLIGHT DECK — Flight Search, Fare Tracker & AI Assistant

An avionics-grade flight app, built **spec-first**. A Python **MCP server** wraps
the [`fli`](https://github.com/punitarani/fli) library (Google Flights) and
exposes clean tools; a **Next.js** frontend with a **cockpit instrumentation**
aesthetic consumes them — both through a manual instrument UI and through a
**conversational AI assistant** (Google Gemini) that uses the **MCP server as its
toolset**.

This is a portfolio project demonstrating two things end to end:
1. **Spec-driven development** (GitHub spec-kit style) — every decision is written
   down *before* the code, and `git log` replays the build in order.
2. **The Model Context Protocol (MCP)** as the integration backbone — the same MCP
   tools power the manual UI, the API, an LLM agent, and Claude Desktop.

Two feature specs: [001 search & fares](specs/001-flight-search-fares/spec.md) ·
[002 conversational search](specs/002-conversational-search/spec.md).

---

## What it does
- **Assistant (the point of the project)** — type in plain language ("cheapest
  nonstop NYC→LA about a month out", "when's cheapest JFK→LAX in early July?").
  **Gemini** resolves airports, infers dates, and calls the **MCP tools** itself,
  then the chat renders the *real* results as instrument readouts. You never search
  manually.
- **Search** — origin, destination, date → real itineraries as MFD readout rows:
  cyan times, flight number, a routing **duration arc** with stop dots, and a
  radial **price gauge**.
- **Fare Track** — a route + date window → a heat-graded calendar of the cheapest
  fare per day (green → amber → red). Click a day to drill into its flights.
- **Airport autocomplete** — free text ("new york") resolves to airports
  (JFK/LGA/EWR) over `fli`'s 7835-airport enum + a curated metro-alias table.

Real Google Flights data via `fli` (no key). The assistant needs a free Google AI
Studio key (server-side only).

## Architecture
```
Browser (cockpit UI)
   │  /api/search|fares|airports (JSON)          /api/chat (streamed)
   ▼                                                 ▼
Next.js route handlers                       Next.js /api/chat
   │                                            │  streamText(Gemini, tools)
   │                                            │  tool.execute() ↓
   └──────── MCP client (Streamable HTTP) ──────┴──► flight-mcp (Python, FastMCP)
        web/lib/mcp.ts                                  mcp-server/server.py
                                                            │ imports
                                                            ▼
                                                        fli → Google Flights
```
The browser never speaks MCP — server routes are the MCP client. The **AI
assistant** is just Gemini whose three tools `execute()` straight into that same
MCP client, so its toolset *is* the MCP server (no hallucinated flights). The MCP
server also runs over **stdio** for Claude Desktop. See
[ADR-0004](docs/adr/0004-mcp-transport-and-frontend-wiring.md),
[ADR-0007](docs/adr/0007-conversational-agent-over-mcp.md).

---

## Getting started (manual, step by step)

### Prerequisites
- **Python 3.12+** (built on 3.14) and **Node 20+** (built on 24, with `npm`).
- No paid services. The Search and Fare-Track features need **no key**; the
  **Assistant** needs a free **Google AI Studio** API key.

### 1 — Clone
```bash
git clone https://github.com/brahimi73837/flight_mcp.git
cd flight_mcp
```

### 2 — Start the MCP server (terminal 1)
```bash
cd mcp-server
python3 -m venv .venv                       # create an isolated environment
.venv/bin/pip install -r requirements.txt   # installs fli (`flights`) + mcp SDK
.venv/bin/python server.py --http           # Streamable HTTP on http://127.0.0.1:8000/mcp
```
Leave it running. (For Claude Desktop instead, run `server.py --stdio` — see
[`mcp-server/README.md`](mcp-server/README.md).)

### 3 — Configure the web app (terminal 2)
```bash
cd web
npm install
cp .env.example .env.local
```
Open `web/.env.local` and set your key for the Assistant (the other tabs work
without it):
```
FLIGHT_MCP_URL=http://127.0.0.1:8000/mcp
GOOGLE_GENERATIVE_AI_API_KEY=YOUR_FREE_KEY   # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash
```
> The key is read **server-side only** — it is never sent to the browser and
> `.env.local` is gitignored, so it never lands in git.

### 4 — Start the web app
```bash
npm run dev                                 # http://localhost:3000
```

### 5 — Use it
Open **http://localhost:3000**. Three modes via the top-right rocker toggle:

- **SEARCH** — type a route (e.g. `JFK` → `LAX`, or just "new york"), pick a date,
  optionally set cabin/stops, hit **Execute Search**. Offers appear as readout
  rows with price gauges.
- **FARE TRACK** — set a route and a date window, **Scan Fares**. A heat calendar
  shows the cheapest fare per day; click any day to drill into that day's flights.
- **ASSISTANT** — just talk. Try:
  - *"Cheapest nonstop from New York to Los Angeles about a month from now"*
  - *"When is it cheapest to fly JFK to LAX in early July?"*
  - follow up: *"make it business class"*
  The assistant calls the MCP tools and renders the real flights inline.

### 6 — (Optional) Use the MCP server from Claude Desktop
The same server speaks **stdio**, so any MCP client can use the flight tools.
Config snippet in [`mcp-server/README.md`](mcp-server/README.md).

## Testing
End-to-end runner (with both servers up):
```bash
cd web && npm run e2e
```
It exercises the whole stack against live data — the HTTP API (search / fares /
airports / error handling) and the Gemini agent driving the MCP tools — and prints
`PASS`/`SKIP`/`FAIL` per acceptance criterion. It is deliberately tolerant of the
two **external** conditions this project can hit: Google Flights throttling its
search endpoint (the server retries; the test tries several routes) and the LLM
free-tier rate limit (the agent shows a friendly message and the test skips rather
than fail). See [`specs/001-…/quickstart.md`](specs/001-flight-search-fares/quickstart.md)
for the per-criterion checklist.

## Repo layout / where the learning lives
| path | what |
|------|------|
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | the 7 governing principles |
| [`specs/001-flight-search-fares/`](specs/001-flight-search-fares/) | spec + research + plan + data-model + contracts + tasks + quickstart |
| [`specs/002-conversational-search/`](specs/002-conversational-search/) | the AI-assistant spec, plan, chat-API contract, tasks |
| [`docs/adr/`](docs/adr/) | one ADR per meaningful decision (0001–0008) |
| [`docs/design/cockpit-language.md`](docs/design/cockpit-language.md) | the design language + tokens |
| [`mcp-server/`](mcp-server/) | the Python MCP server (3 tools, fli mapping, airport matcher) |
| [`web/`](web/) | the Next.js cockpit frontend (`app/api/chat`, `lib/flightTools.ts`, `components/Comms.tsx`) |

## How to replay the build
`git log --oneline` reads top-to-bottom as: **constitution → spec + research →
ADRs + design → plan + contracts + tasks → MCP server → web API → cockpit UI →
AI assistant.** Implementation commits reference the `tasks.md` IDs (`T0xx`/`T2xx`).

## Key decisions (full reasoning in `docs/adr/`)
1. **`fli` is the single data source** — adopted only after a live probe returned
   99 real JFK→LAX offers ([ADR-0001](docs/adr/0001-fli-as-flight-data-source.md)).
2. **Our own MCP server** wraps the `fli` library (vs reusing bundled `fli-mcp`)
   to freeze frontend-shaped JSON and add `resolve_airport`
   ([ADR-0002](docs/adr/0002-custom-mcp-server-over-bundled-fli-mcp.md)).
3. **"Tracking" = fare tracking, not live aircraft** — `fli` has no live position
   data; we kept one source ([ADR-0003](docs/adr/0003-fare-tracking-not-live-aircraft-tracking.md)).
4. **MCP over Streamable HTTP; Next.js server is the MCP client**
   ([ADR-0004](docs/adr/0004-mcp-transport-and-frontend-wiring.md)).
5. **Cockpit-instrumentation design language**
   ([ADR-0005](docs/adr/0005-cockpit-instrumentation-design-language.md)).
6. **Spec-kit replicated by hand** + commit discipline
   ([ADR-0006](docs/adr/0006-spec-kit-style-process.md)).
7. **Conversational agent via Vercel AI SDK**, tools execute through the MCP
   client (v6 dropped the in-core MCP client)
   ([ADR-0007](docs/adr/0007-conversational-agent-over-mcp.md)).
8. **Gemini `gemini-2.5-flash`** (free-tier verified) with **server-only key**
   handling ([ADR-0008](docs/adr/0008-gemini-model-and-secret-handling.md)).

## Tech
Python 3.14 · `flights` (fli) · `mcp` (FastMCP) · Next.js 16 (App Router, TS) ·
`@modelcontextprotocol/sdk` · Vercel **AI SDK v6** + `@ai-sdk/google` (Gemini) ·
Motion · IBM Plex Mono + Saira.

> Disclaimer: `fli` uses Google Flights' private API (unofficial). For learning
> and personal use; prices are indicative. Google may rate-limit heavy use from a
> single IP — the server retries and the UI degrades gracefully.
