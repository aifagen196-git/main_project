import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

const STATUSES = ["applied", "interviewing", "assessment", "offer", "rejected"];

// Only plain web links may be stored — the tracker renders this as an href.
function cleanUrl(value) {
  if (value == null || value === "") return null;
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href.slice(0, 2000) : undefined;
  } catch {
    return undefined;
  }
}

const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : v);

router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", req.user.id)
    .order("applied_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, applications: data || [] });
});

router.post("/", async (req, res) => {
  const { status = "applied", match_score = null, job_id = null } = req.body;
  const company = clip(req.body.company, 120);
  const role = clip(req.body.role, 160);
  const apply_url = cleanUrl(req.body.apply_url);
  if (!company || !role) {
    return res.status(400).json({ success: false, message: "company and role are required" });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "invalid status" });
  }
  if (apply_url === undefined) {
    return res.status(400).json({ success: false, message: "apply_url must be an http(s) link" });
  }

  // One application per job: if this job is already tracked, return the
  // existing row instead of creating a duplicate.
  if (job_id) {
    const { data: existing } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("job_id", job_id)
      .maybeSingle();
    if (existing) {
      return res.json({ success: true, application: existing, already: true });
    }
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({ user_id: req.user.id, company, role, status, match_score, apply_url, job_id })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.status(201).json({ success: true, application: data });
});

router.patch("/:id", async (req, res) => {
  const update = { updated_at: new Date().toISOString() };
  for (const key of ["company", "role", "status", "match_score", "apply_url", "notes"]) {
    if (key in req.body) update[key] = req.body[key];
  }
  if ("company" in update) update.company = clip(update.company, 120);
  if ("role" in update) update.role = clip(update.role, 160);
  if ("notes" in update) update.notes = clip(update.notes, 5000);
  if ("apply_url" in update) {
    update.apply_url = cleanUrl(update.apply_url);
    if (update.apply_url === undefined) {
      return res.status(400).json({ success: false, message: "apply_url must be an http(s) link" });
    }
  }
  if (update.status && !STATUSES.includes(update.status)) {
    return res.status(400).json({ success: false, message: "invalid status" });
  }

  const { data, error } = await supabase
    .from("applications")
    .update(update)
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, application: data });
});

router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
