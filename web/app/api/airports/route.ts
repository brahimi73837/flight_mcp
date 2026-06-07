import { NextRequest, NextResponse } from "next/server";
import { callTool, isToolError, statusForError } from "@/lib/mcp";

export const runtime = "nodejs";

// GET /api/airports?q=jfk&limit=8  ->  resolve_airport (contracts/api-routes.md)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q");
  if (!q) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "q is required" } },
      { status: 400 },
    );
  }
  const limit = Number(sp.get("limit") ?? 8);
  const result = await callTool("resolve_airport", { query: q, limit });
  if (isToolError(result)) {
    return NextResponse.json(result, {
      status: statusForError(result.error.code),
    });
  }
  return NextResponse.json(result);
}
