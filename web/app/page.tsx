"use client";
import { useEffect, useMemo, useState } from "react";
import { CommandBar, type FormState } from "./components/CommandBar";
import { ModeToggle, type Mode } from "./components/ModeToggle";
import { StatusStrip } from "./components/StatusStrip";
import { ReadoutRow } from "./components/ReadoutRow";
import { FareGrid } from "./components/FareGrid";
import { Comms } from "./components/Comms";
import { isApiError, type FareCell, type FlightOffer } from "@/lib/types";
import s from "./deck.module.css";

function iso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("search");
  const [form, setForm] = useState<FormState>({
    origin: "JFK",
    destination: "LAX",
    departure_date: "",
    return_date: "",
    from_date: "",
    to_date: "",
    trip_duration: "",
    seat_type: "economy",
    max_stops: "any",
  });

  const [offers, setOffers] = useState<FlightOffer[] | null>(null);
  const [cells, setCells] = useState<FareCell[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed dates on the client to avoid SSR hydration drift.
  useEffect(() => {
    setForm((f) => ({
      ...f,
      departure_date: f.departure_date || iso(30),
      from_date: f.from_date || iso(21),
      to_date: f.to_date || iso(35),
    }));
  }, []);

  const route =
    form.origin && form.destination
      ? `${form.origin.toUpperCase()} → ${form.destination.toUpperCase()}`
      : "";

  const { min, max } = useMemo(() => {
    if (!offers || offers.length === 0) return { min: 0, max: 1 };
    const p = offers.map((o) => o.price);
    return { min: Math.min(...p), max: Math.max(...p) };
  }, [offers]);

  async function runSearch(overrideDate?: string) {
    setLoading(true);
    setError(null);
    setOffers(null);
    try {
      const p = new URLSearchParams({
        origin: form.origin,
        destination: form.destination,
        departure_date: overrideDate || form.departure_date,
        seat_type: form.seat_type,
        max_stops: form.max_stops,
        sort_by: "cheapest",
        limit: "30",
      });
      if (form.return_date) p.set("return_date", form.return_date);
      const r = await fetch(`/api/search?${p}`);
      const d = await r.json();
      if (isApiError(d)) setError(d.error.message);
      else setOffers(d.offers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setLoading(false);
    }
  }

  async function runFares() {
    setLoading(true);
    setError(null);
    setCells(null);
    try {
      const p = new URLSearchParams({
        origin: form.origin,
        destination: form.destination,
        from_date: form.from_date,
        to_date: form.to_date,
        seat_type: form.seat_type,
      });
      if (form.trip_duration) p.set("trip_duration", form.trip_duration);
      const r = await fetch(`/api/fares?${p}`);
      const d = await r.json();
      if (isApiError(d)) setError(d.error.message);
      else setCells(d.cells);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setLoading(false);
    }
  }

  function pickFareDate(date: string) {
    setForm((f) => ({ ...f, departure_date: date }));
    setMode("search");
    runSearch(date);
  }

  const state: "idle" | "live" | "error" = loading
    ? "live"
    : error
      ? "error"
      : "idle";
  const modeLabel =
    mode === "search" ? "SEARCH" : mode === "fares" ? "FARE TRACK" : "COMMS";
  const count =
    mode === "search"
      ? offers?.length ?? null
      : mode === "fares"
        ? cells?.length ?? null
        : null;

  return (
    <main className={s.deck}>
      <StatusStrip
        route={mode === "assistant" ? "" : route}
        mode={modeLabel}
        count={count}
        state={state}
        right={
          <div style={{ marginLeft: 14 }}>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
        }
      />

      {mode === "assistant" ? (
        <section className={`panel ${s.cmd}`} style={{ padding: 18 }}>
          <Comms />
        </section>
      ) : (
        <>
      <CommandBar
        mode={mode}
        form={form}
        setForm={setForm}
        loading={loading}
        onSubmit={mode === "search" ? () => runSearch() : runFares}
      />

      {loading && <div className={s.scan} />}

      <section className={s.viewport}>
        {error && <div className={`${s.note} ${s.noteErr}`}>⚠ {error}</div>}

        {!error && mode === "search" && (
          <>
            {offers == null && !loading && (
              <div className={s.note}>
                Set a route and execute a search to read out today&apos;s flights.
              </div>
            )}
            {offers && offers.length === 0 && (
              <div className={s.note}>No flights returned for this route/date.</div>
            )}
            {offers && offers.length > 0 && (
              <div className={s.rows}>
                {offers.map((o, i) => (
                  <ReadoutRow key={o.id} offer={o} min={min} max={max} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {!error && mode === "fares" && (
          <>
            {cells == null && !loading && (
              <div className={s.note}>
                Scan a date window to chart the cheapest fare per day — pick a cell to
                drill into that day&apos;s flights.
              </div>
            )}
            {cells && cells.length === 0 && (
              <div className={s.note}>No fares returned for this window.</div>
            )}
            {cells && cells.length > 0 && <FareGrid cells={cells} onPick={pickFareDate} />}
          </>
        )}
      </section>
        </>
      )}
    </main>
  );
}
