import dotenv from "dotenv";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Free, regex-only backfill for existing `jobs` rows with no
// work_auth_required set — no Claude/Groq/Gemini calls, same pattern as
// backfillRoleFamilyHeuristic.js. Before this, work_auth_required only got
// populated by the (currently disabled) paid LLM path, so the matcher's
// clearance soft-cap (scoreMatch.js softCap()) never had anything to act
// on for collector-inserted rows — clearance/citizenship-required jobs
// scored and ranked exactly like every other job.
//
//   node backfillWorkAuthHeuristic.js

const CLEARANCE_RE =
  /\b(security clearance|secret clearance|top secret|ts\/sci|active clearance|dod clearance|public trust clearance|clearance required|must (?:currently )?(?:hold|have) an? (?:active )?clearance)\b/i;
const CITIZEN_RE =
  /\b(u\.?s\.?\s*citizen(?:ship)?\s*(?:is\s*)?required|must be an? u\.?s\.?\s*citizen|u\.?s\.?\s*citizens? only|citizenship required)\b/i;

function detectWorkAuthRequired(text) {
  const flags = [];
  if (CLEARANCE_RE.test(text)) flags.push("clearance");
  if (CITIZEN_RE.test(text)) flags.push("citizen");
  return flags.length ? flags.join(", ") : null;
}

const PAGE = 300; // smaller than the role_family backfill — rows carry full descriptions here
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  console.log("Heuristic work_auth_required backfill started (no API calls)");

  let updated = 0;
  let scanned = 0;
  let lastId = null;

  while (true) {
    const result = await withRetry(async () => {
      let q = supabase
        .from("jobs")
        .select("id, title, description")
        .is("work_auth_required", null)
        .order("id", { ascending: true })
        .limit(PAGE);
      if (lastId !== null) q = q.gt("id", lastId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }, "select page");

    if (!result) break;
    if (!result.length) break;

    scanned += result.length;
    lastId = result[result.length - 1].id;

    const toUpdate = result
      .map((job) => ({
        id: job.id,
        value: detectWorkAuthRequired(`${job.title || ""} ${job.description || ""}`),
      }))
      .filter((row) => row.value);

    const byValue = new Map();
    for (const row of toUpdate) {
      if (!byValue.has(row.value)) byValue.set(row.value, []);
      byValue.get(row.value).push(row.id);
    }

    for (const [value, ids] of byValue) {
      const ok = await withRetry(async () => {
        const { error: updErr } = await supabase
          .from("jobs")
          .update({ work_auth_required: value })
          .in("id", ids);
        if (updErr) throw updErr;
        return true;
      }, `batch update (${value}, ${ids.length} rows)`);
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
