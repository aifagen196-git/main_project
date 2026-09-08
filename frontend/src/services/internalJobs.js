import { supabase } from "../lib/supabase";

/**
 * Active internal (AIFAGen-posted) job listings. Reads straight from
 * Supabase — no backend route needed — the same pattern most of this app's
 * simple reads already use. RLS (see supabase/migrations/0012_internal_jobs.sql)
 * restricts this to is_active rows for anyone who isn't an admin.
 */
export async function getInternalJobs() {
  const { data, error } = await supabase
    .from("internal_jobs")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
