"use client";
import { motion } from "motion/react";
import type { FareCell } from "@/lib/types";
import { fmtPrice } from "@/lib/types";
import s from "../deck.module.css";

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Heat-graded fare calendar: green=cheapest → amber → red=dearest. */
export function FareGrid({
  cells,
  onPick,
}: {
  cells: FareCell[];
  onPick: (date: string) => void;
}) {
  const prices = cells.map((c) => c.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);

  const colorFor = (p: number) => {
    const t = (p - min) / span; // 0 cheap..1 dear
    if (t < 0.34) return { c: "var(--green)", g: "rgba(39,240,155,0.14)", b: "var(--green-dim)" };
    if (t < 0.67) return { c: "var(--amber)", g: "rgba(255,176,0,0.12)", b: "var(--amber-dim)" };
    return { c: "var(--red)", g: "rgba(255,77,61,0.1)", b: "var(--red-dim)" };
  };

  return (
    <div className={`panel ${s.fareWrap}`}>
      <div className={s.fareHead}>
        <span className="label">Cheapest fare by departure date</span>
        <span className={s.spacer} />
        <div className={s.legend}>
          <span><i className={s.legendDot} style={{ background: "var(--green)" }} />Low</span>
          <span><i className={s.legendDot} style={{ background: "var(--amber)" }} />Mid</span>
          <span><i className={s.legendDot} style={{ background: "var(--red)" }} />High</span>
        </div>
      </div>
      <div className={s.fareGrid}>
        {cells.map((cell, i) => {
          const col = colorFor(cell.price);
          const d = new Date(cell.date + "T00:00:00");
          const isMin = cell.price === min;
          return (
            <motion.button
              key={cell.date}
              className={`${s.cell} ${isMin ? s.cellBest : ""}`}
              style={{ background: col.g, borderColor: col.b }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              onClick={() => onPick(cell.date)}
              title={`Search flights on ${cell.date}`}
            >
              <div className={s.cellDow}>{DOW[d.getUTCDay()]}</div>
              <div className={s.cellDate}>{cell.date.slice(5)}</div>
              <div className={s.cellPrice} style={{ color: col.c, textShadow: `0 0 8px ${col.g}` }}>
                {fmtPrice(cell.price, cell.currency)}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
