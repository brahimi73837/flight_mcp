# ADR-0002 — Build our own MCP server instead of reusing bundled `fli-mcp`

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** spec FR-09, FR-10; research R3; Constitution Principle V

## Context
`fli` ships its own MCP server (`fli-mcp` stdio, `fli-mcp-http`) exposing
`search_flights` and `search_dates`. We could point the frontend at that and
write no server code. But the frontend needs **stable, normalized contracts** and
an **airport-resolution** tool the bundled server doesn't provide.

## Decision
Build a thin custom MCP server (`mcp-server/server.py`) that **imports the `fli`
library** and exposes three tools with frozen, frontend-shaped JSON contracts:
`search_flights`, `cheapest_dates`, `resolve_airport`.

## Consequences
- **+** We own the output schema: normalized enum strings, ISO-8601 timestamps,
  flat fields the React code can rely on (contracts frozen in `contracts/`).
- **+** Adds `resolve_airport` (FR-09) over `fli`'s 7835-entry `Airport` enum for
  autocomplete/validation — impossible with the bundled server alone.
- **+** Still satisfies the MUST-USE `fli` requirement (library is the engine).
- **+** One codebase serves both **stdio** and **Streamable HTTP** (ADR-0004).
- **−** A small amount of mapping code to maintain when `fli`'s models change —
  acceptable, and centralizes the upstream-risk surface from ADR-0001.

## Alternatives considered
- **Use `fli-mcp-http` directly from Next.js.** Rejected: no `resolve_airport`,
  unstable/forced output shape, and we'd still need an adapter layer anyway.
- **No MCP at all — call `fli` from a Python FastAPI REST service.** Rejected:
  the brief requires an MCP server, and MCP keeps the capability reusable by any
  MCP client (Claude Desktop, agents), not just our web app.
