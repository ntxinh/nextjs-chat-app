import { describe, expect, it } from "vitest";
import { readyDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { resetDb } from "./helpers";

describe("user table", () => {
  it("enforces email uniqueness", async () => {
    const db = await readyDb();
    await resetDb();
    await db.insert(user).values({ id: "u1", name: "A", email: "a@x.dev" });
    await expect(
      db.insert(user).values({ id: "u2", name: "B", email: "a@x.dev" }),
    ).rejects.toThrow();
  });
});
