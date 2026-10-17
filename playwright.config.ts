import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/en",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: devices["Desktop Chrome"] },
    { name: "mobile", use: devices["Pixel 7"] },
  ],
});
