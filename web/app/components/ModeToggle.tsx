"use client";
import s from "../deck.module.css";

export type Mode = "search" | "fares" | "assistant";

const TABS: { v: Mode; l: string }[] = [
  { v: "search", l: "Search" },
  { v: "fares", l: "Fare Track" },
  { v: "assistant", l: "Assistant" },
];

/** SEARCH / FARE TRACK / ASSISTANT rocker toggle. */
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className={s.rocker} role="tablist" aria-label="Mode">
      {TABS.map((t) => (
        <button
          key={t.v}
          role="tab"
          aria-selected={mode === t.v}
          className={`${s.rockerBtn} ${mode === t.v ? s.rockerActive : ""}`}
          onClick={() => onChange(t.v)}
          style={{ whiteSpace: "nowrap" }}
        >
          {t.l}
        </button>
      ))}
    </div>
  );
}
