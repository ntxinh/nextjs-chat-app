import { type Browser, type Page, request } from "@playwright/test";

/**
 * One API login per user per worker process, cached to a storageState file.
 * The sign-in endpoint is rate-limited (10/min across the whole suite), so
 * driving real UI logins per test flakes the run; this signs in once through
 * the same better-auth endpoint the UI calls and reuses the session cookie.
 */
const stateCache = new Map<string, string>();

export async function loginStorageState(email: string): Promise<string> {
  const cached = stateCache.get(email);
  if (cached) return cached;
  const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
  const res = await ctx.post("/api/auth/sign-in/email", {
    data: { email, password: "password1234" },
  });
  if (!res.ok()) {
    throw new Error(`e2e login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const path = `tests/e2e/.auth/${email.split("@")[0]}.json`;
  await ctx.storageState({ path });
  await ctx.dispose();
  stateCache.set(email, path);
  return path;
}

/** New page in a fresh context already signed in as `email`. */
export async function newAuthedPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ storageState: await loginStorageState(email) });
  return context.newPage();
}
