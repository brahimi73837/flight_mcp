# flight-mcp — Flight Search & Fare Tracker MCP server

A Model Context Protocol server that wraps the [`fli`](https://github.com/punitarani/fli)
library (Google Flights) and exposes three tools shaped for the frontend. See
[ADR-0002](../docs/adr/0002-custom-mcp-server-over-bundled-fli-mcp.md) for why
this is a custom server, and
[`contracts/mcp-tools.md`](../specs/001-flight-search-fares/contracts/mcp-tools.md)
for the frozen tool interface.

## Tools
| tool | purpose |
|------|---------|
| `search_flights` | Itineraries for a route + date (filters: cabin, stops, passengers, sort). |
| `cheapest_dates` | Cheapest fare per date across a window (Fare Tracker). |
| `resolve_airport` | Free text → candidate airports (autocomplete / validation). |

All return plain JSON; failures return `{ "error": { "code", "message" } }`
(`BAD_AIRPORT` / `BAD_DATE` / `VALIDATION` / `UPSTREAM`).

## Setup
```bash
cd mcp-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Run
```bash
# Streamable HTTP on http://127.0.0.1:8000/mcp  (used by the Next.js web app)
.venv/bin/python server.py            # or: --http

# stdio  (for Claude Desktop / other MCP clients)
.venv/bin/python server.py --stdio
```

## Files
- `server.py` — FastMCP server, the three tools, transport selection.
- `mapping.py` — fli models → frozen JSON data-model; enum bridges; error envelope.
- `airports.py` — airport matcher over fli's 7835-entry `Airport` enum + a curated
  metro-alias table (so "new york" → JFK/LGA/EWR).

## Use from Claude Desktop (stdio)
```json
{
  "mcpServers": {
    "flight-mcp": {
      "command": "/absolute/path/to/mcp-server/.venv/bin/python",
      "args": ["/absolute/path/to/mcp-server/server.py", "--stdio"]
    }
  }
}
```

## Notes
- No API key required; `fli` talks to Google Flights' private API (ADR-0001).
- Currency follows `fli`'s geo default (e.g. `EUR`/`USD`); passed through untouched.
- A live search can take a few seconds; upstream errors surface as `UPSTREAM`.
