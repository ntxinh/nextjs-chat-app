import { expect, test } from "@playwright/test";

test("app loads localized shell", async ({ page, isMobile }) => {
  // Mobile is list-first: <main> is hidden at "/" and owns the screen only on
  // conversation routes, so navigate deep enough for the landmark to render.
  await page.goto(isMobile ? "/en/conversations/smoke" : "/en");
  await expect(page.getByRole("main")).toBeVisible();
});
