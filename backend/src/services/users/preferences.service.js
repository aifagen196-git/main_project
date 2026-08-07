import { supabase } from "../../config/supabase.js";

export async function getUserPreferences(userId) {
  const { data, error } = await supabase
    .from("user_job_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (
    data ?? {
      target_role: null,
      preferred_location: null,
      remote_only: false,
      visa_sponsorship: false,
      experience_level: null,
      min_salary: null,
      target_companies: [],
    }
  );
}
