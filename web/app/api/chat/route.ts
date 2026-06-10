import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { flightTools } from "@/lib/flightTools";

// The conversational agent (ADR-0007). Server-only: reads the Gemini key, is the
// MCP client (via flightTools -> lib/mcp), streams a UI message stream back.
export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "You are FLIGHT DECK, an avionics flight assistant. Today's date is " +
      today +
      ".",
    "You help users find real flights by calling tools. Never invent flight",
    "numbers, prices, times, or airlines. Report only what the tools return.",
    "",
    "Understanding the user (be forgiving of mistakes):",
    "- Fix obvious typos and loose names (e.g. 'amsterdaam' to Amsterdam,",
    "  'munchen' to Munich). You may pass a city name straight to the search tools",
    "  (the server resolves it); call resolve_airport when a place is ambiguous or",
    "  spans several airports, and pick the main one unless the user says otherwise.",
    "- If a place is truly unrecognizable, ask one short clarifying question.",
    "- Infer concrete YYYY-MM-DD dates from natural phrasing using today's date,",
    "  and never search a past date. If the user gives a month or a range like",
    "  'June/July', treat it as a flexible window and call cheapest_dates across it.",
    "  A month or range that includes today or future days is still valid even if",
    "  part of it has passed: just start the window from today onward, do not refuse.",
    "- 'Round' or 'return' trip means round trip: for a fixed day pass return_date;",
    "  for a flexible window pass trip_duration (nights) to cheapest_dates. If the",
    "  user wants a round trip but gives no length, do NOT just ask: assume about",
    "  7 nights, proceed with the search, and say you assumed a ~1-week trip that",
    "  they can refine.",
    "- Pass max_stops='non_stop' only when the user asks for nonstop.",
    "",
    "Answering:",
    "- For a specific day call search_flights; for flexible dates call",
    "  cheapest_dates, then you may search_flights on the cheapest day.",
    "- Be concise: name the best option (airline, flight number, price, times,",
    "  stops). The UI renders the full results, so do not list every flight.",
    "",
    "Errors (so the user always knows what happened):",
    "- If a tool returns an error with code RATE_LIMITED, tell the user the flight",
    "  data source is temporarily rate-limiting and to try again in a minute.",
    "- If a tool returns an error with another code, explain it plainly and suggest",
    "  a fix (e.g. a different airport or date).",
    "- If a search returns zero results for a normally well-served route, say no",
    "  flights were returned and note it may be a temporary data-source limit, so",
    "  the user can retry rather than assume the route does not exist.",
  ].join("\n");
}

export async function POST(req: Request) {
  let messages: UIMessage[];
  try {
    ({ messages } = await req.json());
  } catch {
    return new Response("invalid request body", { status: 400 });
  }

  const result = streamText({
    model: google(MODEL),
    system: systemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: flightTools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (/quota|rate|RESOURCE_EXHAUSTED|429/i.test(msg)) {
        return "The AI service hit its free-tier rate limit. Please wait a few seconds and try again.";
      }
      return "Something went wrong while searching. Please try again.";
    },
  });
}
