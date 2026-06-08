# Spec 002 — Conversational Flight Search (AI agent over MCP)

- **Feature:** `002-conversational-search`
- **Status:** Accepted
- **Created:** 2026-06-10
- **Builds on:** [Spec 001](../001-flight-search-fares/spec.md) (the MCP server + tools)
- **Constitution:** [`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)

> What/why for the conversational layer. The how is in [`plan.md`](./plan.md).

## 1. Problem & intent

Spec 001 exposed flight search/fares as MCP tools and a manual cockpit form. But
the whole point of an MCP is that an **LLM agent** can drive those tools. A person
shouldn't fill in IATA codes and date pickers — they should **say what they want**
("cheapest nonstop from NYC to LA in about a month", "I'm flexible the first week
of August, when's cheapest?") and an agent should translate that into the right
tool calls and come back with real flights.

This feature adds a **minimal chat** where **Google Gemini** uses the **MCP server
as its toolset** to resolve airports, infer dates, search, and answer — reliably,
with the actual flight data rendered, not hallucinated.

## 2. Scope

**In scope**
- A chat interface (cockpit "comms" terminal) where the user types natural language.
- An **agent loop**: Gemini plans and calls the MCP tools (`resolve_airport`,
  `search_flights`, `cheapest_dates`) over multiple steps, then answers.
- **Real data rendering**: tool results (flight offers, fare cells) shown inline as
  the same instrument readouts from Spec 001 — the model summarizes, the UI shows
  the ground truth.
- Streaming responses; today's date injected so relative dates resolve.

**Out of scope**
- Auth/accounts, conversation persistence across reloads, booking.
- New flight capabilities — the agent only uses Spec 001's three tools.
- Multi-provider LLM support (Gemini only for now; provider is swappable, ADR-0008).

## 3. Users & stories

**U1 — The natural-language searcher.**
> *As a user, I type "cheapest nonstop JFK to LAX around July 10" and get the actual
> cheapest itinerary, with the flights shown — without choosing codes or dates.*

**U2 — The flexible planner.**
> *As a user, I say "I can leave any day the last week of July, when's cheapest to
> fly NYC→LA?" and the agent scans the fare window and tells me the cheapest day,
> showing the price calendar.*

**U3 — The conversational refiner.**
> *As a user, I follow up ("what about business class?", "make it nonstop") and the
> agent re-runs the search with the new constraints in context.*

## 4. Functional requirements

- **FR-01** The chat accepts free-text messages and streams the assistant's reply.
- **FR-02** The agent has access to exactly Spec 001's tools (`resolve_airport`,
  `search_flights`, `cheapest_dates`) and **executes them against the live MCP
  server** — no fabricated flight data.
- **FR-03** The agent resolves city/airport names to IATA codes (via `resolve_airport`
  or by passing text the server resolves) before searching.
- **FR-04** The agent infers concrete dates from relative phrasing ("next month",
  "first week of August") using **today's date**, injected into its context.
- **FR-05** The agent may take **multiple tool-calling steps** (e.g. resolve →
  search, or self-correct after a tool error) up to a bounded limit, then produce a
  final natural-language answer.
- **FR-06** Tool results are **rendered in the chat** as instrument readouts
  (flight offers as readout rows; fare results as a heat grid) — the user sees the
  real data behind the answer.
- **FR-07** Multi-turn: prior messages are sent as context so follow-ups refine the
  previous search.
- **FR-08** Tool/agent/LLM errors (quota, bad input, upstream) surface as a clear
  assistant message, not a crash or a blank screen.
- **FR-09** The chat lives in the existing cockpit app as a third mode and reuses
  the design language (ADR-0005); it does not introduce a generic chatbot UI.

## 5. Non-functional requirements
- **NFR-1 (Reliability)** Deterministic tool execution (validated inputs, bounded
  steps, structured errors). The model decides *what* to search; the MCP server is
  the single source of *truth* for results.
- **NFR-2 (Secrets)** The Gemini API key lives only in `web/.env.local`
  (gitignored) and is read server-side; it is never sent to the browser or
  committed (ADR-0008).
- **NFR-3 (Free tier)** Use a model available on the free tier; respect rate limits
  (no retries storm). Model id is configurable.
- **NFR-4 (Replayable)** Documented as Spec 002 with its own ADRs and tasks; commits
  reference task IDs.

## 6. Acceptance criteria
- **AC-1** "Cheapest nonstop from New York to Los Angeles about a month from now"
  yields a streamed answer naming a real cheapest fare, having actually called
  `search_flights` against the MCP server. *(FR-01–FR-05)*
- **AC-2** A flexible-dates prompt triggers `cheapest_dates` and the chat renders
  the fare calendar. *(FR-02, FR-06)*
- **AC-3** Tool results appear inline as readout rows / fare grid, matching the data
  the tools returned. *(FR-06)*
- **AC-4** A follow-up ("business class instead") re-runs with the new constraint
  using prior context. *(FR-07)*
- **AC-5** With a bad/unsupported request or a tool error, the assistant explains it
  rather than crashing. *(FR-08)*
- **AC-6** The Gemini key is absent from the repo and from any client-side bundle.
  *(NFR-2)*
- **AC-7** The chat is visibly part of the cockpit (comms terminal), not a generic
  chat widget. *(FR-09)*

## 7. Clarifications (resolved)
- **Q: How does the model "use the MCP"?** AI SDK v6 dropped the in-core MCP client;
  the three tools are declared to the model and their `execute()` round-trips to the
  MCP server via the Spec-001 MCP client. Every result is real MCP output. (ADR-0007.)
- **Q: Which model / framework?** Vercel AI SDK v6 + `@ai-sdk/google`, model
  `gemini-2.5-flash` (free-tier verified; `gemini-2.0-flash` returned free-tier
  `limit: 0` for the test key). (ADR-0008, research R1.)

## 8. Review checklist
- [x] Every story maps to ≥1 FR; every FR is testable.
- [x] Agent uses only Spec-001 tools; results are real, not hallucinated.
- [x] Secret handling specified and enforced (gitignore + server-only).
- [x] Reuses the cockpit design language; no generic chatbot UI.
- [x] Complies with the constitution (esp. V: browser never speaks MCP — it talks
      to `/api/chat`, which is the MCP client).
