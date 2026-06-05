# Cockpit Instrumentation — Design Language

> The visual identity for the frontend, built with the **frontend-design** skill.
> One bold direction, executed with precision. Implements ADR-0005. These tokens
> are the source of truth for `web/`'s CSS variables.

## Concept

The UI is a **glass-cockpit MFD** — the multi-function display an airline pilot
reads. Flight search becomes "querying the flight management system"; results are
**instrument readouts**, not list items. The one unforgettable thing: a flight
offer presented like an avionics panel — amber tabular data, a price gauge, a
duration arc, glowing on near-black glass with faint scanlines.

**Tone:** industrial / utilitarian, precise, slightly retro-CRT. Restrained
maximalism — dense data, but every element earns its place like a real panel.

## Anti-goals (frontend-design skill prohibitions)
- ❌ Inter / Roboto / Arial / system fonts / Space Grotesk.
- ❌ Purple-on-white gradients, pastel SaaS look, generic travel-site cards.
- ❌ Centered hero + three feature cards. This is an instrument, not a landing page.

## Typography
- **Data / numerals:** `IBM Plex Mono` — tabular figures, monospace alignment for
  prices, times, flight numbers, codes. The instrument typeface.
- **Labels / headers:** `Saira` (and `Saira Semi Condensed` for tight labels) —
  a technical, aeronautical grotesque; uppercase + wide letter-spacing for panel
  labels (`DEPARTURE`, `STOPS`, `FARE`).
- Loaded via `next/font/google`. Numerals use `font-variant-numeric: tabular-nums`.

## Color tokens
Near-black phosphor CRT. Amber leads; green = good/cheap; cyan = secondary data;
red = caution.

```css
:root {
  /* surfaces */
  --void:        #06080a;   /* page background */
  --panel:       #0c1116;   /* instrument panel */
  --panel-raised:#11181f;   /* raised readout */
  --bezel:       #1b2630;   /* panel edges / dividers */
  --grid-line:   rgba(120,160,150,0.07);

  /* phosphor ink */
  --amber:       #ffb000;   /* primary readout */
  --amber-dim:   #b07aract; /* (see note) dimmed amber for secondary */
  --green:       #27f09b;   /* good / cheapest / non-stop */
  --green-dim:   #14794f;
  --cyan:        #3ad7ff;   /* secondary data, times */
  --red:         #ff4d3d;   /* caution: long, expensive, basic economy */
  --red-dim:     #7a2b25;

  /* text */
  --ink:         #d8e6e2;   /* primary text on panel */
  --ink-dim:     #7e9088;   /* labels, captions */
  --ink-faint:   #45524d;   /* disabled / gridline labels */

  /* glow */
  --glow-amber:  0 0 8px rgba(255,176,0,0.45);
  --glow-green:  0 0 8px rgba(39,240,155,0.45);
}
```
> Note: `--amber-dim` ships as a real hex (`#b07a2a`) in code; the token name is
> what matters here. Contrast: `--ink` on `--panel` ≈ 9:1; phosphor accents are
> reserved for data/numerals, never long body copy.

## Texture & atmosphere (depth, not flat fills)
- **Grid:** faint `--grid-line` 1px grid (CSS `repeating-linear-gradient`) on the
  void, like a chart underlay.
- **Scanlines:** 2–3px repeating dark line overlay at ~4% opacity over panels.
- **Grain:** subtle SVG/feTurbulence noise overlay at ~3% to kill flat banding.
- **Vignette + inner shadow** on panels to read as recessed glass.
- **Bezel:** panels have a 1px `--bezel` border + soft inset highlight (a screw-in
  instrument frame feel via box-shadow layering).

## Signature components
1. **Readout row (flight offer).** A panel row: left = `ORIGIN ✈ DEST` in mono +
   times in cyan; center = **duration arc** (SVG semicircle with a routing line,
   stop dots in amber/red); right = **price gauge** (radial dial, needle position
   = price within the day's min/max, green when near min). Airline + flight number
   in dim mono below.
2. **Price gauge dial.** Radial SVG gauge, tick marks, sweeping needle (Motion).
   Used per-offer and as a route summary.
3. **Fare calendar grid.** Heat-graded cells (green=cheapest → amber → red=dearest
   relative to window min/max), mono price per cell, selectable; selection routes
   to a full search for that date.
4. **Command bar (search input).** Styled like an FMS scratchpad: airport code
   fields with autocomplete dropdown of `CODE — Name`, date pickers, cabin/stops
   as segmented toggles with amber active state.
5. **Status strip.** A top "annunciator" bar: route, trip type, result count,
   live/loading state with a blinking amber dot.

## Motion (Motion library; high-impact, orchestrated)
- **On results load:** staggered reveal of readout rows (`animation-delay` ladder),
  gauge needles **sweep** from zero to value.
- **CRT idle:** very faint flicker/scanline drift on panels (subtle, non-nauseating).
- **Hover:** a readout row lifts slightly and its glow intensifies; gauge ticks
  brighten.
- **Calendar:** cells fade in row by row; selected cell pulses green.
- Respect `prefers-reduced-motion`: disable flicker/sweeps, keep instant states.

## Layout
- Full-bleed dark cockpit. Left/top **command bar**, main **MFD viewport** for
  readouts or the fare grid, a **mode switch** (`SEARCH` / `FARE TRACK`) styled
  as a physical rocker toggle. Asymmetric, dense, grid-aligned — not centered
  cards. Generous use of monospace alignment and panel dividers.

## Accessibility
- Min contrast 4.5:1 for any text-bearing element (accents reserved for large
  numerals/short labels). Visible focus ring (cyan). Keyboard-navigable toggles
  and calendar. `prefers-reduced-motion` honored.
