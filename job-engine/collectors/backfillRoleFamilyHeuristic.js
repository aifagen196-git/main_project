import dotenv from "dotenv";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { inferRoleFamily } from "../vendor/scoreMatch.js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Free, title-regex-only backfill for existing rows stuck at role_family
// "other" — no Claude/Groq/Gemini calls, unlike processExistingJobs.js
// (which needs a working ANTHROPIC_API_KEY). This just applies the same
// inferRoleFamily(title) the collectors now run at insert time (see
// collectors/processors/extractProfile.js) and the matcher already uses
// live at match time, so it brings old rows in line with both.
//
//   node backfillRoleFamilyHeuristic.js
//
// Only writes rows where the regex actually resolves to a real family —
// titles with no signal are left as "other" rather than being touched for
// no reason.

const PAGE = 500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retries a Supabase call a few times on transient network failures
// (`fetch failed` etc. — a raw thrown exception, not a `{error}` result,
// which an earlier version of this script didn't catch and crashed on
// mid-run via an unhandled promise rejection).
async function withRetry(fn, label) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === 3) {
        console.error(`  ✗ ${label} failed after retries: ${err.message}`);
        return null;
      }
      await sleep(1000 * (attempt + 1));
    }
  }
}

async function run() {
  console.log("Heuristic role_family backfill started (no API calls)");

  let updated = 0;
  let scanned = 0;
  // Cursor on id, not offset: rows that DO get updated drop out of the
  // "other"/null filter, and rows with no regex signal stay in it forever
  // — with offset-based pagination that shrinking/static mix skips some
  // rows and infinite-loops on others. An id cursor advances regardless.
  let lastId = null;

  while (true) {
    const result = await withRetry(async () => {
      let q = supabase
        .from("jobs")
        .select("id, title, role_family")
        .or("role_family.is.null,role_family.eq.other")
        .order("id", { ascending: true })
        .limit(PAGE);
      if (lastId !== null) q = q.gt("id", lastId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }, "select page");

    if (!result) break; // gave up after retries — safe to stop, run is resumable
    if (!result.length) break;

    scanned += result.length;
    lastId = result[result.length - 1].id;

    const toUpdate = result
      .map((job) => ({ id: job.id, family: inferRoleFamily(job.title || "") }))
      .filter((row) => row.family);

    // Group by target family so each page needs at most ~19 update calls
    // (one per distinct family) instead of one per row — far fewer
    // requests, which is also what was straining the connection and
    // triggering the fetch failures above.
    const byFamily = new Map();
    for (const row of toUpdate) {
      if (!byFamily.has(row.family)) byFamily.set(row.family, []);
      byFamily.get(row.family).push(row.id);
    }

    for (const [family, ids] of byFamily) {
      const ok = await withRetry(async () => {
        const { error: updErr } = await supabase
          .from("jobs")
          .update({ role_family: family })
          .in("id", ids);
        if (updErr) throw updErr;
        return true;
      }, `batch update (${family}, ${ids.length} rows)`);
      if (ok) updated += ids.length;
    }

    console.log(`  scanned ${scanned}, updated ${updated} so far`);

    if (result.length < PAGE) break;
  }

  console.log(`Done. Scanned ${scanned}, updated ${updated}.`);
}

// CLI-only guard — see collectors/runtime.js's runCollector() for the same
// pattern used everywhere else in this repo. Without it, import()-ing this
// file for any reason runs a real backfill against production as a side
// effect (this already happened once during verification).
const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(path.resolve(entrypoint)).href) {
  run().catch((err) => {
    console.error("Backfill crashed:", err.message);
    process.exit(1);
  });
}
