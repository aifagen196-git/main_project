// tests/testIndeedCollector.js
//
// Bounded live smoke test for the Indeed collector. The collector itself is
// config-driven (no query/location args — see config/indeedSearches.js and
// config/locations.js) and writes straight to Supabase rather than returning
// a job list, so this drives it through env vars exactly like a real run
// would, just capped small.
//
// Run:
//    INDEED_SEARCH_PAIRS=2 INDEED_MAX_PAGES=1 node tests/testIndeedCollector.js

import collectIndeedJobs from "../collectors/indeed.js";

async function main() {
  console.log("====================================");
  console.log("Testing Indeed Collector (bounded)");
  console.log("====================================\n");

  const stats = await collectIndeedJobs();

  console.log("\n✅ Collector run finished. Stats:");
  console.table(stats);
}

main().catch(console.error);
