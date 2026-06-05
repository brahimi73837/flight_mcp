# Constitution — Flight Search & Fare Tracker

> The governing principles for this project. Every spec, plan, ADR, and line of
> code is expected to comply. Amendments are made by editing this file in a
> dedicated commit that explains the change.

**Project:** A flight **search + fare-tracking** application. A Python **MCP
server** wraps the [`fli`](https://github.com/punitarani/fli) library (Google
Flights) and exposes clean tools; a **Next.js** frontend with a cockpit
instrumentation aesthetic consumes those tools through server-side MCP-client
route handlers.

**Method:** GitHub **spec-kit-style spec-driven development**. Specs are the
source of truth; code implements the spec, not the other way around.

---

## Principle I — Spec before code
No implementation begins before the relevant `spec.md` requirement and `plan.md`
section exist. Specs describe **what** and **why**; plans describe **how**. If
reality contradicts a spec during build, the spec is amended in its own commit
**before** the code diverges.

## Principle II — Every decision is recorded
Each meaningful, hard-to-reverse choice (data source, MCP transport, scope cut,
design language, process) is captured as an **Architecture Decision Record**
under `docs/adr/`, using the format: Context → Decision → Consequences →
Alternatives considered. Probe evidence (real command output) is cited where a
decision rests on it.

## Principle III — The history is the documentation
The repo must be **replayable**: reading `git log --oneline` top-to-bottom
explains what was built, why, and in what order. Commits are small and
phase-aligned; implementation commits map 1:1 to `tasks.md` IDs (`T0xx`).
Nothing meaningful lives only in a person's head or this chat.

## Principle IV — One verified data source
The app uses **`fli` / Google Flights** as its single flight-data source, used
as a **library** inside our own MCP server (not by shelling out). A data source
is only adopted after a **live probe** proves it works; the probe output is
recorded in `research.md`. No API keys or paid services.

## Principle V — The browser never speaks MCP
MCP is a server-to-server protocol here. The Next.js **server** is the MCP
client; the browser only ever calls our own HTTP API routes, which return plain
JSON. Tool return shapes are frozen as **contracts** (`specs/.../contracts/`)
that both the MCP server and the frontend code honor.

## Principle VI — Distinctive, intentional design
The frontend is built with the **frontend-design** skill and commits fully to a
single bold aesthetic: **cockpit instrumentation**. Generic "AI-slop" choices
(Inter/Roboto/Arial/system fonts, purple-on-white gradients, cookie-cutter
layouts) are prohibited. The design rationale and tokens live in
`docs/design/cockpit-language.md`.

## Principle VII — Verifiable end-to-end
Every tool and route ships with a way to prove it works against live data
(documented in `quickstart.md`). "Done" means demonstrated, not asserted.

---

### Tech constraints (current environment)
- Python **3.14** via Homebrew; no global `pip`/`uv` → all Python work happens in
  a **venv** at `mcp-server/.venv`.
- Node **24** with `npm`/`npx`.
- Monorepo: `mcp-server/` (Python) + `web/` (Next.js), specs and docs at root.
