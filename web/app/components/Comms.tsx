"use client";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { FareCell, FlightOffer } from "@/lib/types";
import { ReadoutRow } from "./ReadoutRow";
import { FareGrid } from "./FareGrid";
import s from "../deck.module.css";

const SUGGESTIONS = [
  "Cheapest nonstop from New York to Los Angeles about a month from now",
  "When is it cheapest to fly SFO to Tokyo in the first two weeks of August?",
  "Business class JFK to London next Friday, fewest stops",
];

const TOOL_LABEL: Record<string, string> = {
  search_flights: "SEARCHING FLIGHTS",
  cheapest_dates: "SCANNING FARES",
  resolve_airport: "RESOLVING AIRPORT",
};

/** Render a completed tool result inline as instrument readouts. */
function ToolResult({ name, output }: { name: string; output: unknown }) {
  const o = output as Record<string, unknown>;
  if (o?.error) {
    const err = o.error as { message?: string };
    return <div className={s.commsToolErr}>✕ {err?.message ?? "tool error"}</div>;
  }
  if (name === "search_flights" && Array.isArray(o?.offers)) {
    const offers = o.offers as FlightOffer[];
    if (offers.length === 0) return <div className={s.commsNote}>No flights found.</div>;
    const prices = offers.map((x) => x.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return (
      <div className={s.commsRows}>
        {offers.slice(0, 6).map((offer, i) => (
          <ReadoutRow key={offer.id} offer={offer} min={min} max={max} index={i} />
        ))}
      </div>
    );
  }
  if (name === "cheapest_dates" && Array.isArray(o?.cells)) {
    const cells = o.cells as FareCell[];
    if (cells.length === 0) return <div className={s.commsNote}>No fares found.</div>;
    return <FareGrid cells={cells} onPick={() => {}} />;
  }
  if (name === "resolve_airport" && Array.isArray(o?.airports)) {
    const aps = o.airports as { code: string; name: string }[];
    return (
      <div className={s.commsResolve}>
        ▸ resolved&nbsp;
        {aps.slice(0, 4).map((a) => a.code).join(" · ") || "no match"}
      </div>
    );
  }
  return null;
}

export function Comms() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  return (
    <div className={s.comms}>
      <div className={s.commsLog}>
        {messages.length === 0 && (
          <div className={s.commsIntro}>
            <div className="label" style={{ marginBottom: 10 }}>
              COMMS · talk to the flight deck
            </div>
            <p className={s.commsHint}>
              Ask in plain language. The assistant resolves airports, infers dates,
              and queries the live flight tools — then shows the real results.
            </p>
            <div className={s.commsChips}>
              {SUGGESTIONS.map((sg) => (
                <button key={sg} className={s.commsChip} onClick={() => submit(sg)}>
                  {sg}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? s.commsUser : s.commsAsst}
          >
            <span className={s.commsWho}>{m.role === "user" ? "YOU ▸" : "FD ◂"}</span>
            <div className={s.commsBody}>
              {m.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <p key={i} className={s.commsText}>
                      {part.text}
                    </p>
                  );
                }
                if (part.type.startsWith("tool-")) {
                  const name = part.type.slice(5);
                  const p = part as { state: string; output?: unknown; errorText?: string };
                  if (p.state === "output-available") {
                    return <ToolResult key={i} name={name} output={p.output} />;
                  }
                  if (p.state === "output-error") {
                    return (
                      <div key={i} className={s.commsToolErr}>
                        ✕ {TOOL_LABEL[name] ?? name}: {p.errorText}
                      </div>
                    );
                  }
                  // input-streaming / input-available -> in flight
                  return (
                    <div key={i} className={s.commsTool}>
                      <span className={`${s.dot} ${s.dotLive} blink`} />
                      {TOOL_LABEL[name] ?? name}…
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {busy && (
          <div className={s.commsAsst}>
            <span className={s.commsWho}>FD ◂</span>
            <div className={s.commsBody}>
              <span className={s.commsCaret}>▍</span>
            </div>
          </div>
        )}
        {error && <div className={s.commsToolErr}>✕ {error.message}</div>}
      </div>

      <form
        className={s.commsInput}
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <span className={s.commsPrompt}>CDU ▸</span>
        <input
          className={s.commsField}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a flight request…"
          autoComplete="off"
        />
        <button type="submit" className={s.commsSend} disabled={busy}>
          {busy ? "···" : "Transmit"}
        </button>
      </form>
    </div>
  );
}
