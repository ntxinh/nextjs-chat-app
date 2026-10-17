import { expect, test } from "@playwright/test";

test("sidebar lists, filters, and creates conversations", async ({ page }) => {
  await page.goto("/en/login");
  await page.fill('input[name="email"]', "alice@dev.local");
  await page.fill('input[name="password"]', "password1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/en\/?$/);

  // DM (Bob) + group (Dev Chat) listed
  await expect(page.getByRole("link", { name: /Bob/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Dev Chat/ })).toBeVisible();

  // client-side filter
  await page.fill('input[type="search"]', "dev");
  await expect(page.getByRole("link", { name: /Dev Chat/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Bob/ })).not.toBeVisible();
  await page.fill('input[type="search"]', "zzz");
  await expect(page.getByText("No conversations match your search")).toBeVisible();
  await page.fill('input[type="search"]', "");

  // user search "bo" → bob
  await page.getByRole("button", { name: "New chat" }).click();
  await page.getByRole("menuitem", { name: "New direct message" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox", { name: "Search users" }).fill("bo");
  await expect(dialog.getByRole("button", { name: /Bob/ })).toBeVisible();
  await expect(dialog.getByText("Carol")).not.toBeVisible();

  // create DM with carol → navigates
  await dialog.getByRole("searchbox", { name: "Search users" }).fill("carol");
  await dialog.getByRole("button", { name: /Carol/ }).click();
  await page.waitForURL(/\/en\/conversations\//);
});
