import { execSync } from "node:child_process";

export default function () {
  // Must be set before any test file imports src/lib/db (env is read at import time).
  process.env.DATABASE_URL = `file:${process.cwd()}/tests/integration/.test.db`;
  execSync("pnpm db:migrate", { stdio: "inherit" });
}
