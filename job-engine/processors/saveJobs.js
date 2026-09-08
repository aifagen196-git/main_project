// processors/saveJobs.js
//
// Shared persistence for every collector. This logic used to be copy-pasted
// into all six, and it drifted: five kept a 500-row chunk that trips
// Postgres' statement_timeout, one swallowed the error message entirely
// (`console.error()` with no argument), and all of them logged a success
// count even when the upsert had just failed.

import { getSupabase } from "../collectors/runtime.js";
import { dedupeJobs, jobFingerprint } from "./fingerprint.js";

/**
 * Of the given source_job_ids, which does this source ALREADY have stored
 * with a usable full description?
 *
 * Used to spend a scarce per-run detail-fetch budget only on jobs we don't
 * already have enriched. Re-clicking a job whose full description is already
 * in the table costs a request against a rate limit that has been observed
 * issuing challenge pages — and buys nothing.
 *
 * @param {string} source
 * @param {string[]} ids
 * @param {number} minDescriptionLength - below this a stored description is
 *   treated as a search-snippet, i.e. still worth enriching
 * @returns {Promise<Set<string>>}
 */
export async function fetchEnrichedJobIds(source, ids, minDescriptionLength = 1000) {
  const known = new Set();
  if (!ids.length) return known;

  const sb = getSupabase();
  const CHUNK_IDS = 200; // keep the `in` list well inside URL length limits
  for (let i = 0; i < ids.length; i += CHUNK_IDS) {
    const slice = ids.slice(i, i + CHUNK_IDS);
    const { data, error } = await sb
      .from("jobs")
      .select("source_job_id, description")
      .eq("source", source)
      .in("source_job_id", slice);
    if (error) {
      console.error(`⚠ existing-job lookup failed: ${error.message}`);
      return known; // degrade to "know nothing" — worst case we re-enrich
    }
    for (const row of data || []) {
      if ((row.description || "").length >= minDescriptionLength) {
        known.add(row.source_job_id);
      }
    }
  }
  return known;
}

/**
 * Drop candidate rows that are the same posting as something ALREADY in the
 * table under a DIFFERENT source_job_id (an employer re-post).
 *
 * saveJobs()'s own dedupe only compares rows WITHIN one batch, and the DB's
 * unique constraint is on (source, source_job_id) — so a re-post collected on
 * a later run slips past both. A live audit found 10 such groups (20 rows) in
 * the Indeed data.
 *
 * Only rows from the same companies are loaded for comparison, so this stays
 * cheap as the table grows rather than pulling every row of the source.
 *
 * @param {string} source
 * @param {object[]} rows - candidate rows (already normalized)
 * @returns {Promise<{rows: object[], removed: number}>}
 */
export async function dropAlreadyStored(source, rows) {
  if (!rows.length) return { rows, removed: 0 };

  const companies = [...new Set(rows.map((r) => r.company).filter(Boolean))];
  if (!companies.length) return { rows, removed: 0 };

  const sb = getSupabase();
  const existing = [];
  const CHUNK_CO = 100;
  for (let i = 0; i < companies.length; i += CHUNK_CO) {
    const slice = companies.slice(i, i + CHUNK_CO);
    const { data, error } = await sb
      .from("jobs")
      .select("source_job_id, title, company, location")
      .eq("source", source)
      .in("company", slice);
    if (error) {
      console.error(`⚠ cross-run dedupe lookup failed: ${error.message}`);
      return { rows, removed: 0 }; // don't drop anything on a failed lookup
    }
    existing.push(...(data || []));
  }

  const storedPrints = new Map(); // fingerprint -> source_job_id already stored
  for (const row of existing) storedPrints.set(jobFingerprint(row), row.source_job_id);

  const kept = rows.filter((row) => {
    const stored = storedPrints.get(jobFingerprint(row));
    // Same id = a normal update of the same posting, keep it (it refreshes
    // last_seen/salary/description). Different id = a duplicate re-post.
    return stored === undefined || stored === row.source_job_id;
  });

  return { rows: kept, removed: rows.length - kept.length };
}

/**
 * Retire postings whose stored expires_at has passed.
 *
 * Deactivates (is_active = false) rather than DELETEs: the matcher only reads
 * is_active = true, saved_jobs/applications have FKs onto jobs.id that would
 * cascade or null out, and the retention migration (0008) owns hard deletion
 * on a schedule. Keeping this non-destructive means a collector run can never
 * silently destroy user-referenced data.
 *
 * @param {string} source
 * @returns {Promise<number>} rows retired
 */
export async function retireExpired(source) {
  if (!source) throw new Error("retireExpired requires a source");

  const { error, count } = await getSupabase()
    .from("jobs")
    .update({ is_active: false })
    .eq("source", source)
    .lt("expires_at", new Date().toISOString())
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`⚠ Expiry pass failed: ${error.message}`);
    return 0;
  }
  console.log(`⌛ Retired ${count ?? 0} expired ${source} jobs`);
  return count ?? 0;
}

// 500-row upserts of full job descriptions intermittently trip
// statement_timeout. Smaller chunks lose less when one does fail.
const CHUNK = Number(process.env.UPSERT_CHUNK || 100);

// A batch that trips statement_timeout used to be an all-or-nothing loss —
// a live scheduled run of the Indeed collector (which now attaches full
// descriptions up to ~10KB per row, versus a KB or so before) lost 100% of
// 82 jobs to a single timed-out chunk, because 82 fit under the 100-row
// CHUNK and so was never split further. On a timeout specifically (not any
// other error — a bad-data error would just fail again identically), halve
// the batch and retry each half, down to this floor, before giving up on
// whatever's left.
const MIN_SPLIT_SIZE = Number(process.env.UPSERT_MIN_SPLIT || 10);

function isStatementTimeout(error) {
  return /statement timeout/i.test(error?.message || "");
}

async function upsertWithSplit(sb, batch, stats, result) {
  const { error } = await sb
    .from("jobs")
    .upsert(batch, { onConflict: "source,source_job_id" });

  if (!error) {
    result.saved += batch.length;
    stats.saved = (stats.saved || 0) + batch.length;
    return;
  }

  if (isStatementTimeout(error) && batch.length > MIN_SPLIT_SIZE) {
    const mid = Math.ceil(batch.length / 2);
    console.log(
      `   ⏳ batch of ${batch.length} timed out — splitting into ${mid}/${batch.length - mid} and retrying`,
    );
    await upsertWithSplit(sb, batch.slice(0, mid), stats, result);
    await upsertWithSplit(sb, batch.slice(mid), stats, result);
    return;
  }

  result.failed += batch.length;
  stats.failed = (stats.failed || 0) + batch.length;
  console.error(`❌ batch of ${batch.length} failed: ${error.message}`);
}

/**
 * De-duplicate then batch-upsert a set of normalized job rows.
 *
 * @param {object[]} rows
 * @param {object} [stats] - mutated in place: saved / failed / deduped
 * @param {{dedupe?: boolean, label?: string}} [opts]
 * @returns {Promise<{saved:number, failed:number, deduped:number, attempted:number}>}
 */
export async function saveJobs(rows = [], stats = {}, opts = {}) {
  const result = { saved: 0, failed: 0, deduped: 0, attempted: 0 };
  if (!rows.length) return result;

  let toSave = rows;
  if (opts.dedupe !== false) {
    const { unique, removed } = dedupeJobs(rows);
    toSave = unique;
    result.deduped = removed;
    stats.deduped = (stats.deduped || 0) + removed;
  }
  result.attempted = toSave.length;

  const sb = getSupabase();
  for (let i = 0; i < toSave.length; i += CHUNK) {
    const batch = toSave.slice(i, i + CHUNK);
    await upsertWithSplit(sb, batch, stats, result);
  }

  return result;
}

/**
 * Retire postings from ONE source that this run did not see.
 *
 * The source filter is not optional. Greenhouse and Ashby previously ran this
 * with no `.eq("source", ...)`, so a single `npm run greenhouse` deactivated
 * every job in the table that any other collector had not refreshed inside
 * the window — including sources owned by other collectors entirely.
 *
 * @param {string} source - required; the collector's own source key
 * @param {number} hours - liveness window
 */
export async function deactivateStale(source, hours) {
  if (!source) throw new Error("deactivateStale requires a source");

  const staleCutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { error, count } = await getSupabase()
    .from("jobs")
    .update({ is_active: false })
    .eq("source", source)
    .lt("last_seen", staleCutoff)
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`⚠ Deactivation pass failed: ${error.message}`);
    return 0;
  }
  console.log(`🗑 Deactivated ${count ?? 0} stale ${source} jobs`);
  return count ?? 0;
}

export default saveJobs;
