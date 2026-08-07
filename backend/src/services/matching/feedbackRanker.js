// backend/src/services/matching/feedbackRanker.js
//
// Personalization rerank (JustHireMe pattern): learn small boosts/penalties
// from the user's OWN actions — saved jobs and tracked applications are
// positive signals on the features of those jobs (company, role family,
// workplace type, source platform). Applied as a bounded final adjustment on
// top of the match score, never as a replacement for it.
//
// Deliberately conservative:
//   - total adjustment clamped to ±6 points so feedback can reorder jobs
//     WITHIN a quality tier but can never promote a weak match over a strong one.
//   - features need 2+ occurrences before they count (one save is noise).
//   - fails soft: any DB error → zero adjustments.

import { supabase } from "../../config/supabase.js";
import { inferRoleFamily } from "./scoreMatch.js";

// Positive label weights per signal source (applied > saved: applying is a
// stronger statement of intent than bookmarking).
const SIGNAL_WEIGHTS = { applied: 1.0, saved: 0.6 };

// How much each matched feature is worth, before clamping.
const FEATURE_POINTS = { company: 3, role_family: 2, remote: 1.5, source: 1 };

const MAX_ADJUST = 6;
const MIN_OCCURRENCES = 2;

function featureOf(job) {
  return {
    company: String(job.company || "").toLowerCase().trim(),
    role_family:
      (job.role_family && job.role_family !== "other"
        ? job.role_family
        : inferRoleFamily(job.title || "")) || "",
    remote: job.is_remote_us || /remote/i.test(job.location || "") ? "remote" : "",
    source: String(job.source || job.platform || "").toLowerCase().trim(),
  };
}

/**
 * Build a per-user preference model from saved_jobs + applications.
 * Returns { company: Map(value -> mass), role_family: Map, ... }.
 */
export async function buildPreferenceModel(userId) {
  const model = {
    company: new Map(),
    role_family: new Map(),
    remote: new Map(),
    source: new Map(),
  };

  try {
    const [savedRes, appliedRes] = await Promise.all([
      supabase
        .from("saved_jobs")
        .select("job:jobs(company, title, role_family, location, is_remote_us, source)")
        .eq("user_id", userId)
        .limit(200),
      supabase
        .from("applications")
        .select("company, title, location")
        .eq("user_id", userId)
        .limit(200),
    ]);

    const add = (job, w) => {
      const f = featureOf(job);
      for (const [k, v] of Object.entries(f)) {
        if (!v) continue;
        model[k].set(v, (model[k].get(v) || 0) + w);
      }
    };

    for (const row of savedRes.data || []) {
      if (row.job) add(row.job, SIGNAL_WEIGHTS.saved);
    }
    for (const row of appliedRes.data || []) {
      add(row, SIGNAL_WEIGHTS.applied);
    }
  } catch (e) {
    console.error("Feedback model build failed:", e.message);
  }
  return model;
}

/**
 * Compute the bounded adjustment for one job against the model.
 */
export function feedbackAdjustment(model, job) {
  const f = featureOf(job);
  let adjust = 0;
  for (const [k, v] of Object.entries(f)) {
    if (!v) continue;
    const mass = model[k]?.get(v) || 0;
    if (mass >= MIN_OCCURRENCES * SIGNAL_WEIGHTS.saved) {
      adjust += FEATURE_POINTS[k] * Math.min(1, mass / 4);
    }
  }
  return Math.max(-MAX_ADJUST, Math.min(MAX_ADJUST, Math.round(adjust)));
}

/**
 * Rerank a UI jobs array in place-order: match_score + bounded feedback boost.
 * Attaches `feedback_boost` so the UI can explain the ordering if desired.
 */
export async function applyFeedbackRerank(userId, jobs) {
  if (!jobs?.length) return jobs;
  const model = await buildPreferenceModel(userId);
  const any =
    model.company.size || model.role_family.size || model.remote.size || model.source.size;
  if (!any) return jobs;

  return jobs
    .map((j) => {
      const boost = feedbackAdjustment(model, j);
      return boost ? { ...j, feedback_boost: boost } : j;
    })
    .sort(
      (a, b) =>
        b.match_score + (b.feedback_boost || 0) - (a.match_score + (a.feedback_boost || 0)),
    );
}
