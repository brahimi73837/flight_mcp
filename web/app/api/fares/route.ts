import { NextRequest, NextResponse } from "next/server";
import { callTool, isToolError, statusForError } from "@/lib/mcp";

export const runtime = "nodejs";

// GET /api/fares?origin=JFK&destination=LAX&from_date=..&to_date=..&trip_duration=..
//   -> cheapest_dates (contracts/api-routes.md)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const origin = sp.get("origin");
  const destination = sp.get("destination");
  const from_date = sp.get("from_date");
  const to_date = sp.get("to_date");
  if (!origin || !destination || !from_date || !to_date) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message:
            "origin, destination, from_date and to_date are required",
        },
      },
      { status: 400 },
    );
  }

  const tripDuration = sp.get("trip_duration");
  const result = await callTool("cheapest_dates", {
    origin,
    destination,
    from_date,
    to_date,
    trip_duration: tripDuration == null ? undefined : Number(tripDuration),
    seat_type: sp.get("seat_type") ?? "economy",
  });

  if (isToolError(result)) {
    return NextResponse.json(result, {
      status: statusForError(result.error.code),
    });
  }
  return NextResponse.json(result);
}
