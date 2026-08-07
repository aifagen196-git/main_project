// scripts/cleanupExpiredJobs.js
//
// Database-quality pass, meant to run on a schedule (cron / GitHub Action)
// separately from the collectors themselves:
//   1) Deactivate jobs whose stored expires_at has passed and are still
//      marked active (belt-and-suspenders — each collector already
//      deactivates on last_seen, this catches anything that slipped through).
//   2) Hard-delete jobs that have been inactive for a long time — the matcher
//      only ever reads is_active = true rows, so keeping them forever just
//      bloats the table and the 1000-row pagination the matcher already
//      has to paginate around.
//
// Run:
//    node scripts/cleanupExpiredJobs.js

import { getSupabase, runCollector } from "../collectors/runtime.js";
import { createLogger } from "../processors/logger.js";

const log = createLogger("cleanup");

// How long a job can sit inactive before it's purged outright.
const ARCHIVE_AFTER_DAYS = Number(process.env.ARCHIVE_AFTER_DAYS || 90);

async function deactivateExpired() {
  const sb = getSupabase();
  const nowIso = new Date().toISOString();

  const { error, count } = await sb
    .from("jobs")
    .update({ is_active: false })
    .lt("expires_at", nowIso)
    .eq("is_active", true)
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(`deactivate pass failed: ${error.message}`);
  return count ?? 0;
}

async function purgeStaleInactive() {
  const sb = getSupabase();
  const cutoff = new Date(
    Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error, count } = await sb
    .from("jobs")
    .delete()
    .eq("is_active", false)
    .lt("last_seen", cutoff)
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(`purge pass failed: ${error.message}`);
  return count ?? 0;
}

export default async function cleanupExpiredJobs() {
  log.info("Cleanup started");

  const deactivated = await deactivateExpired();
  log.success(`Deactivated ${deactivated} expired job(s)`);

  const purged = await purgeStaleInactive();
  log.success(
    `Purged ${purged} job(s) inactive for over ${ARCHIVE_AFTER_DAYS} days`,
  );

  log.info("Cleanup finished");
  return { deactivated, purged };
}

runCollector(import.meta.url, cleanupExpiredJobs);
