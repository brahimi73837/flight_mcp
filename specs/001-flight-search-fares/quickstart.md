# Quickstart — run it end to end

Two processes: the Python **MCP server** and the **Next.js** app (ADR-0004).

## 0. Prerequisites
- Python 3.12+ (built on 3.14), Node 20+ (built on 24). No API keys.

## 1. Start the MCP server
```bash
cd mcp-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python server.py --http      # Streamable HTTP on http://127.0.0.1:8000/mcp
```

## 2. Start the web app (new terminal)
```bash
cd web
npm install
cp .env.example .env.local              # FLIGHT_MCP_URL=http://127.0.0.1:8000/mcp
npm run dev                             # http://localhost:3000
```
Open http://localhost:3000 → enter a route (e.g. JFK → LAX), **Execute Search**;
toggle **Fare Track** → **Scan Fares**; click a calendar cell to drill into that day.

## 3. Verify the acceptance criteria

**MCP tools (direct, from `mcp-server/`):**
```bash
.venv/bin/python - <<'PY'
import server
from datetime import date, timedelta
dep=(date.today()+timedelta(days=30)).isoformat()
print('AC-1', len(server.search_flights('JFK','LAX',dep)['offers']), 'offers')
print('AC-3', [a['code'] for a in server.resolve_airport('new york')['airports'][:3]])
print('AC-5', server.search_flights('XXX','LAX',dep)['error']['code'])
PY
```

**HTTP API (with both servers running):**
```bash
curl "http://localhost:3000/api/airports?q=new%20york&limit=4"
curl "http://localhost:3000/api/search?origin=JFK&destination=LAX&departure_date=$(date -v+30d +%F)&max_stops=non_stop&limit=3"
curl "http://localhost:3000/api/fares?origin=JFK&destination=LAX&from_date=$(date -v+21d +%F)&to_date=$(date -v+35d +%F)"
curl -i "http://localhost:3000/api/search?origin=ZZZ&destination=LAX&departure_date=$(date -v+30d +%F)"  # -> 400 BAD_AIRPORT
```

| Criterion | Check |
|-----------|-------|
| AC-1 search | `/api/search` returns real offers (price, duration, stops, legs) |
| AC-2 fares  | `/api/fares` returns a cell per date; UI shows a heat calendar that drills in |
| AC-3 airport| `resolve_airport('new york')` → JFK/LGA/EWR; `'jfk'` first |
| AC-4 routes | all three `/api/*` return contract JSON |
| AC-5 errors | bad airport/past date/bad enum → 400 envelope |
| AC-6 design | cockpit aesthetic (see `docs/design/screens/`) |

## 4. (Optional) Claude Desktop
Point Claude Desktop at the stdio transport — see `mcp-server/README.md`.
