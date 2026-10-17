// Keyset pagination cursor: opaque base64url JSON `[createdAt, id]` —
// field-agnostic (createdAt for messages, updatedAt for conversations).
// Pure module — safe to import anywhere; only server code consumes it today.

export function encodeCursor(createdAt: number, id: string): string {
  return Buffer.from(JSON.stringify([createdAt, id])).toString("base64url");
}

/** Returns null on any malformed input — callers decide the error status. */
export function decodeCursor(cursor: string): { createdAt: number; id: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    typeof parsed[0] !== "number" ||
    !Number.isFinite(parsed[0]) ||
    typeof parsed[1] !== "string"
  ) {
    return null;
  }
  return { createdAt: parsed[0], id: parsed[1] };
}
