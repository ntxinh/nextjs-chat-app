import { expect, type Page, test } from "@playwright/test";
import { newAuthedPage } from "./auth";

async function sendMessage(page: Page, text: string) {
  await page.getByPlaceholder("Message").fill(text);
  await page.getByPlaceholder("Message").press("Enter");
}

// pid suffix: desktop+mobile workers spawn in the same ms — Date.now() alone
// collides and both projects write identical rows into the shared seed DB.
const runId = `${Date.now().toString(36)}-${process.pid.toString(36)}`;

// Serial: shared seed DB + rate-limited login.
test.describe
  .serial("messaging", () => {
    test("alice sends → bob sees it via polling; persists across reload", async ({ browser }) => {
      const alice = await newAuthedPage(browser, "alice@dev.local");
      const bob = await newAuthedPage(browser, "bob@dev.local");
      const aliceCtx = alice.context();
      const bobCtx = bob.context();
      try {
        await alice.goto("/en");
        await alice.getByRole("link", { name: /Bob/ }).click();
        await alice.waitForURL(/\/en\/conversations\//);
        const convUrl = alice.url();

        const text = `e2e hello ${runId}`;
        await sendMessage(alice, text);
        await expect(alice.getByRole("log").getByText(text, { exact: true })).toBeVisible();

        await bob.goto(convUrl);
        // poll interval is 5s; allow headroom
        await expect(bob.getByRole("log").getByText(text, { exact: true })).toBeVisible({
          timeout: 12_000,
        });

        // own vs other styling: alice's bubble is end-aligned, bob's is start-aligned
        const aliceRow = alice.getByRole("log").locator("li", { hasText: text }).last();
        await expect(aliceRow).toHaveClass(/justify-end/);
        const bobRow = bob.getByRole("log").locator("li", { hasText: text }).last();
        await expect(bobRow).toHaveClass(/justify-start/);

        await alice.reload();
        await expect(alice.getByRole("log").getByText(text, { exact: true })).toBeVisible({
          timeout: 15_000,
        });
      } finally {
        await aliceCtx.close();
        await bobCtx.close();
      }
    });

    test("history pagination: load older reveals earlier messages", async ({ browser }) => {
      const page = await newAuthedPage(browser, "alice@dev.local");
      await page.goto("/en");
      await page.getByRole("link", { name: /Bob/ }).click();
      await page.waitForURL(/\/en\/conversations\//);
      const log = page.getByRole("log");
      await expect(log.locator("li").first()).toBeVisible();
      const countBefore = await log.locator("li").count();
      await expect(page.getByRole("button", { name: "Load older messages" })).toBeVisible();
      await page.getByRole("button", { name: "Load older messages" }).click();
      await expect.poll(async () => log.locator("li").count()).toBeGreaterThan(countBefore);
    });

    test("edit shows edited marker; delete shows tombstone", async ({ browser }) => {
      const page = await newAuthedPage(browser, "alice@dev.local");
      await page.goto("/en");
      await page.getByRole("link", { name: /Bob/ }).click();
      await page.waitForURL(/\/en\/conversations\//);
      const log = page.getByRole("log");
      const original = `e2e edit me ${runId}`;
      await sendMessage(page, original);
      const row = log.locator("li", { hasText: original }).last();
      await expect(row).toBeVisible();

      await row.hover();
      await row.getByRole("button", { name: "Edit message" }).click();
      const editingRow = log.locator("li", { has: page.getByLabel("Edit message text") });
      const edited = `e2e edited ${runId}`;
      await editingRow.getByLabel("Edit message text").fill(edited);
      await editingRow.getByRole("button", { name: "Save" }).click();
      await expect(
        log.locator("li", { hasText: edited }).last().getByText("edited", { exact: true }),
      ).toBeVisible({ timeout: 15_000 });

      const editedRow = log.locator("li", { hasText: edited }).last();
      await editedRow.hover();
      await editedRow.getByRole("button", { name: "Delete message" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete message" }).click();
      await expect(log.getByText("This message was deleted").last()).toBeVisible({
        timeout: 15_000,
      });
    });

    test("failed send keeps a retryable error bubble", async ({ browser }) => {
      const page = await newAuthedPage(browser, "alice@dev.local");
      await page.goto("/en");
      await page.getByRole("link", { name: /Bob/ }).click();
      await page.waitForURL(/\/en\/conversations\//);
      const log = page.getByRole("log");
      await page.route("**/api/v1/conversations/*/messages*", (route) =>
        route.request().method() === "POST" ? route.abort() : route.continue(),
      );
      const text = `e2e retry ${runId}`;
      await sendMessage(page, text);
      const row = log.locator("li", { hasText: text }).last();
      await expect(row.getByText("Couldn't send")).toBeVisible({ timeout: 15_000 });

      await page.unroute("**/api/v1/conversations/*/messages*");
      await row.getByRole("button", { name: "Retry" }).click();
      await expect(row.getByText("Couldn't send")).not.toBeVisible({ timeout: 15_000 });
    });

    // Throwaway group → unread state is never shared with other tests.
    test("unread badge, clearing, and 'New messages' separator", async ({ browser }) => {
      const alice = await newAuthedPage(browser, "alice@dev.local");
      const dan = await newAuthedPage(browser, "dan@dev.local");
      const aliceCtx = alice.context();
      const danCtx = dan.context();
      const groupName = `Unread ${runId}`;
      try {
        await alice.goto("/en");
        await alice.getByRole("button", { name: "New chat" }).click();
        await alice.getByRole("menuitem", { name: "New group" }).click();
        const dialog = alice.getByRole("dialog");
        await dialog.locator("input").first().fill(groupName);
        await dialog.getByRole("searchbox", { name: "Search users" }).fill("dan");
        await dialog.getByRole("checkbox").check();
        await dialog.getByRole("button", { name: "Create" }).click();
        await alice.waitForURL(/\/en\/conversations\//);
        const convUrl = alice.url();

        // Composer clears on send success — wait for it or the second fill
        // lands while the first send is still isPending and gets dropped.
        await sendMessage(alice, `unread-1 ${runId}`);
        await expect(alice.getByPlaceholder("Message")).toHaveValue("");
        await sendMessage(alice, `unread-2 ${runId}`);
        await expect(
          alice.getByRole("log").getByText(`unread-2 ${runId}`, { exact: true }),
        ).toBeVisible();

        // Sender's own messages never count → no badge, no separator for alice.
        await alice.goto("/en");
        await expect(alice.getByRole("link", { name: groupName }).getByLabel(/unread/)).toHaveCount(
          0,
        );
        await expect(alice.getByRole("log").locator("li", { hasText: "New messages" })).toHaveCount(
          0,
        );
        await alice.goto(convUrl);
        await expect(alice.getByRole("log").locator("li", { hasText: "New messages" })).toHaveCount(
          0,
        );

        // Recipient gets a badge (sidebar polls at 15s → headroom).
        await dan.goto("/en");
        const danItem = dan.getByRole("link", { name: groupName });
        await expect(danItem.getByLabel(/unread/)).toBeVisible({ timeout: 20_000 });

        // Opening it: separator renders exactly once, directly above the first
        // unread message; own bubble starts (dan sent nothing).
        await danItem.click();
        await dan.waitForURL(/\/en\/conversations\//);
        const log = dan.getByRole("log");
        const sep = log.locator("li", { hasText: "New messages" });
        await expect(sep).toHaveCount(1);
        await expect(sep.locator("xpath=following-sibling::*[1]")).toContainText(
          `unread-1 ${runId}`,
        );

        // markRead fired on mount → badge is gone next time the list loads.
        await dan.goto("/en");
        await expect(dan.getByRole("link", { name: groupName }).getByLabel(/unread/)).toHaveCount(
          0,
          { timeout: 20_000 },
        );

        // A fully-read viewer never sees the separator.
        await dan.goto(convUrl);
        await expect(log.getByText(`unread-2 ${runId}`, { exact: true })).toBeVisible();
        await expect(log.locator("li", { hasText: "New messages" })).toHaveCount(0);

        // cleanup: alice leaves so the throwaway stops crowding her 20-item
        // sidebar page (flake source for sibling specs)
        await alice.goto(convUrl);
        await alice.getByRole("button", { name: "Details" }).click();
        const aliceDetails = alice.getByRole("complementary").nth(1);
        await aliceDetails.getByRole("button", { name: "Leave conversation" }).click();
        await alice
          .getByRole("dialog", { name: "Leave conversation?" })
          .getByRole("button", { name: "Leave conversation" })
          .click();
        await alice.waitForURL(/\/en\/?$/);
      } finally {
        await aliceCtx.close();
        await danCtx.close();
      }
    });
  });
