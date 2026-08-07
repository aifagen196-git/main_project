// collectors/processors/extractProfile.js
//
// Node-side structured job extraction for the collector. It reuses the SAME
// prompt + skill dictionary as the backend (single source of truth) and calls
// the Anthropic Claude API. If ANTHROPIC_API_KEY is not set, it falls back to a
// regex/dictionary heuristic so the collector keeps working.

import Anthropic from "@anthropic-ai/sdk";
import { extractSkills } from "./extractSkills.js";
import extractExperience from "./experienceExtractor.js";
import extractRoleFamily from "./roleFamilyExtractor.js";
import extractEducation from "./educationExtractor.js";
import extractWorkMode from "./workModeExtractor.js";
import extractWorkAuth from "./workAuthExtractor.js";
import extractSalary from "./salaryParser.js";
import {
  EXTRACTION_SYSTEM,
  buildJobExtractionPrompt,
} from "../../backend/src/prompts/prompts.js";

const JOB_DEFAULTS = {
  skills_required: [],
  skills_preferred: [],
  min_years: 0,
  seniority: "mid",
  role_family: "other",
  country: null,
  is_remote_us: false,
  location: "",
  work_auth_required: null,
  education_min: "",
  work_mode: "",
  salary_range: null,
};

// Regex/dictionary fallback when no LLM key is configured. role_family and
// experience are derived PER-CALL from the actual text — extractRoleFamily
// cannot live in the static JOB_DEFAULTS above (there is no `text` there; doing
// so threw "text is not defined" at module load and crashed every collector).
function heuristicProfile(text = "") {
  const t = String(text);
  const skills = extractSkills(t);
  const isUS = /\b(USA|United States|U\.S\.|remote, us|remote \(us\))\b/i.test(
    t,
  );

  return {
    ...JOB_DEFAULTS,
    skills_required: skills,
    min_years: extractExperience(t),
    role_family: extractRoleFamily(t) || "other",
    country: isUS ? "United States" : null,
    is_remote_us: /\bremote\b/i.test(t) && isUS,
    education_min: extractEducation(t),
    work_mode: extractWorkMode(t),
    work_auth_required: extractWorkAuth(t),
    salary_range: extractSalary(t),
  };
}
function coerce(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const out = { ...JOB_DEFAULTS };
  for (const k of Object.keys(JOB_DEFAULTS)) {
    if (obj[k] === undefined || obj[k] === null) continue;
    out[k] = Array.isArray(JOB_DEFAULTS[k])
      ? [].concat(obj[k]).filter(Boolean)
      : obj[k];
  }
  out.min_years = Number(out.min_years) || 0;
  return out;
}

// opts.strict: throw on LLM failure instead of silently falling back to the
// heuristic — used by the backfill so failed jobs stay unmarked and retryable.
export async function extractJobProfile(text = "", opts = {}) {
  // Read env inside the function — imports are hoisted above dotenv.config().
  //
  // COLLECT-TIME AI IS OPT-IN. By default the collectors fetch + store with
  // the free regex/dictionary heuristic (no Claude call per job). The matcher
  // compensates at match time: role_family comes from title inference and the
  // strict role gate works off titles. Set COLLECTOR_LLM=on to enable Claude
  // extraction during collection; the backfill (processExistingJobs.js) always
  // uses Claude via opts.strict.

  const llmEnabled =
    opts.strict || String(process.env.COLLECTOR_LLM).toLowerCase() === "on";
  if (!llmEnabled) return heuristicProfile(text);
  if (!process.env.ANTHROPIC_API_KEY) {
    if (opts.strict) throw new Error("ANTHROPIC_API_KEY not set");
    return heuristicProfile(text);
  }

  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1200,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: buildJobExtractionPrompt(text) }],
    });
    let content = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    content = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return coerce(JSON.parse(content));
  } catch (e) {
    if (opts.strict) throw e;
    console.error("LLM job extraction failed, using fallback:", e.message);
    return heuristicProfile(text);
  }
}
