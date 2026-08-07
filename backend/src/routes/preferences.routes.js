// DEAD CODE — no client calls these endpoints.
//
// Job Preferences were removed from the Settings UI: jobs are matched from the
// RESUME ONLY, and the matcher no longer reads user_job_preferences. The route
// is left mounted (harmless, still auth-gated) in case the feature returns.
import express from "express";
import { supabase } from "../config/supabase.js";
import { invalidateMatches } from "../services/jobs/matching.service.js";

const router = express.Router();

const EDITABLE = [
  "target_role",
  "preferred_location",
  "remote_only",
  "visa_sponsorship",
  "experience_level",
  "min_salary",
  "target_companies",
];

router.get("/", async (req, res) => {
  // order+limit(1) instead of maybeSingle(): the deployed table has a surrogate
  // `id` PK and no unique constraint on user_id, so tolerate (and collapse to
  // the latest) any historical duplicate rows without erroring.
  const { data, error } = await supabase
    .from("user_job_preferences")
    .select("*")
    .eq("user_id", req.user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, preferences: data?.[0] ?? null });
});

router.put("/", async (req, res) => {
  const fields = { updated_at: new Date().toISOString() };
  for (const key of EDITABLE) {
    if (key in req.body) fields[key] = req.body[key];
  }

  // Manual upsert keyed on user_id. The deployed table lacks a unique
  // constraint on user_id (schema drift from the migration), so the native
  // .upsert({ onConflict: "user_id" }) 500s — every prior save failed this way,
  // which is why no preferences were ever stored. Find-then-update/insert works
  // regardless of constraints and never creates duplicate rows.
  const { data: existing, error: selErr } = await supabase
    .from("user_job_preferences")
    .select("id")
    .eq("user_id", req.user.id)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (selErr) return res.status(500).json({ success: false, message: selErr.message });

  let data, error;
  if (existing?.[0]) {
    ({ data, error } = await supabase
      .from("user_job_preferences")
      .update(fields)
      .eq("id", existing[0].id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from("user_job_preferences")
      .insert({ user_id: req.user.id, ...fields })
      .select()
      .single());
  }

  if (error) return res.status(500).json({ success: false, message: error.message });

  // Preferences feed the match score — drop the cached feed so the next load
  // re-ranks with the new preferences.
  invalidateMatches(req.user.id);

  return res.json({ success: true, preferences: data });
});

export default router;
