import { describe, expect, it } from "vitest";
import { rateLimit } from "@/server/policies/rate-limit";

describe("rateLimit", () => {
  it("allows up to limit requests within the window", () => {
    const key = `allow-${crypto.randomUUID()}`;
    for (let i = 0; i < 10; i++) {
      expect(rateLimit(key, 10, 60_000)).toBe(true);
    }
    expect(rateLimit(key, 10, 60_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    const a = `a-${crypto.randomUUID()}`;
    const b = `b-${crypto.randomUUID()}`;
    expect(rateLimit(a, 1, 60_000)).toBe(true);
    expect(rateLimit(a, 1, 60_000)).toBe(false);
    expect(rateLimit(b, 1, 60_000)).toBe(true);
  });

  it("does not grow the bucket past a rejected hit", () => {
    const key = `cap-${crypto.randomUUID()}`;
    expect(rateLimit(key, 1, 60_000)).toBe(true);
    expect(rateLimit(key, 1, 60_000)).toBe(false);
    expect(rateLimit(key, 1, 60_000)).toBe(false);
  });

  it("permits requests again after the window expires", () => {
    const key = `expire-${crypto.randomUUID()}`;
    expect(rateLimit(key, 1, 0)).toBe(true);
    // windowMs=0 → every prior hit is already expired
    expect(rateLimit(key, 1, 0)).toBe(true);
  });
});
