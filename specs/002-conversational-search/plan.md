# Plan 002 — Technical Implementation

> How we build [`spec.md`](./spec.md). Pairs with ADR-0007 (agent over MCP) and
> ADR-0008 (model + secrets). Reuses Spec 001's MCP server and client unchanged.

## Architecture

```
Browser  (cockpit "COMMS" chat, useChat)
   │  POST /api/chat   (UI message stream; never speaks MCP)
   ▼
Next.js /api/chat  ── streamText(gemini-2.5-flash, tools, stepCountIs) ──► Gemini
   │                         ▲   tool execute()
   │                         │
   └── flightTools.ts ──callTool()──► lib/mcp.ts ──MCP (Streamable HTTP)──► flight-mcp ─► fli
```
The model plans; each tool call round-trips to the **MCP server** for real data;
the route streams text + tool results back; the UI renders both.

## Components

### `web/lib/flightTools.ts` (new)
The agent's toolset — three AI-SDK `tool()`s mirroring `contracts/mcp-tools.md`,
each `execute()` calling the existing `callTool()` (`lib/mcp.ts`):
- `search_flights` — zod input (origin, destination, departure_date, optional
  return_date, seat_type **enum**, max_stops **enum**, passengers, sort_by, limit).
- `cheapest_dates` — (origin, destination, from_date, to_date, trip_duration?, seat_type).
- `resolve_airport` — (query, limit?).
Enums use `z.enum([...])` matching the server so the model emits valid values
(the probe showed the model otherwise guessing `max_stops:"0"`).

### `web/app/api/chat/route.ts` (new)
- `runtime = "nodejs"`. Reads `messages` (UI messages) from the body.
- `streamText({ model: google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash"),
  system, messages: convertToModelMessages(messages), tools, stopWhen: stepCountIs(6) })`.
- **System prompt** injects `today` (ISO) and the rules: resolve cities→IATA, infer
  concrete dates from relative phrasing, prefer `cheapest_dates` for flexible-date
  questions and `search_flights` for a specific day, never invent flights, be concise.
- Returns `result.toUIMessageStreamResponse()`.
- Key (`GOOGLE_GENERATIVE_AI_API_KEY`) read here only (server) — never client.

### `web/app/components/Comms.tsx` (new) — the chat terminal
- `useChat` from `@ai-sdk/react` with `DefaultChatTransport({ api: "/api/chat" })`.
- Cockpit "ACARS/CDU" styling: message log of monospace lines; user vs assistant
  distinguished; a CDU scratchpad input + transmit button; streaming caret.
- **Render message `parts`:**
  - `text` → assistant/user lines.
  - `tool-search_flights` / `tool-cheapest_dates` → while running show an amber
    "▸ QUERYING …" status line; on result render the output via existing
    `ReadoutRow` (offers) / `FareGrid` (cells).
  - `tool-resolve_airport` → a compact "resolved → JFK/LGA/EWR" line.
- Errors (`status === "error"`) → a caution line.

### Integration into the deck
- Extend `Mode` to `"search" | "fares" | "assistant"`; add an **ASSISTANT** segment
  to `ModeToggle`; in `page.tsx`, render `<Comms/>` for that mode. StatusStrip shows
  mode = COMMS and a live dot while streaming.

## Reliability measures (NFR-1)
- Validated zod tool inputs; server still re-validates and returns structured errors.
- Bounded steps (`stepCountIs(6)`); model can self-correct one tool error.
- `today` injected → correct relative dates.
- Tool results rendered from **actual tool output**, so the UI can't show a number
  the model invented.

## Sequencing → [`tasks.md`](./tasks.md)
flightTools → /api/chat (verify with a scripted agent call) → Comms UI + mode →
browser verify (prod build) → docs.

## Definition of done
AC-1..AC-7 demonstrated live (a real conversation returns real flights rendered as
readouts), key absent from repo/bundle, commits reference task IDs.
