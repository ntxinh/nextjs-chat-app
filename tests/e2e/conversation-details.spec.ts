import { expect, type Page, test } from "@playwright/test";

async function login(page: Page, email: string) {
  // dev auth endpoint is rate-limited (10/min); retry through the window if hit
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/en/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password1234");
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL(/\/en\/?$/, { timeout: 15_000 });
      return;
    } catch {
      const rateLimited = await page.getByText("Too many attempts").isVisible();
      if (!rateLimited || attempt === 2) throw new Error("login failed");
      await page.waitForTimeout(60_000);
    }
  }
}

// Serial: dev auth endpoint is rate-limited — parallel logins get rejected.
test.describe
  .serial("conversation header + details", () => {
    test("owner renames group; member role sees no owner controls", async ({ page }) => {
      await login(page, "alice@dev.local");
      await page.getByRole("link", { name: /Dev Chat/ }).click();
      await page.waitForURL(/\/en\/conversations\//);
      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: "Dev Chat" })).toBeVisible();

      // details pane: static column ≥lg, slide-over sheet below lg — same content
      await page.getByRole("button", { name: "Details" }).click();
      const details = page
        .getByRole("complementary", { name: "Details" })
        .or(page.getByRole("dialog", { name: "Details" }));
      // alice is the owner → rename + add member controls visible
      await expect(details.getByRole("button", { name: "Rename group" })).toBeVisible();
      await expect(details.getByRole("button", { name: "Add member" })).toBeVisible();
      await expect(details.getByText("Owner").first()).toBeVisible();

      // heal: prior runs may have removed dan via leave tests — re-add if absent
      if (!(await details.getByRole("listitem").filter({ hasText: "Dan" }).count())) {
        await details.getByRole("button", { name: "Add member" }).click();
        const addDialog = page.getByRole("dialog", { name: "Add member" });
        await addDialog.getByRole("searchbox", { name: "Search users" }).fill("dan");
        await addDialog.getByRole("button", { name: /Dan/ }).click();
        await expect(details.getByRole("listitem").filter({ hasText: "Dan" })).toBeVisible();
      }

      // rename → back (shared seed DB is reused across runs/projects)
      const dialog = page.getByRole("dialog", { name: "Rename group" });
      for (const name of ["Dev Chat Renamed", "Dev Chat"]) {
        await details.getByRole("button", { name: "Rename group" }).click();
        await dialog.locator('input[id="rename-group-name"]').fill(name);
        await dialog.getByRole("button", { name: "Save" }).click();
        // sheet hides main via aria-hidden — assert inside the details pane
        await expect(details.getByText(name).first()).toBeVisible();
      }

      // non-member id → error state
      await page.goto("/en/conversations/00000000-0000-0000-0000-000000000000");
      await expect(
        page.getByText("This conversation doesn't exist or you're not a member"),
      ).toBeVisible();
    });

    test("owner-less member leaves a group and it disappears from the list", async ({ page }) => {
      await login(page, "dan@dev.local");

      // dan owns a fresh throwaway group (unique name — no shared-state races)
      await page.getByRole("button", { name: "New chat" }).click();
      await page.getByRole("menuitem", { name: "New group" }).click();
      const dialog = page.getByRole("dialog", { name: "New group" });
      await dialog.locator("input").first().fill(`Dan's group ${Date.now()}`);
      await dialog.getByRole("searchbox", { name: "Search users" }).fill("bob");
      await dialog.getByRole("checkbox").check(); // select the search hit (Bob)
      const groupName = await dialog.locator("input").first().inputValue();
      await dialog.getByRole("button", { name: "Create" }).click();
      await page.waitForURL(/\/en\/conversations\//);

      await page.getByRole("button", { name: "Details" }).click();
      await page.getByRole("button", { name: "Leave conversation" }).click();
      await page
        .getByRole("dialog", { name: "Leave conversation?" })
        .getByRole("button", { name: "Leave conversation" })
        .click();
      await page.waitForURL(/\/en\/?$/);
      await expect(page.getByRole("link", { name: groupName })).not.toBeVisible();

      // dan is a member of Dev Chat → no owner controls
      await page.getByRole("link", { name: /Dev Chat/ }).click();
      await page.waitForURL(/\/en\/conversations\//);
      await page.getByRole("button", { name: "Details" }).click();
      await expect(page.getByRole("button", { name: "Rename group" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Add member" })).not.toBeVisible();
    });

    test("DM header shows the other member with last-seen subtitle", async ({ page }) => {
      await login(page, "alice@dev.local");
      await page.getByRole("link", { name: /Bob/ }).click();
      await page.waitForURL(/\/en\/conversations\//);
      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: "Bob" })).toBeVisible();
      // presence subtitle: "online" / "offline" / "last seen …"
      await expect(main.getByText(/online|offline|last seen/)).toBeVisible();
    });
  });
