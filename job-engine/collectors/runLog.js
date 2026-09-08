// Writes one row to public.collector_runs per collector run, for the admin
// portal's "Collector run history" panel. Best-effort only — a logging
// failure must never take down the actual scrape/save run, so every
// function here swallows its own errors after a console.error.
//
// Deliberately self-contained (own dotenv + supabase client, not importing
// getSupabase from runtime.js) — runtime.js's runCollector() calls into this
// file, so importing runtime.js back here would be a circular import.

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const collectorsDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(collectorsDir, "../.env"), quiet: true });

let supabase;
function client() {
  if (supabase) return supabase;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return supabase;
}

/**
 * Wraps a collector's main function with start/end run logging.
 *
 * @param {string} source - matches the `source` column used elsewhere for
 *   this collector's jobs (e.g. "greenhouse", "linkedin").
 * @param {() => Promise<{ saved?: number, failed?: number } | void>} fn -
 *   the collector's actual run function. If it returns an object with
 *   `saved`/`failed` counts, those are logged too; otherwise just
 *   success/failure and duration are recorded.
 */
export async function withRunLog(source, fn) {
  const startedAt = new Date();
  let runId = null;
  const db = client();

  if (db) {
    try {
      const { data, error } = await db
        .from("collector_runs")
        .insert({ source, started_at: startedAt.toISOString() })
        .select("id")
        .single();
      if (error) throw error;
      runId = data.id;
    } catch (err) {
      console.error(`⚠ collector_runs: failed to log run start for ${source}: ${err.message}`);
    }
  }

  let result;
  let caught = null;
  try {
    result = await fn();
  } catch (err) {
    caught = err;
  }

  if (runId) {
    try {
      await db
        .from("collector_runs")
        .update({
          finished_at: new Date().toISOString(),
          success: !caught,
          saved: result && typeof result.saved === "number" ? result.saved : null,
          failed: result && typeof result.failed === "number" ? result.failed : null,
          error: caught ? String(caught.message || caught).slice(0, 2000) : null,
        })
        .eq("id", runId);
    } catch (err) {
      console.error(`⚠ collector_runs: failed to log run end for ${source}: ${err.message}`);
    }
  }

  if (caught) throw caught;
  return result;
}
