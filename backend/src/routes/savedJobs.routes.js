import express from "express";
import { supabase } from "../config/supabase.js";
import { scoreJobsForUser } from "../services/jobs/matching.service.js";

const router = express.Router();

// List saved jobs (full job rows), newest first. The raw jobs row carries a
// stored `match_score` of 0 (written by the collector) — rendering it
// verbatim made every saved job show "0% match" (M10). Re-score each one
// against the user's current profile instead.
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("created_at, jobs(*)")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });

  const rows = (data || []).map((r) => r.jobs).filter(Boolean);
  try {
    const scored = await scoreJobsForUser(req.user.id, rows);
    return res.json({ success: true, jobs: scored });
  } catch (e) {
    // Scoring needs a resume profile; if there's none yet (or it fails),
    // still return the saved jobs — just without a computed match score.
    console.error("Saved-jobs scoring failed, returning unscored", e.message);
    return res.json({
      success: true,
      jobs: rows.map(({ match_score, ...rest }) => rest),
    });
  }
});

// Just the saved job ids (for bookmark state).
router.get("/ids", async (req, res) => {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, ids: (data || []).map((r) => r.job_id) });
});

router.post("/", async (req, res) => {
  const { job_id } = req.body;
  if (!job_id) return res.status(400).json({ success: false, message: "job_id required" });

  const { error } = await supabase
    .from("saved_jobs")
    .upsert({ user_id: req.user.id, job_id });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.delete("/:jobId", async (req, res) => {
  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", req.user.id)
    .eq("job_id", req.params.jobId);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
