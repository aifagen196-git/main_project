// backend/src/services/resume/atsScore.js
//
// Deterministic ATS breakdown (Resume-Matcher pattern): a transparent,
// repeatable backbone for the ATS number, so two runs on the same resume give
// the same score and every point is explainable to the candidate. The LLM
// analysis (buildAnalysisPrompt) still supplies qualitative feedback; this
// module supplies the arithmetic.
//
//   overall = 0.55 * keyword_match + 0.25 * skills_coverage + 0.20 * sections

import { extractSkills, normalizeSkills } from "../../knowledge/skills.js";

const WEIGHTS = {
  keyword_match: 0.55,
  skills_coverage: 0.25,
  section_completeness: 0.2,
};

const SECTION_PATTERNS = {
  summary: /\b(summary|objective|profile|about)\b/i,
  experience: /\b(experience|work history|employment|professional experience)\b/i,
  education: /\b(education|academic|degree|university|college)\b/i,
  skills: /\b(skills|technologies|competencies|technical skills|tools)\b/i,
  contact: /(@|\bphone\b|\blinkedin\b|\+\d{1,3}[\s-]?\d)/i,
};

function wholeWord(keyword, textLower) {
  const esc = String(keyword).trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!esc) return false;
  return new RegExp(`\\b${esc}\\b`, "i").test(textLower);
}

/** 0-100: what fraction of the JD's keywords appear (whole-word) in the resume. */
function keywordMatchScore(resumeTextLower, jdKeywords) {
  const kws = normalizeSkills(jdKeywords || []);
  if (!kws.length) return 70; // no JD provided → neutral, not perfect
  const hit = kws.filter((k) => wholeWord(k, resumeTextLower)).length;
  return Math.round((hit / kws.length) * 100);
}

/** 0-100: overlap between resume skills and JD required skills. */
function skillsCoverageScore(resumeSkills, jdSkills) {
  const have = new Set(normalizeSkills(resumeSkills || []));
  const need = normalizeSkills(jdSkills || []);
  if (!need.length) return 70;
  const hit = need.filter((s) => have.has(s)).length;
  return Math.round((hit / need.length) * 100);
}

/** 0-100: presence of the essential resume sections. */
function sectionCompletenessScore(resumeText) {
  const keys = Object.keys(SECTION_PATTERNS);
  const present = keys.filter((k) => SECTION_PATTERNS[k].test(resumeText)).length;
  return Math.round((present / keys.length) * 100);
}

/**
 * @param resumeText  full resume text
 * @param opts.jdKeywords  keywords from the target JD (optional)
 * @param opts.jdSkills    required skills from the target JD (optional)
 * Returns { overall_score, sub_scores, missing_keywords, missing_sections, tips }
 */
export function computeAtsScore(resumeText = "", opts = {}) {
  const textLower = String(resumeText).toLowerCase();
  const resumeSkills = extractSkills(resumeText);

  const kw = keywordMatchScore(textLower, opts.jdKeywords);
  const sk = skillsCoverageScore(resumeSkills, opts.jdSkills || opts.jdKeywords);
  const sec = sectionCompletenessScore(resumeText);

  const overall = Math.round(
    kw * WEIGHTS.keyword_match + sk * WEIGHTS.skills_coverage + sec * WEIGHTS.section_completeness,
  );

  const missing_keywords = normalizeSkills(opts.jdKeywords || []).filter(
    (k) => !wholeWord(k, textLower),
  );
  const missing_sections = Object.keys(SECTION_PATTERNS).filter(
    (k) => !SECTION_PATTERNS[k].test(resumeText),
  );

  const tips = [];
  if (kw < 60 && missing_keywords.length)
    tips.push(`Add missing keywords naturally into experience bullets: ${missing_keywords.slice(0, 6).join(", ")}.`);
  if (sk < 60) tips.push("List the job's required skills explicitly in a Skills section (only ones you genuinely have).");
  if (sec < 75 && missing_sections.length)
    tips.push(`Add standard sections ATS parsers expect: ${missing_sections.join(", ")}.`);
  if (kw >= 80 && sk >= 80) tips.push("Strong keyword alignment — focus polish on quantified achievements.");

  return {
    overall_score: overall,
    sub_scores: { keyword_match: kw, skills_coverage: sk, section_completeness: sec },
    weights: WEIGHTS,
    missing_keywords: missing_keywords.slice(0, 15),
    missing_sections,
    tips,
  };
}
