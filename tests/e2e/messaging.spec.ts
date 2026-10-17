import { expect, type Page, test } from "@playwright/test";
import { newAuthedPage } from "./auth";

async function sendMessage(page: Page, text: string) {
  await page.getByPlaceholder("Message").fill(text);
  await page.getByPlaceholder("Message").press("Enter");
}

const runId = Date.now().toString(36);

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
  });
