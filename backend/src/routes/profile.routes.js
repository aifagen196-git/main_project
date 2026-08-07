import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// Columns a user is allowed to edit on their own profile. Billing columns are
// deliberately excluded (only Razorpay/webhook code may touch those).
const EDITABLE = ["full_name", "headline", "location"];

router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, profile: data });
});

router.patch("/", async (req, res) => {
  const update = {};
  for (const key of EDITABLE) {
    if (key in req.body) update[key] = req.body[key];
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ success: false, message: "No editable fields provided." });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, profile: data });
});

export default router;
