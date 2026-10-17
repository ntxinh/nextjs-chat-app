import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";

describe("vitest wiring", () => {
  it("resolves @/ paths", () => {
    expect(routing.locales).toEqual(["en", "vi"]);
  });
});
