# ADR-0006 — Replicate the spec-kit workflow by hand

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** Constitution Principles I, II, III; whole repo layout

## Context
The brief requires **GitHub spec-driven development** and a repo whose history
lets someone replay exactly what was built, why, and in what order. GitHub
**spec-kit** defines that workflow, but it's normally driven by `/speckit.*`
slash commands (constitution → specify → clarify → plan → tasks → implement) and
a CLI that aren't available in this environment.

## Decision
**Replicate spec-kit's artifact structure and phase order by hand**, and encode
the ordering in **git history**:
- `.specify/memory/constitution.md` — governing principles.
- `specs/001-flight-search-fares/` — `spec.md`, `research.md`, `plan.md`,
  `data-model.md`, `contracts/`, `tasks.md`, `quickstart.md`.
- `docs/adr/` — one ADR per meaningful decision (this set).
- **Commit discipline:** each phase is its own commit; implementation commits map
  1:1 to `tasks.md` IDs (`T0xx`), so `git log --oneline` *is* the replay.

## Consequences
- **+** Full spec-driven rigor and a self-documenting, replayable repo without
  depending on the unavailable slash-command tooling.
- **+** Artifact names match spec-kit, so anyone who knows spec-kit is instantly
  oriented; adopting the real CLI later is a drop-in.
- **−** No automation enforces the order; discipline is manual and enforced by
  the constitution + review checklist.

## Alternatives considered
- **Install/run the spec-kit CLI.** Not available here; would also obscure the
  reasoning behind a layer of generated scaffolding.
- **Ad-hoc docs without the spec-kit shape.** Rejected: the brief explicitly asks
  for spec-driven development; matching the known structure is more legible.
