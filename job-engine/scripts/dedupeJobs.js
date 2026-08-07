// scripts/dedupeJobs.js
//
// Finds jobs that are the same role at the same employer in the same place,
// posted more than once (re-posted under a new id, or listed on several
// boards), and retires all but the best copy.
//
// Run a REPORT first (default — touches nothing):
//    node scripts/dedupeJobs.js
// Then apply:
//    node scripts/dedupeJobs.js --apply
//
// "Retire" means is_active = false, not DELETE: the matcher only reads
// is_active = true, and cleanupExpiredJobs.js purges long-inactive rows
// later. That keeps this reversible if a fingerprint ever over-collapses.

import { getSupabase, runCollector } from "../collectors/runtime.js";
import { jobFingerprint } from "../processors/fingerprint.js";
import { createLogger } from "../processors/logger.js";

const log = createLogger("dedupe");
const APPLY = process.argv.includes("--apply");

/** Which copy to keep: richest description, then most recently seen. */
function bestOf(rows) {
  return [...rows].sort((a, b) => {
    const d = (b.description || "").length - (a.description || "").length;
    if (d !== 0) return d;
    return (
      (Date.parse(b.last_seen) || 0) - (Date.parse(a.last_seen) || 0)
    );
  })[0];
}

async function fetchAllActive(sb) {
  const rows = [];
  let from = 0;
  // PostgREST caps a response at 1000 rows — page explicitly.
  while (true) {
    const { data, error } = await sb
      .from("jobs")
      .select("id,title,company,location,source,description,last_seen")
      .eq("is_active", true)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

export default async function dedupeExistingJobs() {
  const sb = getSupabase();
  log.info(APPLY ? "Mode: APPLY" : "Mode: REPORT ONLY (pass --apply to write)");

  const rows = await fetchAllActive(sb);
  log.info(`Scanned ${rows.length} active jobs`);

  const groups = new Map();
  for (const row of rows) {
    const fp = jobFingerprint(row);
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp).push(row);
  }

  const dupeGroups = [...groups.values()].filter((g) => g.length > 1);
  const retireIds = [];
  for (const group of dupeGroups) {
    const keep = bestOf(group);
    for (const row of group) if (row.id !== keep.id) retireIds.push(row.id);
  }

  log.info(
    `Found ${dupeGroups.length} duplicate groups covering ${retireIds.length} redundant rows`,
  );

  for (const group of dupeGroups.sort((a, b) => b.length - a.length).slice(0, 10)) {
    const sources = [...new Set(group.map((r) => r.source))].join(",");
    log.info(
      `  ${group.length}x ${JSON.stringify((group[0].title || "").slice(0, 44))} @ ${group[0].company} [${sources}]`,
    );
  }

  if (!APPLY) {
    log.warn("Report only — nothing written. Re-run with --apply to retire these.");
    return { groups: dupeGroups.length, wouldRetire: retireIds.length };
  }

  let retired = 0;
  const CHUNK = 200;
  for (let i = 0; i < retireIds.length; i += CHUNK) {
    const batch = retireIds.slice(i, i + CHUNK);
    const { error } = await sb
      .from("jobs")
      .update({ is_active: false })
      .in("id", batch);
    if (error) {
      log.error(`batch of ${batch.length} failed: ${error.message}`);
      continue;
    }
    retired += batch.length;
  }

  log.success(`Retired ${retired} duplicate rows`);
  return { groups: dupeGroups.length, retired };
}

runCollector(import.meta.url, dedupeExistingJobs);
