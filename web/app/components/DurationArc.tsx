"use client";
import { fmtDuration } from "@/lib/types";

/**
 * Flight-path arc between origin and destination with a dot per stop, like a
 * routing line on a nav display. Non-stop glows green; stops glow amber/red.
 */
export function DurationArc({
  from,
  to,
  stops,
  durationMinutes,
}: {
  from: string;
  to: string;
  stops: number;
  durationMinutes: number;
}) {
  const W = 240;
  const H = 56;
  const x0 = 14;
  const x1 = W - 14;
  const y = 34;
  const peak = 12;
  const path = `M ${x0} ${y} Q ${W / 2} ${y - peak * 2} ${x1} ${y}`;
  const stopColor = stops === 0 ? "var(--green)" : stops === 1 ? "var(--amber)" : "var(--red)";

  // evenly place `stops` dots along the quadratic curve
  const dots = [];
  for (let i = 1; i <= stops; i++) {
    const tt = i / (stops + 1);
    const bx = (1 - tt) * (1 - tt) * x0 + 2 * (1 - tt) * tt * (W / 2) + tt * tt * x1;
    const by = (1 - tt) * (1 - tt) * y + 2 * (1 - tt) * tt * (y - peak * 2) + tt * tt * y;
    dots.push(<circle key={i} cx={bx} cy={by} r={3.5} fill={stopColor} stroke="var(--panel)" strokeWidth={1} />);
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <path d={path} fill="none" stroke="var(--green-dim)" strokeWidth={1.5}
        strokeDasharray="2 3" opacity={0.8} />
      {/* endpoints */}
      <circle cx={x0} cy={y} r={4} fill="var(--cyan)" />
      <circle cx={x1} cy={y} r={4} fill="var(--cyan)" />
      {dots}
      {/* little aircraft glyph at the apex */}
      <text x={W / 2} y={y - peak * 2 - 3} textAnchor="middle" fontSize={12} fill="var(--ink)">✈</text>
      <text x={x0} y={y + 16} textAnchor="middle" fontSize={11} fontFamily="var(--mono)" fill="var(--cyan)">{from}</text>
      <text x={x1} y={y + 16} textAnchor="middle" fontSize={11} fontFamily="var(--mono)" fill="var(--cyan)">{to}</text>
      <text x={W / 2} y={y + 18} textAnchor="middle" fontSize={11} fontFamily="var(--mono)"
        fill="var(--ink-dim)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {fmtDuration(durationMinutes)} · {stops === 0 ? "NONSTOP" : `${stops} STOP${stops > 1 ? "S" : ""}`}
      </text>
    </svg>
  );
}
