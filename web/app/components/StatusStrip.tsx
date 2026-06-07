"use client";
import s from "../deck.module.css";

type State = "idle" | "live" | "error";

/** Top annunciator bar: brand + current route/mode + live status light. */
export function StatusStrip({
  route,
  mode,
  count,
  state,
  right,
}: {
  route: string;
  mode: string;
  count: number | null;
  state: State;
  right?: React.ReactNode;
}) {
  const dotClass =
    state === "live" ? s.dotLive : state === "error" ? s.dotErr : s.dotIdle;
  return (
    <header className={`panel ${s.strip}`}>
      <div>
        <div className={s.brand}>FLIGHT&nbsp;DECK</div>
        <div className={s.brandSub}>SRCH · FARE TRK · MCP</div>
      </div>

      <div className={s.stripField}>
        <span className="label">Route</span>
        <span className={`${s.stripVal} cyan`}>{route || "—"}</span>
      </div>
      <div className={s.stripField}>
        <span className="label">Mode</span>
        <span className={`${s.stripVal} amber`}>{mode}</span>
      </div>
      <div className={s.stripField}>
        <span className="label">Returns</span>
        <span className={s.stripVal}>{count == null ? "—" : String(count)}</span>
      </div>

      <div className={s.spacer} />
      <div className={s.stripField} style={{ borderLeft: "none", paddingLeft: 0 }}>
        <span className="label">Link</span>
        <span className={s.stripVal} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`${s.dot} ${dotClass} ${state === "live" ? "blink" : ""}`} />
          <span style={{ fontSize: "0.7rem", color: "var(--ink-dim)" }}>
            {state === "live" ? "QUERYING" : state === "error" ? "FAULT" : "STANDBY"}
          </span>
        </span>
      </div>
      {right}
    </header>
  );
}
