// Runs the live-database check scripts one after another.
// Usage: npm run test:integration [-- name ...]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, "../..");
const repoRoot = path.resolve(backend, "..");
const all = ["mfa-test", "key-test", "audit3-test", "audit4-test", "trial-test", "security-test"];
const names = process.argv.slice(2).length ? process.argv.slice(2) : all;
let failed = 0;
for (const n of names) {
  console.log("\n=== " + n);
  const r = spawnSync(process.execPath, [path.join(here, n + ".mjs"), repoRoot, repoRoot], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
console.log(failed ? "\n" + failed + " script(s) failed" : "\nall scripts passed");
process.exit(failed ? 1 : 0);
