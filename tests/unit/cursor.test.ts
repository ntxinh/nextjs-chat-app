import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "@/lib/cursor";

describe("cursor codec", () => {
  it("round-trips", () => {
    const c = encodeCursor(1729000000000, "msg-1");
    expect(decodeCursor(c)).toEqual({ createdAt: 1729000000000, id: "msg-1" });
  });

  it("rejects garbage", () => {
    expect(decodeCursor("!!!")).toBeNull();
    expect(decodeCursor(Buffer.from("{}").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from("[1,2,3]").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from('["x","y"]').toString("base64url"))).toBeNull();
  });

  it("rejects non-finite timestamps (would give Invalid Date downstream)", () => {
    const c = Buffer.from('[Infinity, "m1"]').toString("base64url");
    expect(decodeCursor(c)).toBeNull();
  });
});
