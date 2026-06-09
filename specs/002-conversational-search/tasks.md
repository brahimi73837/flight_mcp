# Tasks 002 — Ordered Implementation

> Commits reference these IDs (Constitution III). `[P]` = parallel-safe.

## Phase A — Spec & design  *(complete)*
- ☑ **T201** Spec 002 (`spec.md`).
- ☑ **T202** ADR-0007 (agent over MCP) + ADR-0008 (model + secrets); research probes folded in.
- ☑ **T203** `plan.md`, `contracts/chat-api.md`, this file.
- **Checkpoint A:** approach fixed; Gemini+MCP loop de-risked live (gemini-2.5-flash). ✅

## Phase B — Agent backend
- ☑ **T210** `web/lib/flightTools.ts` — three AI-SDK tools (zod enums mirroring the
  contracts) executing via `lib/mcp.ts` `callTool`.
- ☑ **T211** `web/app/api/chat/route.ts` — `streamText(gemini-2.5-flash, tools,
  stepCountIs(6))`, system prompt with today's date, `toUIMessageStreamResponse()`.
- ☑ **T212** `.env.example` — add `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`.
- ☑ **T213** Verify the route: scripted/curl agent call returns a real cheapest fare
  via actual tool calls (AC-1); confirm key is server-only.
- **Checkpoint B:** ✅ the agent answers with real MCP data over HTTP.

## Phase C — Cockpit COMMS chat UI
- ☑ **T220** Extend `Mode` + `ModeToggle` with **ASSISTANT**; render in `page.tsx`.
- ☑ **T221** `web/app/components/Comms.tsx` — `useChat` terminal: message log, CDU
  scratchpad input, streaming, cockpit styling.
- ☑ **T222** Render tool parts: `ReadoutRow` for offers, `FareGrid` for fares,
  status lines for resolve/in-flight calls; error state line.
- ☑ **T223** Verify in browser (prod build): a real conversation renders real
  flights as readouts; follow-up refines (AC-2..AC-5, AC-7). Screenshots.
- **Checkpoint C:** ✅ conversational search works in the cockpit.

## Phase D — Wrap-up
- ☐ **T230** Update top-level `README.md` (chat mode + how it uses the MCP) and
  `quickstart.md` (env + try-it prompts); screenshot.
- ☐ **T231** Final pass AC-1..AC-7; confirm key absent from repo + client bundle (AC-6).
