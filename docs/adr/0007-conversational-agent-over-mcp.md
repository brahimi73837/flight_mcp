# ADR-0007 — Conversational agent drives the MCP tools (Vercel AI SDK)

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** Spec 002 FR-02/FR-05; Constitution V; research 002/R1

## Context
Spec 002 needs an LLM to turn natural language into the right flight-tool calls
and answer with real data. The MCP server (Spec 001) already exposes the tools.
We must wire an LLM to those tools reliably, server-side, without leaking the MCP
transport or the API key to the browser.

Vercel **AI SDK v6** is the chosen framework (good Next.js streaming, multi-step
tool calling, a React `useChat` hook). However, v6 **removed
`experimental_createMCPClient` from the core `ai` package** (verified: not
exported in `ai@6.0.200`).

## Decision
- Run the agent in a Next.js route handler (`/api/chat`) using AI SDK
  `streamText({ model: google("gemini-2.5-flash"), tools, stopWhen: stepCountIs(n) })`.
- Declare the three tools with `tool({ inputSchema: z…, execute })`. Each
  `execute()` **round-trips to the MCP server** via the Spec-001 MCP client
  (`web/lib/mcp.ts` `callTool`). So the model's toolset *is* the MCP server's
  tools; every result is real MCP output.
- Inject **today's date** and usage rules via the system prompt (FR-03/FR-04).
- Bound the loop with `stepCountIs` so the model can resolve→search and
  self-correct after a tool error, but cannot loop unbounded (FR-05).
- The browser talks only to `/api/chat`; the route is the MCP client (Constitution V).

## Consequences
- **+** Reliable: explicit, validated tool schemas (zod enums mirroring the
  contracts) instead of an experimental/auto-discovered surface; the model can't
  invent flight data — it can only call tools.
- **+** Reuses the entire Spec-001 MCP client + server unchanged.
- **+** Streaming UX and `useChat` come for free; tool-result parts can be rendered
  as instrument readouts (FR-06).
- **−** Tool schemas are declared in two places (MCP contract + AI-SDK zod). Kept in
  sync by mirroring `contracts/mcp-tools.md`; small and stable.
- **−** Tied to AI SDK v6 API shape; isolated to `flightTools.ts` + the route.

## Alternatives considered
- **`experimental_createMCPClient` auto-discovery.** Removed from core v6;
  experimental elsewhere. Rejected for reliability.
- **Manual fetch + Gemini function-calling (no framework).** More code, no
  streaming/`useChat`; rejected.
- **LangChain / LangGraph agent.** Heavier, more abstraction than a 3-tool agent
  needs; rejected for a minimal, transparent loop.
- **Run tools client-side.** Would leak MCP URL + need CORS, violates Constitution V.
