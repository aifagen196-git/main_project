import express from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// Columns a user is allowed to edit on their own profile. Billing columns are
// deliberately excluded (only Razorpay/webhook code may touch those), and so
// are mobile / area_of_interest, which only an admin may change.
const EDITABLE = ["full_name", "headline", "location"];

function sniffImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}

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
    if (!(key in req.body)) continue;
    const v = req.body[key];
    if (v != null && typeof v !== "string") {
      return res.status(400).json({ success: false, message: `${key} must be text.` });
    }
    update[key] = v == null ? null : v.trim().slice(0, key === "headline" ? 160 : 100);
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
  // The declared mimetype is client-controlled; check the file's real header
  // too, since this lands in a PUBLIC bucket.
  const sniffed = sniffImageType(file.buffer);
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype) || !sniffed) {
    return res.status(400).json({ success: false, message: "Please upload a JPG, PNG or WEBP image." });
  }

  const path = `${req.user.id}/avatar`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file.buffer, { contentType: sniffed, upsert: true });

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
