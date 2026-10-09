import express from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";
import { dbError } from "../utils/dbError.js";
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
import { consumeAiUsage, withAiContext } from "../services/ai/usage.js";
import { invalidateMatches } from "../services/jobs/matching.service.js";
import {
  accountName,
  areaLabel,
  areaForFamily,
  areaMatches,
  nameMatches,
} from "../services/resume/resumeOwnership.js";

const SUPPORT_EMAIL = "info@aifagenlabs.com";

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

  if (error) return dbError(res, error);
  return res.json({ success: true, resumes: data || [] });
});

router.get("/latest", async (req, res) => {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", req.user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) return dbError(res, error);
  return res.json({ success: true, resume: data?.[0] ?? null });
});

router.post("/", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: "No file uploaded." });

  const ext = file.originalname.split(".").pop()?.toLowerCase();
  // Extension and mimetype are client-controlled; confirm the real header.
  const head = file.buffer.subarray(0, 4).toString("latin1");
  const realType =
    ext === "pdf" && head === "%PDF"
      ? "application/pdf"
      : ext === "docx" && head === "PK\x03\x04"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : null;
  if (!ALLOWED.has(ext) || !realType) {
    return res.status(400).json({ success: false, message: "Please upload a PDF or DOCX resume." });
  }

  const path = `${req.user.id}/${Date.now()}-${safeName(file.originalname)}`;

  const { error: upErr } = await supabase.storage
    .from("resumes")
    .upload(path, file.buffer, { contentType: realType });
  if (upErr) {
    console.error("Resume upload failed", upErr);
    return res.status(500).json({ success: false, message: "Could not upload your resume. Please try again." });
  }

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

  // Ownership checks (services/resume/resumeOwnership.js): the resume must be
  // in the account's area of interest and carry the account holder's name.
  // Both need the AI read above, so if that failed we can't let it through.
  const reject = async (status, code, message) => {
    await supabase.storage.from("resumes").remove([path]).catch(() => {});
    return res.status(status).json({ success: false, code, message });
  };
  if (!profile) {
    return reject(
      503,
      "RESUME_CHECK_UNAVAILABLE",
      "We couldn't check your resume right now. Please try again in a few minutes.",
    );
  }

  const { data: account, error: accErr } = await supabase
    .from("profiles")
    .select("first_name, last_name, full_name, area_of_interest")
    .eq("id", req.user.id)
    .single();
  if (accErr) {
    console.error("Account lookup for resume checks failed", accErr);
    return reject(500, "RESUME_CHECK_FAILED", "Could not upload your resume. Please try again.");
  }

  // Older accounts predate these fields: the first resume fills them in, and
  // from then on they're locked like everyone else's (only an admin can
  // change them).
  const backfill = {};
  const { first } = accountName(account);
  if (!first.length) {
    if (!profile.candidate_name) {
      return reject(
        422,
        "NAME_MISSING",
        `We couldn't find your name on this resume. Please upload a resume with your name at the top, or contact ${SUPPORT_EMAIL}.`,
      );
    }
    const parts = profile.candidate_name.split(/\s+/);
    backfill.first_name = parts[0].slice(0, 60);
    backfill.last_name = parts.slice(1).join(" ").slice(0, 60) || null;
    backfill.full_name = profile.candidate_name.slice(0, 100);
  } else if (!nameMatches(account, profile.candidate_name, extracted_text)) {
    return reject(
      422,
      "NAME_MISMATCH",
      "The name on this resume doesn't match your account. You can only upload your own resume. " +
        `If your name is wrong on your account, contact ${SUPPORT_EMAIL}.`,
    );
  }

  if (!account.area_of_interest) {
    // Fields with no clear area are left unset for an admin to choose.
    const area = areaForFamily(profile.role_family);
    if (area) backfill.area_of_interest = area;
  } else if (!areaMatches(account.area_of_interest, profile.role_family, extracted_text)) {
    const area = areaLabel(account.area_of_interest);
    return reject(
      422,
      "AREA_MISMATCH",
      `Your account is set up for ${area}, but this doesn't look like ${/^(?:[AEIOU]|SAP)/.test(area) ? "an" : "a"} ${area} resume. ` +
        `Please upload your ${area} resume. If your area of interest is wrong, contact ${SUPPORT_EMAIL}.`,
    );
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
    return dbError(res, error);
  }

  if (Object.keys(backfill).length) {
    const { error: bfErr } = await supabase.from("profiles").update(backfill).eq("id", req.user.id);
    if (bfErr) console.error("Profile backfill from resume failed", bfErr);
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
    // Context spans consume + the AI call so the provider that answers
    // can attribute the usage row it created.
    return await withAiContext({ userId: req.user.id, feature: "resume_analyze" }, async () => {
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
    });
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
    // Context spans consume + the AI call so the provider that answers
    // can attribute the usage row it created.
    return await withAiContext({ userId: req.user.id, feature: "resume_rewrite" }, async () => {
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
    });
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
    // Context spans consume + the AI call so the provider that answers
    // can attribute the usage row it created.
    return await withAiContext({ userId: req.user.id, feature: "resume_improve" }, async () => {
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
    });
  } catch (e) {
    console.error("improve failed", e.message);
    return res.status(502).json({ success: false, message: "Improvement unavailable" });
  }
});

// There is deliberately no PATCH route. A resume's profile, skills and
// analysis are written only by the server from the uploaded file — letting a
// user rewrite them would bypass the upload checks (area of interest, name)
// and feed job matching whatever they typed.

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

  if (error) return dbError(res, error);
  if (row?.file_path) await supabase.storage.from("resumes").remove([row.file_path]);

  // The cached matches feed was derived from this resume (or, if this was the
  // latest, from a resume that no longer exists) — drop it so the next load
  // re-derives from whatever resume is now current (M5).
  invalidateMatches(req.user.id);

  return res.json({ success: true });
});

export default router;
