import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { readyDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { touchLastSeen } from "@/server/services/presence";
import { resetDb } from "./helpers";

describe("touchLastSeen", () => {
  it("writes once, then throttles for 60s", async () => {
    const db = await readyDb();
    await resetDb();
    await db.insert(user).values({ id: "u1", name: "A", email: "a@x.dev" });

    const lastSeen = async () =>
      (await db.query.user.findFirst({ where: eq(user.id, "u1") }))?.lastSeenAt;

    expect(await lastSeen()).toBeNull();
    await touchLastSeen("u1");
    const first = await lastSeen();
    expect(first).toBeInstanceOf(Date);

    await touchLastSeen("u1"); // within 60s → throttled, no write
    expect(await lastSeen()).toEqual(first);
  });
});
