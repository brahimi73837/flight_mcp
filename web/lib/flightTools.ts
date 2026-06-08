/**
 * The agent's toolset (ADR-0007). Three AI-SDK tools mirroring
 * specs/001-flight-search-fares/contracts/mcp-tools.md. Each `execute()`
 * round-trips to the MCP server via callTool, so the model's tools ARE the MCP
 * server's tools and every result is real MCP output (never hallucinated).
 */
import { tool } from "ai";
import { z } from "zod";
import { callTool } from "./mcp";

const seatType = z
  .enum(["economy", "premium_economy", "business", "first"])
  .describe("cabin class");
const maxStops = z
  .enum(["any", "non_stop", "one_stop_or_fewer", "two_or_fewer_stops"])
  .describe("stop limit; use non_stop only when the user wants nonstop");
const sortBy = z
  .enum(["cheapest", "duration", "departure", "arrival", "best", "top"])
  .describe("result ordering");

export const flightTools = {
  resolve_airport: tool({
    description:
      "Resolve free text (a city or airport name/code) to candidate IATA airports. " +
      "Use this when the user names a city to pick the right airport before searching.",
    inputSchema: z.object({
      query: z.string().describe("city or airport name or IATA code"),
      limit: z.number().int().min(1).max(10).optional(),
    }),
    execute: (args) => callTool("resolve_airport", args),
  }),

  search_flights: tool({
    description:
      "Search real flight itineraries for a route on a specific date. Returns offers " +
      "with price, duration, stops and per-leg airline/flight-number/times. Accepts " +
      "city names or IATA codes for origin/destination (the server resolves text).",
    inputSchema: z.object({
      origin: z.string().describe("IATA code or city"),
      destination: z.string().describe("IATA code or city"),
      departure_date: z.string().describe("YYYY-MM-DD, today or later"),
      return_date: z.string().optional().describe("YYYY-MM-DD; present => round trip"),
      seat_type: seatType.optional(),
      max_stops: maxStops.optional(),
      adults: z.number().int().min(1).optional(),
      children: z.number().int().min(0).optional(),
      infants: z.number().int().min(0).optional(),
      sort_by: sortBy.optional(),
      limit: z.number().int().min(1).max(30).optional(),
    }),
    execute: (args) => callTool("search_flights", args),
  }),

  cheapest_dates: tool({
    description:
      "Find the cheapest fare per date across a window for a route. Use this for " +
      "flexible-date questions ('when is it cheapest', 'sometime next month').",
    inputSchema: z.object({
      origin: z.string().describe("IATA code or city"),
      destination: z.string().describe("IATA code or city"),
      from_date: z.string().describe("YYYY-MM-DD window start"),
      to_date: z.string().describe("YYYY-MM-DD window end"),
      trip_duration: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("nights; present => price a round trip of this length per date"),
      seat_type: seatType.optional(),
    }),
    execute: (args) => callTool("cheapest_dates", args),
  }),
};
