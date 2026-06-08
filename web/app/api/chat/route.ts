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
    "numbers, prices, times, or airlines — only report what the tools return.",
    "",
    "Rules:",
    "- Resolve city names to IATA codes. You may pass a city name directly to",
    "  search_flights/cheapest_dates (the server resolves it); use resolve_airport",
    "  when a city is ambiguous or you want to confirm the airport.",
    "- Infer concrete YYYY-MM-DD dates from relative phrasing using today's date.",
    "  Never search a past date.",
    "- For a specific day, call search_flights. For flexible-date questions",
    "  ('when is it cheapest', 'sometime in August'), call cheapest_dates over a",
    "  sensible window, then optionally search_flights for the cheapest day.",
    "- Pass max_stops='non_stop' only when the user asks for nonstop.",
    "- After tools return, answer concisely: name the best option (airline, flight",
    "  number, price, times, stops). The UI renders the full results, so don't dump",
    "  every flight — highlight the recommendation and any tradeoffs.",
    "- If a tool returns an error, explain it plainly and suggest a fix.",
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
