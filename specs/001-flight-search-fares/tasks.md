# Tasks 001 — Ordered Implementation

> Each task is a unit of work tied to a commit. Implementation commit messages
> reference the task ID(s), so `git log` replays the build (Constitution III).
> `[P]` = parallelizable with siblings. Phases gate on a checkpoint.

Legend: ☐ todo · ☑ done · `[P]` parallel-safe

---

## Phase A — Specification & design  *(complete before any code)*
- ☑ **T001** Constitution + repo scaffold.
- ☑ **T002** `spec.md` + `research.md` (with live probes).
- ☑ **T003** ADRs 0001–0006 + `docs/design/cockpit-language.md`.
- ☑ **T004** `plan.md`, `data-model.md`, `contracts/{mcp-tools,api-routes}.md`, this file.
- **Checkpoint A:** contracts frozen; spec complete. ✅

## Phase B — MCP server  *(implements `contracts/mcp-tools.md`)*
- ☐ **T010** venv at `mcp-server/.venv`; `requirements.txt` (`flights`, `mcp`); install.
- ☐ **T011** `mcp-server/airports.py` — airport matcher over `fli` `Airport` enum.
- ☐ **T012** `mcp-server/mapping.py` — `FlightResult`/`FlightLeg`/`DatePrice` → data-model JSON; enum bridges; error envelope helpers.
- ☐ **T013** `mcp-server/server.py` — FastMCP server, three tools, stdio + Streamable-HTTP entrypoints.
- ☐ **T014** Verify live: each tool against `JFK→LAX`; bad-input cases (`XXX→LAX`, past date) return structured errors. Record output in commit.
- ☐ **T015** `mcp-server/README.md` — run (stdio + HTTP), tool list, Claude Desktop snippet.
- **Checkpoint B:** all three tools return contract-shaped JSON live (AC-1, AC-3, AC-5).

## Phase C — Frontend plumbing  *(implements `contracts/api-routes.md`)*
- ☐ **T020** `create-next-app` in `web/` (TS, App Router); add `@modelcontextprotocol/sdk`, `motion`.
- ☐ **T021** `web/lib/mcp.ts` — `callTool()` Streamable-HTTP MCP client helper.
- ☐ **T022** `[P]` `app/api/airports/route.ts` → `resolve_airport`.
- ☐ **T023** `[P]` `app/api/search/route.ts` → `search_flights` (+ status mapping).
- ☐ **T024** `[P]` `app/api/fares/route.ts` → `cheapest_dates`.
- ☐ **T025** Verify routes with `curl` (AC-4); bad input → 400/502 (AC-5).
- **Checkpoint C:** browser-facing JSON API works end-to-end over MCP.

## Phase D — Cockpit UI  *(implements `docs/design/cockpit-language.md`)*
- ☐ **T030** `app/globals.css` + fonts — tokens, grid/scanline/grain, panel/bezel base.
- ☐ **T031** `StatusStrip` (annunciator) + `ModeToggle` (SEARCH / FARE TRACK rocker).
- ☐ **T032** `CommandBar` — route fields w/ airport autocomplete (`/api/airports`), dates, cabin/stops toggles.
- ☐ **T033** `[P]` `ReadoutRow` + `DurationArc` + `PriceGauge` (SVG gauges).
- ☐ **T034** `[P]` `FareGrid` heat calendar; cell → triggers a day search.
- ☐ **T035** `app/page.tsx` — wire mode state, call `/api/*`, render readouts/grid; Motion staggered reveal + needle sweeps; `prefers-reduced-motion`.
- ☐ **T036** Verify in-browser: live search + fare calendar + autocomplete + drill-down; distinctiveness check (AC-2, AC-6).
- **Checkpoint D:** full app works against live data in the cockpit aesthetic.

## Phase E — Wrap-up
- ☐ **T040** Top-level `README.md` (narrative + how to run both halves) + `quickstart.md`.
- ☐ **T041** Final end-to-end pass over AC-1..AC-6; tick the spec review checklist.

---

### Dependency notes
- B depends on Checkpoint A (frozen contracts).
- C depends on B (routes verify against the live MCP server).
- D depends on C (UI consumes `/api/*`).
- `[P]` route handlers (T022–T024) and instrument components (T033–T034) are
  independent of each other within their phase.
