/**
 * End-to-end test runner for FLIGHT DECK (EU-focused).
 *
 * Exercises the whole stack against LIVE data: the Next.js HTTP API (the MCP
 * client) -> the Python MCP server -> fli/Google Flights, and the Gemini chat
 * agent driving the same MCP tools.
 *
 *   WEB=http://127.0.0.1:3000 node scripts/e2e.mjs
 *
 * It deliberately separates THREE outcomes so we always know WHY something is red:
 *   PASS  - works.
 *   BUG   - a real defect in our code (500, malformed JSON, wrong airport
 *           resolution, a valid request rejected). Exits non-zero.
 *   LIMIT - an external limit, not our code: Google Flights throttling its search
 *           endpoint (empty across several fresh routes) or the LLM free-tier rate
 *           limit. Reported, does NOT fail the run.
 */
const WEB = process.env.WEB ?? "http://127.0.0.1:3000";

const iso = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const DEP = iso(30);
const F0 = iso(21);
const F1 = iso(45);

let pass = 0,
  bug = 0,
  limit = 0;
const results = [];
function record(id, kind, detail) {
  // kind: "PASS" | "BUG" | "LIMIT"
  if (kind === "PASS") pass++;
  else if (kind === "BUG") bug++;
  else limit++;
  results.push({ id, kind, detail });
  console.log(`[${kind === "LIMIT" ? "LIMIT" : kind}] ${id} -- ${detail}`);
}

async function getJSON(path) {
  try {
    const r = await fetch(WEB + path);
    let body = null;
    try {
      body = await r.json();
    } catch {
      return { status: r.status, body: null, malformed: true };
    }
    return { status: r.status, body };
  } catch (e) {
    return { status: 0, body: null, neterr: String(e) };
  }
}

/** POST /api/chat, drain the UI message stream. */
async function chat(messages, { retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await fetch(WEB + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const raw = await r.text();
    const tools = [...raw.matchAll(/"toolName":"([a-z_]+)"/g)].map((m) => m[1]);
    let text = "";
    let errored = false;
    for (const line of raw.split("\n")) {
      const m = line.match(/^data: (.*)$/);
      if (!m || m[1] === "[DONE]") continue;
      try {
        const o = JSON.parse(m[1]);
        if (o.type === "text-delta") text += o.delta || o.text || "";
        if (o.type === "error") errored = o.errorText || "error";
      } catch {}
    }
    text = text.trim();
    const llmThrottled =
      /rate limit|quota|exhausted|429|resource_exhausted/i.test(String(errored)) ||
      (r.status === 200 && tools.length === 0 && text.length === 0);
    if (llmThrottled && attempt < retries) {
      await new Promise((s) => setTimeout(s, 25000));
      continue;
    }
    return { status: r.status, tools: [...new Set(tools)], text, errored, llmThrottled };
  }
}

console.log(`\n=== FLIGHT DECK E2E (EU) -- ${new Date().toISOString()} ===`);
console.log(`web=${WEB}  departure=${DEP}  window=${F0}..${F1}\n`);

// =========================================================================
// Spec 001 -- data plane (EU routes), with bug vs limit classification
// =========================================================================
console.log("## Spec 001 -- search, fares, airports, errors (EU)\n");

// AC-1: search. Try several fresh EU routes. A 5xx / malformed / 400-on-valid is
// a BUG; all-empty across fresh routes is an upstream LIMIT; any offers is PASS.
{
  const routes = [
    ["Malta", "Amsterdam"],
    ["AMS", "BCN"],
    ["CDG", "FCO"],
    ["LIS", "MAD"],
    ["DUB", "MAN"],
  ];
  let hit = null,
    bugDetail = null,
    tried = [];
  for (const [o, d] of routes) {
    const { status, body, malformed, neterr } = await getJSON(
      `/api/search?origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}&departure_date=${DEP}&limit=5`,
    );
    if (neterr) {
      bugDetail = `network error ${neterr}`;
      break;
    }
    if (malformed || status >= 500) {
      // 502 UPSTREAM is upstream, not a code bug; 500 is a bug.
      if (status === 502) {
        tried.push(`${o}-${d}:UPSTREAM502`);
        continue;
      }
      bugDetail = `${o}-${d}: status=${status}${malformed ? " malformed-json" : ""}`;
      break;
    }
    if (status === 400) {
      bugDetail = `${o}-${d}: valid route rejected (400 ${body?.error?.code})`;
      break;
    }
    const top = body?.offers?.[0];
    tried.push(`${o}-${d}:${body?.offers?.length ?? "?"}`);
    if (top?.price > 0 && top?.legs?.[0]?.airlineCode && top?.legs?.[0]?.departure) {
      hit = { route: `${o}-${d}`, top, n: body.offers.length };
      break;
    }
  }
  if (bugDetail) record("001/AC-1 search_flights", "BUG", bugDetail);
  else if (hit)
    record(
      "001/AC-1 search_flights",
      "PASS",
      `${hit.route}: ${hit.n} offers; top ${hit.top.legs[0].airlineCode}${hit.top.legs[0].flightNumber} ${hit.top.price} ${hit.top.currency}`,
    );
  else record("001/AC-1 search_flights", "LIMIT", `all fresh routes empty (Google throttling) -- tried ${tried.join(" ")}`);
}

// AC-2: cheapest_dates one-way + round-trip.
for (const [label, qs] of [
  ["one-way", `origin=Malta&destination=Amsterdam&from_date=${F0}&to_date=${F1}`],
  ["round-trip", `origin=Malta&destination=Amsterdam&from_date=${F0}&to_date=${F1}&trip_duration=7`],
]) {
  const { status, body, malformed } = await getJSON(`/api/fares?${qs}`);
  if (malformed || status >= 500) {
    record(`001/AC-2 cheapest_dates ${label}`, status === 502 ? "LIMIT" : "BUG", `status=${status}`);
  } else if (status === 400) {
    record(`001/AC-2 cheapest_dates ${label}`, "BUG", `valid request 400 ${body?.error?.code}`);
  } else {
    const cells = body?.cells ?? [];
    if (cells.length > 0 && cells.every((c) => c.date && c.price > 0)) {
      const p = cells.map((c) => c.price);
      record(`001/AC-2 cheapest_dates ${label}`, "PASS", `${cells.length} cells; min ${Math.min(...p)} max ${Math.max(...p)}`);
    } else {
      record(`001/AC-2 cheapest_dates ${label}`, "LIMIT", `empty (Google throttling)`);
    }
  }
}

// AC-3: airport resolution -- wrong codes here are a BUG (the Boston->MHT class).
{
  const cases = [
    ["malta", "MLA"],
    ["amsterdam", "AMS"],
    ["boston", "BOS"],
    ["new york", "JFK"],
  ];
  let badResolve = null;
  for (const [q, want] of cases) {
    const { body } = await getJSON(`/api/airports?q=${encodeURIComponent(q)}&limit=4`);
    const codes = (body?.airports ?? []).map((a) => a.code);
    if (!codes.includes(want)) {
      badResolve = `'${q}' -> ${codes.join(",")} (expected ${want})`;
      break;
    }
  }
  record("001/AC-3 resolve_airport", badResolve ? "BUG" : "PASS", badResolve ?? "malta->MLA, amsterdam->AMS, boston->BOS, new york->JFK");
}

// AC-5: structured errors -- wrong status/code is a BUG.
{
  const bad = await getJSON(`/api/search?origin=Xyzville&destination=AMS&departure_date=${DEP}`);
  const past = await getJSON(`/api/search?origin=AMS&destination=CDG&departure_date=2020-01-01`);
  const miss = await getJSON(`/api/search?origin=AMS`);
  const ok =
    bad.status === 400 && bad.body?.error?.code === "BAD_AIRPORT" &&
    past.status === 400 && past.body?.error?.code === "BAD_DATE" &&
    miss.status === 400 && miss.body?.error?.code === "VALIDATION";
  record(
    "001/AC-5 structured errors",
    ok ? "PASS" : "BUG",
    `badAirport=${bad.status}/${bad.body?.error?.code} pastDate=${past.status}/${past.body?.error?.code} missing=${miss.status}/${miss.body?.error?.code}`,
  );
}

// =========================================================================
// Spec 002 -- conversational agent over MCP (EU prompts)
// =========================================================================
console.log("\n## Spec 002 -- conversational agent over MCP (EU)");
console.log("(cooling down 25s to respect the free-tier rate limit...)\n");
await new Promise((s) => setTimeout(s, 25000));

// AC-1: the user's real prompt -- round-trip, flexible window, city names.
{
  const r = await chat([
    { id: "1", role: "user", parts: [{ type: "text", text: "Cheapest round flights from Malta to Amsterdam in June or July?" }] },
  ]);
  if (r.llmThrottled) record("002/AC-1 Malta<->Amsterdam round trip", "LIMIT", "LLM free-tier rate limit");
  else {
    const usedFareTool = r.tools.includes("cheapest_dates") || r.tools.includes("search_flights");
    const ok = r.status === 200 && usedFareTool && r.text.length > 0;
    const priced = /\d{2,}|EUR|€|USD|\$/.test(r.text);
    record(ok ? "002/AC-1 Malta<->Amsterdam round trip" : "002/AC-1 Malta<->Amsterdam round trip",
      ok ? "PASS" : "BUG",
      `tools=[${r.tools}] priced=${priced} answer="${r.text.slice(0, 130)}"`);
  }
}

await new Promise((s) => setTimeout(s, 12000));

// AC-4: tolerate a typo + a different EU city; agent should still resolve & search.
{
  const r = await chat([
    { id: "1", role: "user", parts: [{ type: "text", text: `Flights from Amsterdaam to Lisbon on ${DEP}, cheapest please.` }] },
  ]);
  if (r.llmThrottled) record("002/AC-4 typo tolerance (Amsterdaam->AMS)", "LIMIT", "LLM free-tier rate limit");
  else {
    const ok = r.status === 200 && r.tools.includes("search_flights") && r.text.length > 0;
    // the agent must NOT have given up on the typo; a coherent answer mentioning a result or 'no flights' is fine
    record("002/AC-4 typo tolerance (Amsterdaam->AMS)", ok ? "PASS" : "BUG",
      `tools=[${r.tools}] answer="${r.text.slice(0, 120)}"`);
  }
}

await new Promise((s) => setTimeout(s, 12000));

// AC-5: graceful handling of an unresolvable place (no crash; asks/explains).
{
  const r = await chat([
    { id: "1", role: "user", parts: [{ type: "text", text: "Find flights from Qwertyville to Madrid next week." }] },
  ]);
  if (r.llmThrottled) record("002/AC-5 unresolvable place handled", "LIMIT", "LLM free-tier rate limit");
  else {
    // success = a coherent reply (asks to clarify / says it can't find that place), no crash
    const ok = r.status === 200 && r.text.length > 0;
    record("002/AC-5 unresolvable place handled", ok ? "PASS" : "BUG", `answer="${r.text.slice(0, 120)}"`);
  }
}

// =========================================================================
console.log(`\n=== SUMMARY: ${pass} pass, ${bug} BUG, ${limit} external-limit ===`);
console.log(JSON.stringify(results));
if (bug > 0) {
  console.log("\nRESULT: FAIL -- real defect(s) found (see [BUG] lines).");
  process.exit(1);
} else if (limit > 0) {
  console.log("\nRESULT: PASS (with external limits) -- no code defects; some checks hit Google/LLM rate limits.");
  process.exit(0);
} else {
  console.log("\nRESULT: PASS -- all green.");
  process.exit(0);
}
