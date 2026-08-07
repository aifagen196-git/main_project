import { supabase } from "../../config/supabase.js";

/**
 * Returns the latest analyzed resume
 * for a given user.
 */
export async function getLatestResume(userId) {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", {
      ascending: false,
    })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}
