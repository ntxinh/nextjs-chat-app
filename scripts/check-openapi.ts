import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildOpenApiDocument } from "../src/lib/openapi/document";

const SNAPSHOT = "openapi/openapi.json";

// Key-order-stable stringify so the diff reflects real drift, not map order.
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );

const rendered = `${JSON.stringify(JSON.parse(stable(buildOpenApiDocument())), null, 2)}\n`;

if (process.argv.includes("--write")) {
  mkdirSync("openapi", { recursive: true });
  writeFileSync(SNAPSHOT, rendered);
  console.log(`wrote ${SNAPSHOT}`);
} else {
  let committed: string;
  try {
    committed = readFileSync(SNAPSHOT, "utf8");
  } catch {
    console.error(`${SNAPSHOT} missing — run: pnpm api:check -- --write`);
    process.exit(1);
  }
  if (committed !== rendered) {
    console.error(`${SNAPSHOT} is stale — regenerate with: pnpm api:check -- --write`);
    process.exit(1);
  }
  console.log(`${SNAPSHOT} is up to date`);
}
