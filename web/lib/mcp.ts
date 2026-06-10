/**
 * Server-side MCP client (ADR-0004). Route handlers call `callTool` to open a
 * Streamable-HTTP MCP session to the Python flight server, invoke one tool, and
 * return its JSON payload. The browser never imports this file.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.FLIGHT_MCP_URL ?? "http://127.0.0.1:8000/mcp";

export type ToolError = { error: { code: string; message: string } };

/** Open a session, call `name` with `args`, parse the JSON result, close. */
export async function callTool<T = unknown>(
  name: string,
  args: Record<string, unknown>,
): Promise<T | ToolError> {
  const client = new Client(
    { name: "flight-web", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  try {
    await client.connect(transport);
    const res = (await client.callTool({ name, arguments: args })) as {
      structuredContent?: unknown;
      content?: Array<{ type: string; text?: string }>;
    };

    // FastMCP returns the dict as JSON text content (and sometimes structured).
    if (res.structuredContent && typeof res.structuredContent === "object") {
      return res.structuredContent as T;
    }
    const text = res.content?.find((c) => c.type === "text")?.text;
    if (!text) {
      return { error: { code: "UPSTREAM", message: "empty tool response" } };
    }
    return JSON.parse(text) as T;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      error: {
        code: "UPSTREAM",
        message: `MCP call '${name}' failed: ${message}`,
      },
    };
  } finally {
    await client.close().catch(() => {});
  }
}

/** Map a tool error envelope's code to an HTTP status (contracts/api-routes.md). */
export function statusForError(code: string): number {
  if (code === "RATE_LIMITED") return 429;
  if (code === "UPSTREAM") return 502;
  return 400; // BAD_AIRPORT | BAD_DATE | VALIDATION
}

export function isToolError(v: unknown): v is ToolError {
  return (
    typeof v === "object" &&
    v !== null &&
    "error" in v &&
    typeof (v as ToolError).error?.code === "string"
  );
}
