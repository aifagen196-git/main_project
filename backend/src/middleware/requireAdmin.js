import { supabase } from "../config/supabase.js";

// Chain after requireAuth (needs req.user already set). Checks the same
// public.admins allowlist the admin app's Supabase RLS policies use (see
// supabase/migrations/0012_internal_jobs.sql) — this backend uses the
// service-role client, so it bypasses RLS and must enforce the check itself.
export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
  if (!data) {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  return next();
}
