# ADR-0008 — Gemini model choice, free tier, and secret handling

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** Spec 002 NFR-2/NFR-3; research 002/R1

## Context
The conversational agent (ADR-0007) needs a concrete LLM and a safe way to hold
its API key. A free-tier Google AI Studio key was provided for testing. Free tier
varies by model, and the key must never reach the repo or the browser bundle.

## Decision
**Model:** `gemini-2.5-flash` via `@ai-sdk/google`. Chosen after a live probe of
several models against the provided key:
```
OK    gemini-2.5-flash        OK    gemini-2.5-flash-lite    OK   gemini-flash-latest
FAIL  gemini-2.0-flash  -> 429 free_tier requests limit: 0
FAIL  gemini-1.5-flash  -> 404 NOT_FOUND
```
`gemini-2.5-flash` has good tool-calling and free-tier availability. The id is read
from `GEMINI_MODEL` (default `gemini-2.5-flash`) so it's swappable.

**Secret handling:**
- The key lives only in `web/.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY` (the env
  var `@ai-sdk/google` reads automatically). `.env.local` is gitignored (verified
  with `git check-ignore`).
- It is used **only** in the server route handler (`runtime = "nodejs"`); it is
  never imported into a client component, so it cannot enter the browser bundle.
- `.env.example` documents the variable name with no value.

**Rate limits (NFR-3):** bounded agent steps (ADR-0007) and the SDK's default retry
behavior; we do not add aggressive retries. A 429 surfaces as an assistant message
(FR-08).

## Consequences
- **+** Works on the provided free-tier key; model swap is one env var.
- **+** Key is server-only and untracked; no secret in git or client JS.
- **−** Free-tier quotas can still 429 under load; acceptable for this project and
  shown to the user as a friendly message.
- **Note:** the key was shared in plaintext during development; it should be rotated
  in Google AI Studio after testing. This ADR records the handling, not the value.

## Alternatives considered
- **`gemini-2.0-flash`** — preferred speed, but free-tier `limit: 0` for the key.
- **OpenAI/Anthropic** — would need a different key; Gemini was provided. Provider is
  swappable behind the AI SDK if desired later.
