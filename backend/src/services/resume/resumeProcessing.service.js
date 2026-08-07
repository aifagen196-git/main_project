// backend/src/services/resume/resumeProcessing.service.js
//
// All resume ALGORITHMS live here (server-side). The frontend only uploads a
// file and renders the JSON these functions produce.

import { extractSkills } from "../../knowledge/skills.js";
import { inferRoleFamilyFromResume, inferCandidateSeniority } from "../matching/scoreMatch.js";
import { completeJson, completeStructured } from "../ai/anthropic.service.js";
import {
  EXTRACTION_SYSTEM,
  buildResumeExtractionPrompt,
  ANALYSIS_SYSTEM,
  buildAnalysisPrompt,
  IMPROVE_SYSTEM,
  buildImprovePrompt,
  RESUME_FULL_SYSTEM,
  buildResumeFullPrompt,
  RESUME_FULL_SCHEMA,
  REWRITE_SYSTEM,
  buildRewritePrompt,
  REWRITE_SCHEMA,
} from "../../prompts/prompts.js";

const RESUME_DEFAULTS = {
  skills: [], years: 0, seniority: "mid", role_family: "other",
  country: "USA", target_locations: [], open_to_relocate: false,
  work_auth: null, education_level: "", certifications: [],
};

// The scorer looks these up by exact key — anything else is read as "unknown"
// and silently costs the candidate points. The LLM reliably drifts on casing
// and phrasing ("Master's", "M.S.", "Bachelor of Science"), so normalize here.
const ROLE_FAMILIES = new Set([
  "software-engineering", "frontend-engineering", "backend-engineering", "devops",
  "cloud-engineering", "network-engineering", "security-engineering", "offensive-security",
  "data-analytics", "data-engineering", "ai-ml", "business-analysis", "supply-chain",
  "product-management", "design", "qa-testing", "other",
]);
const SENIORITIES = new Set(["intern", "junior", "mid", "senior", "staff", "lead", "manager"]);

function normalizeEducation(value) {
  const v = String(value || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!v) return "";
  if (/\b(phd|ph d|doctorate|doctoral|dphil)\b/.test(v)) return "phd";
  if (/\b(master|masters|ms|msc|m s|mtech|m tech|mba|meng|ma)\b/.test(v)) return "masters";
  if (/\b(bachelor|bachelors|bs|bsc|b s|btech|b tech|be|ba|beng)\b/.test(v)) return "bachelors";
  if (/\b(associate|associates|aa|as)\b/.test(v)) return "associate";
  if (/\b(high school|highschool|diploma|secondary|ged)\b/.test(v)) return "highschool";
  return "";
}

function normalizeSeniority(value) {
  const v = String(value || "").toLowerCase().trim();
  return SENIORITIES.has(v) ? v : "mid";
}

function normalizeRoleFamily(value) {
  const v = String(value || "").toLowerCase().trim().replace(/\s+/g, "-");
  return ROLE_FAMILIES.has(v) ? v : "other";
}

function cleanSkills(list) {
  const seen = new Set();
  const out = [];
  for (const s of [].concat(list || [])) {
    const t = String(s || "").trim();
    if (t.length < 2) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function coerceProfile(raw, sourceText = "") {
  const obj = raw && typeof raw === "object" ? raw : {};
  const out = { ...RESUME_DEFAULTS };
  for (const k of Object.keys(RESUME_DEFAULTS)) {
    if (obj[k] === undefined || obj[k] === null) continue;
    out[k] = Array.isArray(RESUME_DEFAULTS[k]) ? [].concat(obj[k]).filter(Boolean) : obj[k];
  }
  out.years = Number(out.years) || 0;
  // Canonicalize the fields the scorer keys off of.
  out.education_level = normalizeEducation(out.education_level);
  out.seniority = normalizeSeniority(out.seniority);
  out.role_family = normalizeRoleFamily(out.role_family);
  out.skills = cleanSkills(out.skills);
  out.certifications = cleanSkills(out.certifications);
  out.target_locations = cleanSkills(out.target_locations);
  // Backup providers (Groq/Gemini) often return role_family "other" for a
  // clearly-titled resume, which cripples domain scoring and the strict role
  // gate. The headline/summary names the role — infer from the text.
  if ((!out.role_family || out.role_family === "other") && sourceText) {
    const inferred = inferRoleFamilyFromResume(sourceText.slice(0, 1500));
    if (inferred) out.role_family = inferred;
  }
  // Seniority: backup models default everyone to "mid" — recover from years +
  // the resume's title line.
  if ((!out.seniority || out.seniority === "mid") && sourceText) {
    out.seniority = inferCandidateSeniority(sourceText, out.years);
  }
  return out;
}

/** Regex skill detection (dictionary). Cheap, deterministic. */
export function detectSkills(text) {
  return extractSkills(text);
}

/**
 * Stage-0 structured profile used by the matcher.
 *
 * On failure we return the defaults BUT stamp `extraction_failed: true`, and
 * seed skills from the dictionary pass so the candidate isn't completely empty.
 * A silent all-defaults profile looks valid to the matcher and yields 0% scores
 * with nothing to explain why.
 */
export async function extractResumeProfile(text = "") {
  try {
    const res = await completeJson(buildResumeExtractionPrompt(text), EXTRACTION_SYSTEM, 1500);
    return coerceProfile(res, text);
  } catch (e) {
    console.error("Resume profile extraction failed:", e.message);
    return {
      ...RESUME_DEFAULTS,
      skills: extractSkills(text), // better than nothing
      extraction_failed: true,
    };
  }
}

/** ATS analysis (scores, strengths, weaknesses, skills). */
export async function analyzeResume(text = "") {
  return completeJson(buildAnalysisPrompt(text), ANALYSIS_SYSTEM, 3000);
}

/**
 * ONE call that returns both the structured profile and the ATS analysis.
 * Used on upload. Halves the input-token cost (the resume was previously sent
 * twice) and halves the number of requests against the rate limit.
 * Returns { profile, analysis } — analysis may be null if the model omitted it.
 */
export async function analyzeAndExtract(text = "") {
  const res = await completeStructured(
    buildResumeFullPrompt(text),
    RESUME_FULL_SYSTEM,
    RESUME_FULL_SCHEMA,
    4000,
  );
  return {
    profile: coerceProfile(res?.profile, text),
    analysis: res?.analysis ?? null,
  };
}

/** Improvement suggestions (summary, bullets, keywords, feedback). */
export async function improveResume(text = "") {
  return completeJson(buildImprovePrompt(text), IMPROVE_SYSTEM, 3000);
}

/**
 * Full resume rewrite: the COMPLETE resume restructured with improved wording,
 * every fact preserved. Schema-enforced so the docx renderer always gets a
 * well-formed document.
 */
export async function rewriteResume(text = "") {
  return completeStructured(
    buildRewritePrompt(text),
    REWRITE_SYSTEM,
    REWRITE_SCHEMA,
    8000,
  );
}
