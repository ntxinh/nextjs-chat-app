import { expect, test } from "@playwright/test";
import { newAuthedPage } from "./auth";

// Serial: shared seed DB.
test.describe
  .serial("conversation header + details", () => {
    test("owner renames group; member role sees no owner controls", async ({ browser }) => {
      const page = await newAuthedPage(browser, "alice@dev.local");
      await page.goto("/en");
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

      // rename a THROWAWAY group — "Dev Chat" is shared state across parallel
      // projects (desktop+mobile workers), renaming it mid-run flakes them.
      // Close details first: desktop aside has "Close details", the mobile
      // sheet only has "Close" (the aside button is display:none there).
      await details.getByRole("button", { name: /Close/i }).first().click();
      // Mobile hides the sidebar while inside a conversation → go to the list
      await page.goto("/en");
      await page.getByRole("button", { name: "New chat" }).click();
      await page.getByRole("menuitem", { name: "New group" }).click();
      const createDialog = page.getByRole("dialog", { name: "New group" });
      const throwaway = `Renamed group ${Date.now()}`;
      await createDialog.locator("input").first().fill(throwaway);
      await createDialog.getByRole("searchbox", { name: "Search users" }).fill("bob");
      await createDialog.getByRole("checkbox").check();
      await createDialog.getByRole("button", { name: "Create" }).click();
      await page.waitForURL(/\/en\/conversations\//);
      // Desktop: details closed above → reopen. Mobile: the sheet stayed open
      // through navigation (detailsOpen persists in zustand) → skip.
      if ((await details.count()) === 0) {
        await page.getByRole("button", { name: "Details" }).click();
      }
      const renameDialog = page.getByRole("dialog", { name: "Rename group" });
      await details.getByRole("button", { name: "Rename group" }).click();
      await renameDialog.locator('input[id="rename-group-name"]').fill(`${throwaway} v2`);
      await renameDialog.getByRole("button", { name: "Save" }).click();
      await expect(details.getByText(`${throwaway} v2`).first()).toBeVisible();

      // non-member id → error state
      await page.goto("/en/conversations/00000000-0000-0000-0000-000000000000");
      await expect(
        page.getByText("This conversation doesn't exist or you're not a member"),
      ).toBeVisible({ timeout: 15_000 });

      // cleanup: leave the throwaway group — leftover groups crowd the
      // 20-item sidebar page and flake sibling specs
      await page.getByRole("link", { name: new RegExp(throwaway) }).click();
      await page.waitForURL(/\/en\/conversations\//);
      await page.getByRole("button", { name: "Details" }).click();
      await details.getByRole("button", { name: "Leave conversation" }).click();
      await page
        .getByRole("dialog", { name: "Leave conversation?" })
        .getByRole("button", { name: "Leave conversation" })
        .click();
      await page.waitForURL(/\/en\/?$/);
    });

    test("owner-less member leaves a group and it disappears from the list", async ({
      browser,
    }) => {
      const page = await newAuthedPage(browser, "dan@dev.local");
      await page.goto("/en");
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

    test("DM header shows the other member with last-seen subtitle", async ({ browser }) => {
      const page = await newAuthedPage(browser, "alice@dev.local");
      await page.goto("/en");
      await page.getByRole("link", { name: /Bob/ }).click();
      await page.waitForURL(/\/en\/conversations\//);
      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: "Bob" })).toBeVisible();
      // presence subtitle: "online" / "offline" / "last seen …"
      await expect(main.getByText(/online|offline|last seen/)).toBeVisible();
    });
  });
