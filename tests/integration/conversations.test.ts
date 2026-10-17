import { describe, expect, it } from "vitest";
import { readyDb } from "@/lib/db";
import { newId } from "@/lib/db/id";
import { conversations, directConversationPairs, user } from "@/lib/db/schema";
import { normalizePair } from "@/lib/dm-pair";
import { resetDb } from "./helpers";

describe("direct_conversation_pairs", () => {
  it("rejects duplicate direct pairs", async () => {
    const db = await readyDb();
    await resetDb();
    const now = new Date();

    await db.insert(user).values([
      { id: "ua", name: "A", email: "a@x.dev" },
      { id: "ub", name: "B", email: "b@x.dev" },
    ]);

    const conv1 = newId();
    await db.insert(conversations).values({
      id: conv1,
      type: "direct",
      createdBy: "ua",
      createdAt: now,
      updatedAt: now,
    });

    // normalizePair sorts ids — insert arg order never matters.
    const [userA, userB] = normalizePair("ub", "ua");
    await db.insert(directConversationPairs).values({ userA, userB, conversationId: conv1 });

    const conv2 = newId();
    await db.insert(conversations).values({
      id: conv2,
      type: "direct",
      createdBy: "ub",
      createdAt: now,
      updatedAt: now,
    });
    await expect(
      db.insert(directConversationPairs).values({ userA, userB, conversationId: conv2 }),
    ).rejects.toThrow();

    // Only the normalized (userA < userB) row exists — (b,a) is never stored.
    const rows = await db.select().from(directConversationPairs);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userA: "ua", userB: "ub", conversationId: conv1 });
  });
});
