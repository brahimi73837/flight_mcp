# Contract — Chat API (`POST /api/chat`)

The browser's only conversational endpoint. It is the MCP client; the browser
never speaks MCP (Constitution V).

## Request
`Content-Type: application/json`
```jsonc
{
  "messages": [ /* AI SDK v6 UI messages from useChat */ ]
}
```

## Response
An **AI SDK UI message stream** (`result.toUIMessageStreamResponse()`): a streamed
sequence of message parts the `useChat` hook consumes. Parts include:
- `text` — assistant tokens (streamed).
- `tool-search_flights` / `tool-cheapest_dates` / `tool-resolve_airport` — tool
  invocation parts with `state` (`input-available` → `output-available`) and, on
  completion, `output` equal to the tool's JSON (the data-model from Spec 001, or an
  `{ error: { code, message } }` envelope).

## Agent behavior (server)
- Model: `GEMINI_MODEL` env (default `gemini-2.5-flash`) via `@ai-sdk/google`.
- Tools: the three from `flightTools.ts`, each executing against the MCP server.
- `stopWhen: stepCountIs(6)` — bounded multi-step.
- System prompt carries **today's date** and tool-usage rules.

## Errors
- Upstream LLM/quota errors (e.g. 429) and tool errors are surfaced to the client as
  an error state / assistant message; the route never returns an unhandled 500 with
  a stack trace.

## Secrets
- `GOOGLE_GENERATIVE_AI_API_KEY` is read only in this server route. Never sent to the
  client; never committed (`.env.local`, gitignored). See ADR-0008.
