import { NextRequest, NextResponse } from "next/server";
import { callTool, isToolError, statusForError } from "@/lib/mcp";

export const runtime = "nodejs";

// GET /api/search?origin=JFK&destination=LAX&departure_date=2026-07-10&...
//   -> search_flights (contracts/api-routes.md)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const origin = sp.get("origin");
  const destination = sp.get("destination");
  const departure_date = sp.get("departure_date");
  if (!origin || !destination || !departure_date) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "origin, destination and departure_date are required",
        },
      },
      { status: 400 },
    );
  }

  const num = (k: string, d: number) => {
    const v = sp.get(k);
    return v == null ? d : Number(v);
  };

  const result = await callTool("search_flights", {
    origin,
    destination,
    departure_date,
    return_date: sp.get("return_date") ?? undefined,
    seat_type: sp.get("seat_type") ?? "economy",
    max_stops: sp.get("max_stops") ?? "any",
    adults: num("adults", 1),
    children: num("children", 0),
    infants: num("infants", 0),
    sort_by: sp.get("sort_by") ?? "cheapest",
    limit: num("limit", 30),
  });

  if (isToolError(result)) {
    return NextResponse.json(result, {
      status: statusForError(result.error.code),
    });
  }
  return NextResponse.json(result);
}
