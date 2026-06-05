# ADR-0004 — MCP transport (Streamable HTTP) + Next.js server as the MCP client

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** spec FR-11, FR-12; research R5; Constitution Principle V

## Context
MCP is a server-to-server protocol with a session handshake. The frontend is a
React app in a browser. We need a wiring that (a) lets the web app use the MCP
tools, (b) keeps the MCP server reusable by *other* clients (Claude Desktop),
and (c) doesn't leak the MCP server's location/transport into the browser.

## Decision
1. The MCP server supports **two transports from one codebase**:
   - **stdio** — for desktop MCP clients (Claude Desktop, agents).
   - **Streamable HTTP** — for our web server to connect over a URL.
2. The **Next.js server route handlers** (`/api/search`, `/api/fares`,
   `/api/airports`) are the **MCP client**. They open a Streamable-HTTP MCP
   session to the server (`@modelcontextprotocol/sdk`), call the tool, normalize
   the result, and return **plain JSON** to the browser.
3. The **browser never speaks MCP**; it only calls our own `/api/*` routes.

The MCP server URL is injected into Next.js via env `FLIGHT_MCP_URL`
(default `http://127.0.0.1:8000/mcp`).

## Consequences
- **+** Clean separation (Principle V); browser bundle has zero MCP code.
- **+** Same MCP server is usable by Claude Desktop via stdio with no changes.
- **+** Route handlers are the single place to normalize/cache/validate.
- **−** A live `fli` query can take seconds; route handlers run server-side with
  generous timeouts and return structured errors on failure (FR-05, NFR-4).
- **−** Two processes to run in dev (MCP server + Next.js); documented in
  `quickstart.md`.

## Alternatives considered
- **Browser connects to MCP directly.** Rejected: leaks server location, awkward
  session lifecycle in React, CORS pain, violates Principle V.
- **Next.js spawns the MCP server over stdio per request.** Rejected: cold-start
  per request, no reuse by other clients; HTTP keeps one long-lived server.
