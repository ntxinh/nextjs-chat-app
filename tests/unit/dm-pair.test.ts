import { describe, expect, it } from "vitest";
import { normalizePair } from "@/lib/dm-pair";

describe("normalizePair", () => {
  it("sorts ids deterministically", () => {
    expect(normalizePair("b", "a")).toEqual(["a", "b"]);
    expect(normalizePair("a", "b")).toEqual(["a", "b"]);
  });
  it("rejects self-pairs", () => {
    expect(() => normalizePair("a", "a")).toThrow();
  });
});
