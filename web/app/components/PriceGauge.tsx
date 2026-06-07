"use client";
import { motion } from "motion/react";
import { fmtPrice } from "@/lib/types";

/**
 * Radial price gauge. The needle sweeps to the offer's price within the
 * [min,max] of the current result set; phosphor color shifts green→amber→red
 * as price rises (cockpit-language.md §"Price gauge dial").
 */
export function PriceGauge({
  price,
  min,
  max,
  currency,
}: {
  price: number;
  min: number;
  max: number;
  currency: string | null;
}) {
  const span = Math.max(1, max - min);
  const t = Math.min(1, Math.max(0, (price - min) / span)); // 0 cheap .. 1 dear
  const START = -120;
  const END = 120;
  const angle = START + t * (END - START);

  const color = t < 0.34 ? "var(--green)" : t < 0.67 ? "var(--amber)" : "var(--red)";
  const R = 34;
  const cx = 40;
  const cy = 40;

  // tick marks every 30deg across the sweep
  const ticks = [];
  for (let a = START; a <= END; a += 30) {
    const rad = (a - 90) * (Math.PI / 180);
    const x1 = cx + (R - 2) * Math.cos(rad);
    const y1 = cy + (R - 2) * Math.sin(rad);
    const x2 = cx + R * Math.cos(rad);
    const y2 = cy + R * Math.sin(rad);
    ticks.push(
      <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-faint)" strokeWidth={1} />,
    );
  }

  // background arc path
  const arc = (from: number, to: number) => {
    const r1 = (from - 90) * (Math.PI / 180);
    const r2 = (to - 90) * (Math.PI / 180);
    const x1 = cx + R * Math.cos(r1);
    const y1 = cy + R * Math.sin(r1);
    const x2 = cx + R * Math.cos(r2);
    const y2 = cy + R * Math.sin(r2);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <svg width={80} height={72} viewBox="0 0 80 72" aria-hidden>
      <path d={arc(START, END)} fill="none" stroke="var(--bezel)" strokeWidth={4} strokeLinecap="round" />
      <path d={arc(START, angle)} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.85} />
      {ticks}
      <motion.line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={cy - R + 4}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        style={{ originX: `${cx}px`, originY: `${cy}px`, filter: "drop-shadow(0 0 3px currentColor)" }}
        initial={{ rotate: START }}
        animate={{ rotate: angle }}
        transition={{ type: "spring", stiffness: 90, damping: 14 }}
      />
      <circle cx={cx} cy={cy} r={3} fill={color} />
      <text x={cx} y={66} textAnchor="middle" fontSize={13} fontWeight={700}
        fill={color} fontFamily="var(--mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {fmtPrice(price, currency)}
      </text>
    </svg>
  );
}
