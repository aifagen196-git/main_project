import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// List saved jobs (full job rows), newest first.
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("created_at, jobs(*)")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({
    success: true,
    jobs: (data || []).map((r) => r.jobs).filter(Boolean),
  });
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
