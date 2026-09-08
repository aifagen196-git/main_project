// collectors/processors/extractProfile.js
//
// Node-side structured job extraction for the collector. It reuses the SAME
// prompt + skill dictionary as the backend (single source of truth) and calls
// the Anthropic Claude API. If ANTHROPIC_API_KEY is not set, it falls back to a
// regex/dictionary heuristic so the collector keeps working.

import Anthropic from "@anthropic-ai/sdk";
import { extractSkills } from "./extractSkills.js";
import extractExperience from "../../processors/experienceExtractor.js";
import extractEducation from "../../processors/educationExtractor.js";
import extractWorkMode from "../../processors/workModeExtractor.js";
import extractSalary from "../../processors/salaryParser.js";
import {
  EXTRACTION_SYSTEM,
  buildJobExtractionPrompt,
} from "../../../backend/src/prompts/prompts.js";
import { inferRoleFamily } from "../../../backend/src/services/matching/scoreMatch.js";

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

// Security clearance / US-citizenship requirement phrasing commonly seen in
// government/defense-contractor postings. Populating this lets the matcher's
// softCap (scoreMatch.js) rank these to the bottom for candidates whose
// work_auth doesn't show citizenship/clearance eligibility — most of this
// product's users are visa/sponsorship candidates who can't take these
// roles. Previously this field only got set by the paid LLM path (opt-in,
// currently disabled), so it stayed null for ~all collector-inserted rows
// and the clearance check never fired in practice.
const CLEARANCE_RE =
  /\b(security clearance|secret clearance|top secret|ts\/sci|active clearance|dod clearance|public trust clearance|clearance required|must (?:currently )?(?:hold|have) an? (?:active )?clearance)\b/i;
const CITIZEN_RE =
  /\b(u\.?s\.?\s*citizen(?:ship)?\s*(?:is\s*)?required|must be an? u\.?s\.?\s*citizen|u\.?s\.?\s*citizens? only|citizenship required)\b/i;

function detectWorkAuthRequired(text) {
  const flags = [];
  if (CLEARANCE_RE.test(text)) flags.push("clearance");
  if (CITIZEN_RE.test(text)) flags.push("citizen");
  return flags.length ? flags.join(", ") : null;
}

// Regex/dictionary fallback when no LLM key is configured.
//
// role_family used to just sit at the JOB_DEFAULTS default ("other") here —
// the matcher compensated by re-inferring it from the title live at match
// time (scoreMatch.js:jobFamily), but the stored column stayed wrong for
// ~97% of collector-inserted rows. We now run that same title regex here
// so the persisted value matches what the matcher actually uses.
function heuristicProfile(text = "", title = "") {
  const t = String(text);
  const skills = extractSkills(t);
  const isUS = /\b(USA|United States|U\.S\.|remote, us|remote \(us\))\b/i.test(
    t,
  );
  return {
    ...JOB_DEFAULTS,
    skills_required: skills,
    min_years: extractExperience(t),
    role_family: inferRoleFamily(title) || "other",
    country: isUS ? "USA" : null,
    is_remote_us: /\bremote\b/i.test(t) && isUS,
    education_min: extractEducation(t),
    work_mode: extractWorkMode(t),
    salary_range: extractSalary(t),
    work_auth_required: detectWorkAuthRequired(`${title} ${t}`),
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
  if (!llmEnabled) return heuristicProfile(text, opts.title);
  if (!process.env.ANTHROPIC_API_KEY) {
    if (opts.strict) throw new Error("ANTHROPIC_API_KEY not set");
    return heuristicProfile(text, opts.title);
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
    const coerced = coerce(JSON.parse(content));
    if (coerced.role_family === "other" && opts.title) {
      coerced.role_family = inferRoleFamily(opts.title) || "other";
    }
    if (!coerced.work_auth_required) {
      coerced.work_auth_required = detectWorkAuthRequired(`${opts.title || ""} ${text}`);
    }
    return coerced;
  } catch (e) {
    if (opts.strict) throw e;
    console.error("LLM job extraction failed, using fallback:", e.message);
    return heuristicProfile(text, opts.title);
  }
}
