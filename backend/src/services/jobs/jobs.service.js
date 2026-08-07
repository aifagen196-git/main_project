import { supabase } from "../../config/supabase.js";

/**
 * Fetch active jobs from Supabase
 */
export async function getActiveJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data || [];
}
