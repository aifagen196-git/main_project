// backend/src/services/jobs/matching.service.js
//
// The full matching funnel, server-side and authoritative:
//   1. Load the candidate's structured profile (from the latest resume).
//   2. Fetch active, non-expired jobs.
//   3. GATE + weighted-score every job cheaply (no LLM).
//   4. Send the top-N survivors to the Claude judge for calibrated scoring.
//   5. Blend and return the exact shape the UI renders.

import { supabase } from "../../config/supabase.js";
import { scoreMatch, gateJob, computeDescSkillScores, inferRoleFamilyFromResume, inferCandidateSeniority } from "../matching/scoreMatch.js";
import { completeJson } from "../ai/anthropic.service.js";
import { JUDGE_SYSTEM, buildJudgePrompt } from "../../prompts/prompts.js";
import {
  embeddingsEnabled,
  embedTexts,
  resumeEmbeddingText,
  jobEmbeddingText,
  cosine,
  cosineToComponent,
} from "../matching/embeddings.service.js";
import { applyFeedbackRerank } from "../matching/feedbackRanker.js";

// Cost/rate-limit tuning. The judge is the dominant recurring AI cost
// (~$0.0019/call), so we judge fewer finalists and cache the result longer.
const JUDGE_TOP_N = Number(process.env.MATCH_JUDGE_TOP_N || 8);
// The judge is a bounded scoring task — Haiku is fast, cheap, and has much
// higher rate limits than Opus, which matters because we judge many jobs.
const JUDGE_MODEL =
  process.env.ANTHROPIC_JUDGE_MODEL || "claude-haiku-4-5-20251001";
// Cap concurrent Claude calls so we stay under the org's requests-per-minute
// limit (the SDK also retries 429s once).
const JUDGE_CONCURRENCY = Number(process.env.MATCH_JUDGE_CONCURRENCY || 4);
const CACHE_MS = Number(process.env.MATCH_CACHE_MINUTES || 30) * 60 * 1000;
// How recently a collector must have SEEN a posting for it to count as live,
// independent of the expires_at stamp. See fetchAllLiveJobs().
const FRESH_DAYS = Number(process.env.MATCH_FRESH_DAYS || 30);

// Run async tasks with a bounded worker pool.
async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx], idx);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

// Small in-process cache keyed by user (avoids re-running the funnel + judge on
// every page visit). Fine for a single backend instance; swap for a table if
// you scale horizontally.
const cache = new Map(); // userId -> { jobs, expiresAt }

// The candidate profile is derived ONLY from the latest resume. Settings →
// Job Preferences are stored but deliberately do NOT feed the matcher: an
// earlier attempt to merge them (target_role overriding the resume's
// role_family, preferred_location forcing open_to_relocate=false) changed
// ranking behaviour, and match accuracy takes priority over that feature.
// Re-wire it only with a test that relevant jobs still outrank irrelevant ones.
async function getCandidateProfile(userId) {
  const { data } = await supabase
    .from("resumes")
    .select("id, profile, extracted_skills, extracted_text, embedding")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const profile =
    data?.profile && typeof data.profile === "object"
      ? { ...data.profile }
      : {
          skills: data?.extracted_skills || [],
          years: 0,
          role_family: "other",
          country: "USA",
          open_to_relocate: true,
          target_locations: [],
          work_auth: null,
          education_level: "",
          seniority: "mid",
          certifications: [],
        };

  // Backstop for extraction misses: the backup AI providers (Groq/Gemini)
  // sometimes return role_family "other" for a clearly-titled resume, which
  // both disables the strict role gate AND (before the domainScore fix) made
  // every unclassifiable job look on-domain. The resume headline/summary
  // almost always names the role — infer from the text when the model failed.
  if (!profile.role_family || profile.role_family === "other") {
    const head = (data?.extracted_text || "").slice(0, 1500);
    const inferred = inferRoleFamilyFromResume(head);
    if (inferred) profile.role_family = inferred;
  }

  // Same backstop for years: a 0 from the extractor false-gates the candidate
  // on every job that states a minimum. The resume almost always says
  // "X+ years" up top — recover it when the model returned nothing.
  if (!profile.years) {
    const yrs = inferYearsFromResume(data?.extracted_text || "");
    if (yrs) profile.years = yrs;
  }

  // Seniority backstop: the backup models return "mid" for everyone. Recover
  // the real level from years + the resume's title line so the seniority gate
  // and ranking work (a 5-year Senior BA shouldn't read as mid-level).
  if (!profile.seniority || profile.seniority === "mid") {
    profile.seniority = inferCandidateSeniority(data?.extracted_text || "", profile.years);
  }

  // Carried for the semantic stage (non-enumerable-ish, stripped before UI).
  profile.__resume_id = data?.id || null;
  profile.__resume_text = data?.extracted_text || "";
  profile.__embedding = Array.isArray(data?.embedding) ? data.embedding : null;

  return profile;
}

// ---- Stage 2b: semantic component (pgvector, fails soft) --------------------
//
// Sets job.__semantic (0..1) on gated survivors when embeddings are enabled.
// Uses stored vectors where present; embeds + persists a bounded number of
// missing ones per run so the pool warms up incrementally without a big-bang
// backfill. Any failure leaves __semantic unset and the scorer runs without it.
const EMBED_BACKFILL_PER_RUN = Number(process.env.MATCH_EMBED_BACKFILL || 80);

async function attachSemanticScores(candidate, survivors) {
  if (!embeddingsEnabled() || !survivors.length) return;

  try {
    // Candidate vector: stored, or embed once and persist on the resume row.
    let cVec = candidate.__embedding;
    if (!cVec) {
      const [vec] = await embedTexts([
        resumeEmbeddingText(candidate, candidate.__resume_text),
      ]);
      if (!vec) return;
      cVec = vec;
      if (candidate.__resume_id) {
        supabase
          .from("resumes")
          .update({ embedding: vec })
          .eq("id", candidate.__resume_id)
          .then(() => {}, (e) => console.error("Resume embedding persist failed:", e.message));
      }
    }

    // Job vectors: prefer stored; backfill a bounded batch of missing ones.
    const missing = survivors
      .filter((s) => !Array.isArray(s.row.embedding))
      .slice(0, EMBED_BACKFILL_PER_RUN);
    if (missing.length) {
      const vecs = await embedTexts(missing.map((s) => jobEmbeddingText(s.job)));
      missing.forEach((s, i) => {
        if (!vecs[i]) return;
        s.row.embedding = vecs[i];
        supabase
          .from("jobs")
          .update({ embedding: vecs[i] })
          .eq("id", s.row.id)
          .then(() => {}, (e) => console.error("Job embedding persist failed:", e.message));
      });
    }

    for (const s of survivors) {
      const jVec = s.row.embedding;
      if (Array.isArray(jVec)) {
        s.job.__semantic = cosineToComponent(cosine(cVec, jVec));
      }
    }
  } catch (e) {
    console.error("Semantic stage failed (continuing without it):", e.message);
  }
}

// Pull "N+ years" of experience from the resume summary. Takes the LARGEST of
// the first few mentions (a summary line "6+ years" beats a project's "2 years
// of React"), capped so a stray "20 years of combined team experience" doesn't
// dominate.
export function inferYearsFromResume(text = "") {
  const head = text.slice(0, 1200);
  const matches = [...head.matchAll(/(\d{1,2})\s*\+?\s*years?/gi)].map((m) => Number(m[1]));
  if (!matches.length) return 0;
  return Math.min(Math.max(...matches), 30);
}

function jobView(job) {
  const p = job.profile && typeof job.profile === "object" ? job.profile : {};
  return {
    ...job,
    skills_required:
      p.skills_required ?? job.skills_required ?? job.skills ?? [],
    skills_preferred: p.skills_preferred ?? job.skills_preferred ?? [],
    min_years: p.min_years ?? job.min_years ?? 0,
    role_family: p.role_family ?? job.role_family ?? "other",
    country: p.country ?? job.country ?? null,
    is_remote_us: p.is_remote_us ?? job.is_remote_us ?? false,
    work_auth_required: p.work_auth_required ?? job.work_auth_required ?? null,
    education_min: p.education_min ?? job.education_min ?? "",
    seniority: p.seniority ?? job.seniority ?? "mid",
  };
}

async function judge(candidate, job, baseline) {
  try {
    const res = await completeJson(
      buildJudgePrompt(candidate, job, baseline),
      JUDGE_SYSTEM,
      700,
      JUDGE_MODEL,
    );
    if (res && typeof res === "object" && typeof res.score === "number")
      return res;
  } catch (e) {
    console.error("Judge failed for", job.title, e.status || "", e.message);
  }
  return null;
}

// Every column the gate + scorer + UI + semantic stage needs EXCEPT
// `description`. Descriptions average ~9KB, so pulling them for the whole pool
// would move tens of MB per match run; they're fetched separately for the
// handful of gate survivors.
//
// NOTE: seniority / work_auth_required / education_min are NOT table columns —
// they live inside the `profile` jsonb and are unpacked by jobView(). Listing
// them here makes PostgREST reject the whole query (silently yielding an empty
// feed), so keep this list in sync with the real schema.
//
// `embedding` is fetched ONLY when the semantic stage is switched on. It is a
// 1536-float vector per row; dragging it across ~29k rows on every cold load
// costs seconds for nothing while embeddings are disabled.
const JOB_COLS_BASE =
  "id, title, company, location, remote, salary, employment_type, skills, skills_required, skills_preferred, role_family, min_years, country, state, is_remote_us, apply_url, posted_date, created_at, match_score, source, profile";
const jobCols = () =>
  embeddingsEnabled() ? `${JOB_COLS_BASE}, embedding` : JOB_COLS_BASE;

/**
 * Fetch ALL live jobs, paginated.
 *
 * PostgREST caps an unbounded select at 1000 rows. The pool is several
 * thousand, so the un-paginated query silently scored only the first ~1000
 * jobs — every feed was drawn from a fraction of the database. Page through
 * explicitly with .range() so the matcher sees the whole pool.
 */
// The live job pool is IDENTICAL for every user, but each match run was
// re-fetching all ~12k rows (~8s). Cache it process-wide for a few minutes so
// only the first run after expiry pays the fetch. Per-user match results have
// their own longer cache; this one just stops repeated full-table transfers.
let poolCache = { jobs: null, expiresAt: 0 };
const POOL_TTL_MS = Number(process.env.MATCH_POOL_TTL_MINUTES || 10) * 60 * 1000;

/** Drop the shared pool cache (call after a collector run imports new jobs). */
export function invalidateJobPool() {
  poolCache = { jobs: null, expiresAt: 0 };
}

async function fetchAllLiveJobs() {
  if (poolCache.jobs && poolCache.expiresAt > Date.now()) return poolCache.jobs;
  const now = new Date().toISOString();
  // A job counts as live when a collector CONFIRMED it recently, even if an
  // old expires_at stamp has lapsed. expires_at is written once at insert
  // (originally +7d), so any job not re-scraped since silently disappeared
  // from matching — 9,545 of 12,247 active jobs were hidden this way while
  // still being open. last_seen is the truth: it updates every time a
  // collector sees the posting.
  const freshCutoff = new Date(
    Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // NOTE: filtering by role_family in SQL was tried and removed — it saved
  // nothing, because ~97% of rows are stored as "other" (collector-side LLM
  // extraction is off, so the heuristic can't classify them and the real family
  // is inferred from the title at runtime).
  const PAGE = 1000;
  const LIVE_FILTER = `expires_at.is.null,expires_at.gt.${now},last_seen.gt.${freshCutoff}`;
  // A fresh query builder per page (builders are single-use).
  const pageQuery = () =>
    supabase
      .from("jobs")
      .select(jobCols())
      .eq("is_active", true)
      .or(LIVE_FILTER);

  // How many rows are we about to page through?
  const { count, error: countErr } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${now},last_seen.gt.${freshCutoff}`);
  if (countErr) throw countErr;

  // Fetch the pages CONCURRENTLY. Sequential paging cost ~0.6s per 1000 rows;
  // at ~29k live jobs that was ~17s of pure waiting on every cold load. The
  // page ranges are independent, so a bounded worker pool collapses it.
  const pages = Math.ceil((count || 0) / PAGE);
  const results = new Array(pages);
  const CONCURRENCY = 6;
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pages) }, async () => {
      while (next < pages) {
        const p = next++;
        const { data, error } = await pageQuery().range(p * PAGE, p * PAGE + PAGE - 1);
        if (error) throw error;
        results[p] = data || [];
      }
    }),
  );

  const out = results.flat();
  poolCache = { jobs: out, expiresAt: Date.now() + POOL_TTL_MS };
  return out;
}

/** Attach descriptions to the (few) gate survivors, for IDF skill scanning. */
async function attachDescriptions(survivors) {
  const ids = survivors.map((s) => s.row.id);
  if (!ids.length) return;
  const PAGE = 300;
  const byId = new Map();
  for (let i = 0; i < ids.length; i += PAGE) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, description")
      .in("id", ids.slice(i, i + PAGE));
    if (error) throw error;
    for (const r of data || []) byId.set(r.id, r.description);
  }
  for (const s of survivors) {
    const d = byId.get(s.row.id) || "";
    s.row.description = d;
    s.job.description = d;
  }
}

// Fast, no-LLM pass: gate + weighted score + sort. Returns the internal scored
// list (with _job attached) so the background judge can enrich it.
async function computeScored(userId) {
  const candidate = await getCandidateProfile(userId);

  const jobs = await fetchAllLiveJobs();

  // Gate first (cheap — no text scanning), then IDF-score the survivors'
  // descriptions against the candidate's skills, then run the weighted scorer.
  const survivors = (jobs || [])
    .map((row) => ({ row, job: jobView(row) }))
    .filter(({ job }) => !gateJob(candidate, job));

  await attachDescriptions(survivors);

  computeDescSkillScores(candidate, survivors.map((s) => s.job));
  await attachSemanticScores(candidate, survivors);

  const scored = survivors
    .map(({ row, job }) => {
      const m = scoreMatch(candidate, job);
      return { ...row, _job: job, ...m };
    })
    .sort((a, b) => b.score - a.score);

  return { candidate, scored };
}

function toUiJobs(scored) {
  return scored
    .map(({ _job, gated, gateReason, score, label, capReason, match_score: _stale, description: _desc, embedding: _emb, ...rest }) => ({
      ...rest,
      // ALWAYS use the computed heuristic score here. The jobs table has a
      // stored match_score column (0 from the collector) which would otherwise
      // shadow the real score via `rest.match_score ?? score`. The full
      // description is dropped too — it's ~9KB/job and the UI never renders
      // it — as is the raw embedding vector (~12KB/job).
      match_score: score,
      match_breakdown: rest.breakdown,
      // Soft-cap transparency: "capped: needs 8y, you have 4y" on the card.
      cap_reason: capReason || null,
    }))
    .sort((a, b) => b.match_score - a.match_score);
}

// Runs after the response is sent: judges the shortlist, then builds a FRESH
// jobs array and swaps it into the cache atomically. It must never mutate the
// objects already handed to in-flight responses — doing so serves callers a
// half-updated, mis-ordered snapshot (the "0% in the middle of the list" bug).
async function judgeInBackground(userId, candidate, scored, entry) {
  const finalists = scored.slice(0, JUDGE_TOP_N);
  const verdicts = new Map(); // job id -> verdict

  await mapPool(finalists, JUDGE_CONCURRENCY, async (j) => {
    // Heuristic baseline goes into the prompt as a calibration anchor
    // (JustHireMe pattern) — the judge must justify deviating >20 points.
    const verdict = await judge(candidate, j._job, {
      score: j.score,
      breakdown: j.breakdown,
    });
    if (verdict) verdicts.set(j.id, { verdict, heuristic: j.score });
  });

  let enriched = entry.jobs.map((ui) => {
    const hit = verdicts.get(ui.id);
    if (!hit) return ui;
    const { verdict, heuristic } = hit;
    return {
      ...ui,
      match_score: Math.round(0.7 * verdict.score + 0.3 * heuristic),
      match_reasons: verdict.matched || [],
      gaps: verdict.gaps || [],
      // Deal-breaker subset of gaps, surfaced separately for a 🚩 treatment.
      red_flags: verdict.red_flags || [],
      match_verdict: verdict.verdict || "",
      match_reasoning: verdict.reasoning || "",
    };
  });

  enriched = enriched.sort((a, b) => b.match_score - a.match_score);
  entry.jobs = await applyFeedbackRerank(userId, enriched);
  entry.judged = true;
}

export async function getMatchedJobs(userId) {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.jobs;

  // Return heuristic matches immediately (fast, never times out)…
  const { candidate, scored } = await computeScored(userId);
  const uiJobs = await applyFeedbackRerank(userId, toUiJobs(scored));
  const entry = { jobs: uiJobs, judged: false, expiresAt: Date.now() + CACHE_MS };
  cache.set(userId, entry);

  // …and enrich with the LLM judge in the background (updates the cache).
  judgeInBackground(userId, candidate, scored, entry).catch((e) =>
    console.error("Background judge failed:", e.message),
  );

  return entry.jobs;
}

/**
 * Keyword search over the WHOLE active jobs database, scored against the user's
 * profile. Unlike the personalized matches feed, search does NOT apply the hard
 * gates — a job that the feed filters out (e.g. non-US) must still be findable
 * when the user explicitly searches for it. Such jobs are returned with an
 * `outside_criteria` flag + `gate_reason` so the UI can label them.
 *
 * Searches title, company AND description, so nothing is missed. Fast (no LLM
 * judge) so it can back a live search box.
 */
export async function searchJobs(userId, q, limit = 100) {
  const term = String(q || "").trim();
  if (term.length < 2) return [];

  // Sanitize for the PostgREST `or(...ilike...)` filter — commas/parens/*
  // and % would break or widen the pattern.
  const safe = term.replace(/[%,()*]/g, " ").replace(/\s+/g, " ").trim();
  if (!safe) return [];

  const candidate = await getCandidateProfile(userId);

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_active", true)
    .or(`title.ilike.%${safe}%,company.ilike.%${safe}%,description.ilike.%${safe}%`)
    .limit(600);
  if (error) throw error;

  const all = (jobs || []).map((row) => ({ row, job: jobView(row) }));
  computeDescSkillScores(candidate, all.map((s) => s.job));

  const ranked = all.map(({ row, job }) => {
    // ignoreGate: score every job; flag (don't drop) the ones outside criteria.
    const m = scoreMatch(candidate, job, undefined, { ignoreGate: true });
    return { ...row, _job: job, ...m };
  });

  // Reserve slots for out-of-criteria jobs so a flood of in-criteria matches
  // can never hide them — the whole point of searching the DB directly.
  const byScore = (a, b) => b.score - a.score;
  const inCriteria = ranked.filter((j) => !j.gateReason).sort(byScore);
  const outside = ranked.filter((j) => j.gateReason).sort(byScore);
  const outsideSlots = Math.min(outside.length, Math.round(limit * 0.25));
  const scored = [
    ...inCriteria.slice(0, limit - outsideSlots),
    ...outside.slice(0, outsideSlots),
  ];

  return scored.map(
    ({ _job, gated, gateReason, score, label, capReason, match_score: _stale, description: _d, embedding: _emb, ...rest }) => ({
      ...rest,
      match_score: score,
      match_breakdown: rest.breakdown,
      cap_reason: capReason || null,
      outside_criteria: Boolean(gateReason),
      gate_reason: gateReason || null,
    }),
  );
}

/** Invalidate a user's cached matches (call after resume re-upload). */
export function invalidateMatches(userId) {
  cache.delete(userId);
}
