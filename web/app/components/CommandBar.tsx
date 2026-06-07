"use client";
import { useEffect, useRef, useState } from "react";
import type { Airport, MaxStops, SeatType } from "@/lib/types";
import type { Mode } from "./ModeToggle";
import s from "../deck.module.css";

export type FormState = {
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  from_date: string;
  to_date: string;
  trip_duration: string;
  seat_type: SeatType;
  max_stops: MaxStops;
};

const SEATS: { v: SeatType; l: string }[] = [
  { v: "economy", l: "Econ" },
  { v: "premium_economy", l: "Prem" },
  { v: "business", l: "Biz" },
  { v: "first", l: "First" },
];
const STOPS: { v: MaxStops; l: string }[] = [
  { v: "any", l: "Any" },
  { v: "non_stop", l: "Nonstop" },
  { v: "one_stop_or_fewer", l: "≤1" },
];

/** Airport code field with live autocomplete from /api/airports. */
function AirportField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [opts, setOpts] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setOpts([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/airports?q=${encodeURIComponent(q)}&limit=6`);
        const d = await r.json();
        if (Array.isArray(d.airports)) setOpts(d.airports);
      } catch {
        /* ignore */
      }
    }, 160);
    return () => clearTimeout(id);
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className={s.field} ref={box}>
      <span className="label">{label}</span>
      <input
        className={`${s.input} ${s.inputCode}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        spellCheck={false}
      />
      {open && opts.length > 0 && (
        <div className={s.auto}>
          {opts.map((o) => (
            <div
              key={o.code}
              className={s.autoItem}
              onMouseDown={() => {
                onChange(o.code);
                setOpen(false);
              }}
            >
              <span className={`${s.autoCode} readout`}>{o.code}</span>
              <span className={s.autoName}>{o.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommandBar({
  mode,
  form,
  setForm,
  onSubmit,
  loading,
}: {
  mode: Mode;
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });

  return (
    <section className={`panel ${s.cmd}`}>
      <div className={s.cmdGrid}>
        <AirportField
          label="Origin"
          value={form.origin}
          onChange={(v) => set({ origin: v })}
          placeholder="JFK / city"
        />
        <button
          className={s.swap}
          title="Swap"
          onClick={() => set({ origin: form.destination, destination: form.origin })}
          aria-label="Swap origin and destination"
        >
          ⇄
        </button>
        <AirportField
          label="Destination"
          value={form.destination}
          onChange={(v) => set({ destination: v })}
          placeholder="LAX / city"
        />

        {mode === "search" ? (
          <>
            <div className={s.field}>
              <span className="label">Departure</span>
              <input
                type="date"
                className={s.input}
                value={form.departure_date}
                onChange={(e) => set({ departure_date: e.target.value })}
              />
            </div>
            <div className={s.field}>
              <span className="label">Return · opt</span>
              <input
                type="date"
                className={s.input}
                value={form.return_date}
                onChange={(e) => set({ return_date: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div className={s.field}>
              <span className="label">Window from</span>
              <input
                type="date"
                className={s.input}
                value={form.from_date}
                onChange={(e) => set({ from_date: e.target.value })}
              />
            </div>
            <div className={s.field}>
              <span className="label">Window to</span>
              <input
                type="date"
                className={s.input}
                value={form.to_date}
                onChange={(e) => set({ to_date: e.target.value })}
              />
            </div>
          </>
        )}

        <div className={s.field}>
          <span className="label">Cabin</span>
          <div className={s.segmented}>
            {SEATS.map((o) => (
              <button
                key={o.v}
                className={`${s.seg} ${form.seat_type === o.v ? s.segActive : ""}`}
                onClick={() => set({ seat_type: o.v })}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {mode === "search" ? (
          <div className={s.field}>
            <span className="label">Stops</span>
            <div className={s.segmented}>
              {STOPS.map((o) => (
                <button
                  key={o.v}
                  className={`${s.seg} ${form.max_stops === o.v ? s.segActive : ""}`}
                  onClick={() => set({ max_stops: o.v })}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={s.field}>
            <span className="label">Trip nights · opt</span>
            <input
              className={s.input}
              inputMode="numeric"
              placeholder="one-way"
              value={form.trip_duration}
              onChange={(e) => set({ trip_duration: e.target.value.replace(/\D/g, "") })}
            />
          </div>
        )}

        <button className={s.execute} onClick={onSubmit} disabled={loading}>
          {loading ? "Querying ▟▟▟" : mode === "search" ? "Execute Search" : "Scan Fares"}
        </button>
      </div>
    </section>
  );
}
