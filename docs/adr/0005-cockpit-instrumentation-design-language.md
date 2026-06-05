# ADR-0005 — Cockpit-instrumentation design language

- **Status:** Accepted
- **Date:** 2026-06-10
- **Relates to:** spec NFR-1; Constitution Principle VI; `docs/design/cockpit-language.md`

## Context
The frontend must have a real, aviation-rooted aesthetic identity (not a generic
travel UI) and is built with the **frontend-design** skill, which demands one
bold, intentional direction and forbids AI-slop defaults (Inter/Roboto/Arial,
purple-on-white, cookie-cutter layouts).

## Decision
Commit fully to **cockpit instrumentation** — the look of a glass-cockpit MFD
(multi-function display) / EFB. Chosen by the user over split-flap board,
sectional chart, and vintage-airline-luxury options.

Core moves (full spec in `docs/design/cockpit-language.md`):
- **Near-black panel** background with subtle grid, grain, and scanline texture.
- **Phosphor palette:** amber `#FFB000` (primary readout) + NVIS glow-green
  `#27F09B` (good/cheap), cyan `#3AD7FF` (secondary data), caution-red `#FF4D3D`.
- **Typography:** `IBM Plex Mono` for all flight data (tabular, instrument feel)
  + `Saira` (technical condensed grotesque) for labels/headers. **No** Inter/
  Roboto/Arial/Space Grotesk.
- **Components as instruments:** offers render as MFD readout rows; price/duration
  shown on **gauge dials & arcs**; the fare calendar is a heat-graded grid.
- **Motion (Motion lib):** gauge-needle sweeps, staggered row reveals on load,
  a faint CRT flicker — high-impact, not scattered.

## Consequences
- **+** Distinctive, memorable, unmistakably aviation (NFR-1, AC-6).
- **+** Dark instrument theme suits dense tabular flight data.
- **−** Higher implementation effort (gauges, textures, motion) than a flat list;
  budgeted as explicit frontend tasks.
- **−** Must guard contrast/accessibility on a dark phosphor theme — addressed in
  the design tokens (minimum text colors, focus states).

## Alternatives considered
Split-flap departure board, aeronautical sectional chart, vintage airline luxury
— all valid aviation directions, presented to the user; cockpit instrumentation
was chosen. Recorded so the path not taken is visible.
