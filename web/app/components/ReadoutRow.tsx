"use client";
import { motion } from "motion/react";
import type { FlightOffer } from "@/lib/types";
import { fmtTime } from "@/lib/types";
import { PriceGauge } from "./PriceGauge";
import { DurationArc } from "./DurationArc";
import s from "../deck.module.css";

/** One flight offer rendered as an avionics readout row. */
export function ReadoutRow({
  offer,
  min,
  max,
  index,
}: {
  offer: FlightOffer;
  min: number;
  max: number;
  index: number;
}) {
  const first = offer.legs[0];
  const last = offer.legs[offer.legs.length - 1];
  return (
    <motion.div
      className={`panel ${s.row}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.35 }}
    >
      <div className={s.carrier}>
        <span className={s.carrierName}>{offer.primaryAirline}</span>
        <span className={`${s.flightNo} readout`}>
          {first.airlineCode}
          {first.flightNumber}
          {offer.legs.length > 1 ? ` +${offer.legs.length - 1}` : ""}
        </span>
        {offer.basicEconomy && <span className={s.badge}>Basic</span>}
      </div>

      <div className={s.times}>
        <div className={s.timeRow}>
          <span className={`${s.timeBig} readout`}>{fmtTime(first.departure)}</span>
          <span className="label">{first.from}</span>
          <span style={{ color: "var(--ink-faint)" }}>→</span>
          <span className={`${s.timeBig} readout`}>{fmtTime(last.arrival)}</span>
          <span className="label">{last.to}</span>
        </div>
        {first.aircraft && <span className={s.aircraft}>{first.aircraft}</span>}
      </div>

      <DurationArc
        from={first.from}
        to={last.to}
        stops={offer.stops}
        durationMinutes={offer.durationMinutes}
      />

      <PriceGauge price={offer.price} min={min} max={max} currency={offer.currency} />
    </motion.div>
  );
}
