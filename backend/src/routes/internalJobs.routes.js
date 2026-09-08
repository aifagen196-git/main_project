import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// List active internal jobs (admin-added postings), newest first. Read-only
// for now — there's no admin UI yet to write these; rows are inserted
// directly in Supabase until that page exists.
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("internal_jobs")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, jobs: data || [] });
});

export default router;
