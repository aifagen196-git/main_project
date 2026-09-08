import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { extractJobProfile } from "../collectors/processors/extractProfile.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Re-extracts structured fields for ACTIVE jobs using Claude over the full
// description, so the matching funnel gates + scores against real data instead
// of the dictionary-heuristic junk from early collector runs.
//
//   node processExistingJobs.js            # run until done (resumable)
//   BACKFILL_LIMIT=500 node processExistingJobs.js   # cap this run
//
// Resumable: each successfully enriched job gets profile.llm = true and is
// skipped on the next run. LLM failures leave the row unmarked for retry.

const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY || 3);
const LIMIT = Number(process.env.BACKFILL_LIMIT || 0); // 0 = no cap
const PAGE = 100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Only re-extract jobs that NEED it: those whose role_family is unclassified
// ("other" or null). Jobs the collector already classified well are left alone
// — this cuts the backfill from ~950 jobs to only the unclassified tail, so it
// finishes far faster and burns less of the (rate-limited) provider quota.
// Self-resumable: once a job is reclassified to a real family it leaves the
// set; the profile.llm marker skips ones the model re-confirms as "other".
// Set BACKFILL_ALL=1 to re-extract every active job instead.
async function fetchBatch() {
  let q = supabase
    .from("jobs")
    .select("id, title, description, profile")
    .eq("is_active", true);
  if (!process.env.BACKFILL_ALL) {
    q = q.or("role_family.is.null,role_family.eq.other");
  }
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(PAGE);
  if (error) throw error;
  // Skip rows already LLM-enriched (model kept them "other") to avoid a loop.
  return (data || []).filter((j) => !j.profile || j.profile.llm !== true);
}

async function enrichOne(job) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const profile = await extractJobProfile(job.description || "", { strict: true });
      profile.llm = true; // marks the row done (resume marker)

      const { error } = await supabase
        .from("jobs")
        .update({
          skills: profile.skills_required,
          skills_required: profile.skills_required,
          skills_preferred: profile.skills_preferred,
          role_family: profile.role_family,
          country: profile.country,
          min_years: profile.min_years,
          is_remote_us: profile.is_remote_us,
          profile,
        })
        .eq("id", job.id);
      if (error) throw error;
      return true;
    } catch (e) {
      const status = e.status || e.statusCode;
      if ((status === 429 || status === 529) && attempt < 2) {
        await sleep(30000); // rate limited — wait out the window
        continue;
      }
      console.error(`  ✗ ${job.title?.slice(0, 50)}: ${e.message?.slice(0, 80)}`);
      return false;
    }
  }
  return false;
}

async function run() {
  console.log("Backfill started (concurrency", CONCURRENCY + ", limit", LIMIT || "none", ")");
  let done = 0, failed = 0;
  const t0 = Date.now();

  while (true) {
    const batch = await fetchBatch();
    if (!batch.length) break;
    if (LIMIT && done >= LIMIT) break;

    let i = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, batch.length) }, async () => {
        while (i < batch.length && (!LIMIT || done < LIMIT)) {
          const job = batch[i++];
          const ok = await enrichOne(job);
          if (ok) done++; else failed++;
          if ((done + failed) % 25 === 0) {
            const rate = done / ((Date.now() - t0) / 60000);
            console.log(`  ${done} enriched, ${failed} failed  (${rate.toFixed(1)}/min)`);
          }
        }
      }),
    );

    // If everything in this page failed, stop rather than spin forever.
    if (batch.length && done === 0 && failed >= batch.length) {
      console.error("All jobs in the batch failed — check the API key / rate limits.");
      break;
    }
  }

  console.log(`Done. Enriched ${done}, failed ${failed}, in ${((Date.now() - t0) / 60000).toFixed(1)} min.`);
}

run();
