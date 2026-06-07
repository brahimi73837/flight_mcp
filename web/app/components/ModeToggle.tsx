"use client";
import s from "../deck.module.css";

export type Mode = "search" | "fares";

/** SEARCH / FARE TRACK rocker toggle. */
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className={s.rocker} role="tablist" aria-label="Mode">
      <button
        role="tab"
        aria-selected={mode === "search"}
        className={`${s.rockerBtn} ${mode === "search" ? s.rockerActive : ""}`}
        onClick={() => onChange("search")}
      >
        Search
      </button>
      <button
        role="tab"
        aria-selected={mode === "fares"}
        className={`${s.rockerBtn} ${mode === "fares" ? s.rockerActive : ""}`}
        onClick={() => onChange("fares")}
      >
        Fare&nbsp;Track
      </button>
    </div>
  );
}
