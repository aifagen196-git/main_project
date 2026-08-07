import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const collectorsDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(collectorsDir, "../.env"), quiet: true });

let supabase;

export function getSupabase() {
  if (supabase) return supabase;

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in job-engine/.env",
    );
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return supabase;
}

export function runCollector(metaUrl, collector) {
  const entrypoint = process.argv[1];
  if (!entrypoint || metaUrl !== pathToFileURL(path.resolve(entrypoint)).href) {
    return;
  }

  collector().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
