import express from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";
import {
  detectSkills,
  analyzeAndExtract,
  analyzeResume,
  improveResume,
  rewriteResume,
} from "../services/resume/resumeProcessing.service.js";
import {
  buildImprovedResumeDocx,
  buildFullResumeDocx,
} from "../services/resume/improvedResumeDoc.service.js";
import { consumeAiUsage } from "../services/ai/usage.js";
import { invalidateMatches } from "../services/jobs/matching.service.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const ALLOWED = new Set(["pdf", "docx"]);

function safeName(name = "") {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Server-side text extraction so the browser never needs pdfjs/mammoth.
// NOTE: pdf-parse v2 exports a PDFParse class (no default function export).
async function extractText(buffer, ext) {
  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (ext === "docx") {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  return "";
}

router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", req.user.id)
    .order("uploaded_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, resumes: data || [] });
});

router.get("/latest", async (req, res) => {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", req.user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, resume: data?.[0] ?? null });
});

router.post("/", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: "No file uploaded." });

  const ext = file.originalname.split(".").pop()?.toLowerCase();
  if (!ALLOWED.has(ext)) {
    return res.status(400).json({ success: false, message: "Please upload a PDF or DOCX resume." });
  }

  const path = `${req.user.id}/${Date.now()}-${safeName(file.originalname)}`;

  const { error: upErr } = await supabase.storage
    .from("resumes")
    .upload(path, file.buffer, { contentType: file.mimetype });
  if (upErr) return res.status(500).json({ success: false, message: upErr.message });

  let extracted_text = "";
  let extractionError = null;
  try {
    extracted_text = await extractText(file.buffer, ext);
  } catch (e) {
    console.error("Text extraction failed", e);
    extractionError = e;
  }

  // Reject a file we couldn't actually read (M6, M7): a renamed .txt→.pdf
  // throws in the parser; a scanned/image-only PDF "parses" but yields a few
  // characters of pdf-parse boilerplate. Either way, creating a resume row
  // with empty/garbage text silently poisons matching — the role gate can't
  // classify it, so the feed degrades to ~the whole pool (B2). A resume
  // needs real, selectable text.
  const MIN_RESUME_CHARS = 200;
  const cleanLen = extracted_text.replace(/\s+/g, " ").trim().length;
  if (extractionError || cleanLen < MIN_RESUME_CHARS) {
    await supabase.storage.from("resumes").remove([path]).catch(() => {});
    return res.status(422).json({
      success: false,
      code: "UNREADABLE_RESUME",
      message:
        "We couldn't read text from that file. Please upload a text-based PDF or DOCX " +
        "(not a scan or an image), exported directly from your resume editor.",
    });
  }

  // Run the full resume pipeline server-side in ONE Claude call: structured
  // profile (for matching) + ATS analysis. Failures are non-fatal — the row is
  // still created so the user can retry analysis from the UI.
  const extracted_skills = detectSkills(extracted_text);
  let profile = null;
  let ai_analysis = null;
  if (extracted_text) {
    try {
      const result = await analyzeAndExtract(extracted_text);
      profile = result.profile;
      ai_analysis = result.analysis;
    } catch (e) {
      console.error("Resume processing failed", e.message);
    }
  }

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: req.user.id,
      file_name: file.originalname,
      file_path: path,
      extracted_text,
      extracted_skills: profile?.skills?.length ? profile.skills : extracted_skills,
      profile,
      ai_analysis,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("resumes").remove([path]);
    return res.status(500).json({ success: false, message: error.message });
  }

  // New resume → the user's cached matches are stale.
  invalidateMatches(req.user.id);

  return res.status(201).json({ success: true, resume: data });
});

// Re-run ATS analysis on an existing resume (counts against AI usage).
router.post("/:id/analyze", async (req, res) => {
  const { data: row, error: rErr } = await supabase
    .from("resumes")
    .select("extracted_text, ai_analysis")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();
  if (rErr || !row?.extracted_text) {
    return res.status(404).json({ success: false, message: "Resume text not found." });
  }

  try {
    if (!(await consumeAiUsage(req.user.id))) {
      return res.status(429).json({ success: false, message: "AI plan inactive or daily limit reached" });
    }
    const analysis = await analyzeResume(row.extracted_text);
    // Preserve the cached rewrite/improvement across re-analysis.
    if (row.ai_analysis?.rewrite) analysis.rewrite = row.ai_analysis.rewrite;
    if (row.ai_analysis?.improvement) analysis.improvement = row.ai_analysis.improvement;
    await supabase
      .from("resumes")
      .update({ ai_analysis: analysis })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    return res.json({ success: true, analysis });
  } catch (e) {
    console.error("analyze failed", e.message);
    return res.status(502).json({ success: false, message: "Analysis unavailable" });
  }
});

// Render the improvement JSON (already generated via /improve) into a .docx.
// Pure formatting — no AI usage consumed.
router.post("/improved/docx", async (req, res) => {
  const improvement = req.body?.improvement;
  if (!improvement || typeof improvement !== "object") {
    return res.status(400).json({ success: false, message: "Missing improvement payload." });
  }

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", req.user.id)
      .single();

    const buffer = await buildImprovedResumeDocx(improvement, prof?.full_name || "");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Improved-Resume.docx"');
    return res.send(buffer);
  } catch (e) {
    console.error("docx generation failed", e);
    return res.status(500).json({ success: false, message: "Could not generate the document." });
  }
});

// Full resume rewrite -> downloadable .docx. The rewrite is cached on the
// resume row (ai_analysis.rewrite) — the resume text never changes after
// upload, so only the FIRST download costs a Claude call / AI usage; repeats
// just re-render the .docx.
router.post("/:id/rewrite/docx", async (req, res) => {
  const { data: row, error: rErr } = await supabase
    .from("resumes")
    .select("extracted_text, ai_analysis")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();
  if (rErr || !row?.extracted_text) {
    return res.status(404).json({ success: false, message: "Resume text not found." });
  }

  try {
    let rewritten = row.ai_analysis?.rewrite;
    if (!rewritten || typeof rewritten !== "object" || !rewritten.experience) {
      if (!(await consumeAiUsage(req.user.id))) {
        return res.status(429).json({ success: false, message: "AI plan inactive or daily limit reached" });
      }
      rewritten = await rewriteResume(row.extracted_text);
      // Cache failure is non-fatal — the download still proceeds.
      const { error: cErr } = await supabase
        .from("resumes")
        .update({ ai_analysis: { ...(row.ai_analysis || {}), rewrite: rewritten } })
        .eq("id", req.params.id)
        .eq("user_id", req.user.id);
      if (cErr) console.error("rewrite cache write failed", cErr.message);
    }
    const buffer = await buildFullResumeDocx(rewritten);
    const safeName = String(rewritten?.name || "Resume").replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Resume";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeName} - Improved.docx"`);
    return res.send(buffer);
  } catch (e) {
    console.error("resume rewrite failed", e.message);
    return res.status(502).json({ success: false, message: "Could not generate the improved resume." });
  }
});

// Generate improvement suggestions. Cached on the resume row like the rewrite
// (ai_analysis.improvement) — only the first run per resume costs AI usage.
router.post("/:id/improve", async (req, res) => {
  const { data: row, error: rErr } = await supabase
    .from("resumes")
    .select("extracted_text, ai_analysis")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();
  if (rErr || !row?.extracted_text) {
    return res.status(404).json({ success: false, message: "Resume text not found." });
  }

  try {
    const cached = row.ai_analysis?.improvement;
    if (cached && typeof cached === "object") {
      return res.json({ success: true, improvement: cached, cached: true });
    }
    if (!(await consumeAiUsage(req.user.id))) {
      return res.status(429).json({ success: false, message: "AI plan inactive or daily limit reached" });
    }
    const improvement = await improveResume(row.extracted_text);
    const { error: cErr } = await supabase
      .from("resumes")
      .update({ ai_analysis: { ...(row.ai_analysis || {}), improvement } })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (cErr) console.error("improvement cache write failed", cErr.message);
    return res.json({ success: true, improvement });
  } catch (e) {
    console.error("improve failed", e.message);
    return res.status(502).json({ success: false, message: "Improvement unavailable" });
  }
});

// Persist AI-derived fields (skills/profile/analysis) after enrichment.
router.patch("/:id", async (req, res) => {
  const update = {};
  for (const key of ["extracted_skills", "profile", "ai_analysis"]) {
    if (key in req.body) update[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from("resumes")
    .update(update)
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, resume: data });
});

router.delete("/:id", async (req, res) => {
  const { data: row } = await supabase
    .from("resumes")
    .select("file_path")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (row?.file_path) await supabase.storage.from("resumes").remove([row.file_path]);

  // The cached matches feed was derived from this resume (or, if this was the
  // latest, from a resume that no longer exists) — drop it so the next load
  // re-derives from whatever resume is now current (M5).
  invalidateMatches(req.user.id);

  return res.json({ success: true });
});

export default router;
