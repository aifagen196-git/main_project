import express from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// Columns a user is allowed to edit on their own profile. Billing columns are
// deliberately excluded (only Razorpay/webhook code may touch those).
const EDITABLE = ["full_name", "headline", "location"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

// Upload/replace the profile photo. Always written to the same storage key
// (userId/avatar, upsert) regardless of file type, so switching from a .png
// to a .jpg never leaves an orphaned old file behind.
router.post("/avatar", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: "No file uploaded." });
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    return res.status(400).json({ success: false, message: "Please upload a JPG, PNG or WEBP image." });
  }

  const path = `${req.user.id}/avatar`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

  if (upErr) {
    console.error("Avatar upload failed", upErr);
    return res.status(500).json({ success: false, message: "Could not upload photo." });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust: the storage key never changes on re-upload, so without this
  // an <img> pointing at the same URL would keep showing the browser's
  // cached old photo after a replace.
  const avatar_url = `${publicUrl}?v=${Date.now()}`;

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url })
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) {
    console.error("Avatar column update failed", error);
    return res.status(500).json({ success: false, message: "Could not save photo." });
  }
  return res.json({ success: true, profile: data });
});

router.delete("/avatar", async (req, res) => {
  await supabase.storage.from("avatars").remove([`${req.user.id}/avatar`]);

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, profile: data });
});

export default router;
