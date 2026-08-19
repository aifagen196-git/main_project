import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

const STATUSES = ["applied", "interviewing", "assessment", "offer", "rejected"];

// Statuses that mean the employer came back in some form. `applied` is the
// only status that represents "sent, heard nothing".
const RESPONDED = new Set(["interviewing", "assessment", "offer", "rejected"]);

// Statuses that represent an actual interview stage.
const INTERVIEW_STAGE = new Set(["interviewing", "assessment"]);

const DAY = 24 * 60 * 60 * 1000;

/**
 * Percent change between two counts, as a rounded integer.
 * Returns null when there's no prior period to compare against — the caller
 * renders nothing rather than a meaningless "+100%" off a zero base.
 */
function pctChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * GET /api/analytics
 *
 * Aggregates the signed-in user's real applications into the figures the
 * Analytics screen renders. Everything here is derived from rows the user
 * actually created — there are no sample or placeholder values.
 *
 * Known limitation: `applications` stores only the CURRENT status, not a
 * transition history. So an application that was interviewed and then
 * rejected reads as `rejected` here, and the interview it went through is
 * not counted. Interview and response counts are therefore a floor, not an
 * exact historical count. Fixing that properly needs a status-events table;
 * until then the UI labels these as current pipeline, not lifetime totals.
 */
router.get("/", async (req, res) => {
  const { data: apps, error } = await supabase
    .from("applications")
    .select("status, applied_at, updated_at, match_score, company, job_id")
    .eq("user_id", req.user.id);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  const rows = apps || [];
  const now = Date.now();
  const windowStart = now - 30 * DAY;
  const priorStart = now - 60 * DAY;

  const inWindow = (r) => {
    const t = Date.parse(r.applied_at || "");
    return Number.isFinite(t) && t >= windowStart;
  };
  const inPrior = (r) => {
    const t = Date.parse(r.applied_at || "");
    return Number.isFinite(t) && t >= priorStart && t < windowStart;
  };

  const recent = rows.filter(inWindow);
  const prior = rows.filter(inPrior);

  // ---- Funnel: current count per status ----------------------------------
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) {
    if (r.status in byStatus) byStatus[r.status] += 1;
  }

  const countWhere = (list, pred) => list.filter(pred).length;

  const interviews = countWhere(rows, (r) => INTERVIEW_STAGE.has(r.status));
  const offers = byStatus.offer;
  const responded = countWhere(rows, (r) => RESPONDED.has(r.status));

  // ---- Average time to first response ------------------------------------
  // updated_at only changes when the row is edited, so for a responded
  // application it approximates when the status last moved. Good enough for
  // an average; not exact per-row.
  const responseDays = rows
    .filter((r) => RESPONDED.has(r.status))
    .map((r) => {
      const from = Date.parse(r.applied_at || "");
      const to = Date.parse(r.updated_at || "");
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
      return (to - from) / DAY;
    })
    .filter((d) => d !== null);

  const avgResponseDays = responseDays.length
    ? responseDays.reduce((a, b) => a + b, 0) / responseDays.length
    : null;

  // ---- Trend: cumulative applications + interviews, weekly buckets --------
  // Eight weekly points ending today, so the chart always has a stable shape
  // instead of collapsing when the user has only a handful of rows.
  const WEEKS = 8;
  const trend = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const cutoff = now - i * 7 * DAY;
    const upTo = rows.filter((r) => {
      const t = Date.parse(r.applied_at || "");
      return Number.isFinite(t) && t <= cutoff;
    });
    trend.push({
      d: new Date(cutoff).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      a: upTo.length,
      i: upTo.filter((r) => INTERVIEW_STAGE.has(r.status)).length,
    });
  }

  // ---- Top companies applied to ------------------------------------------
  const companyCounts = new Map();
  for (const r of rows) {
    const name = (r.company || "").trim();
    if (!name) continue;
    companyCounts.set(name, (companyCounts.get(name) || 0) + 1);
  }
  const topCompanies = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ---- Source split: matched from the job pool vs added manually ---------
  // job_id is set when the application came from a match; null when the user
  // typed it into the tracker themselves.
  const fromMatches = countWhere(rows, (r) => r.job_id);
  const manual = rows.length - fromMatches;

  return res.json({
    success: true,
    analytics: {
      totals: {
        applications: rows.length,
        interviews,
        offers,
        responded,
        responseRate: rows.length ? Math.round((responded / rows.length) * 100) : 0,
        avgResponseDays:
          avgResponseDays === null ? null : Math.round(avgResponseDays * 10) / 10,
      },
      deltas: {
        applications: pctChange(recent.length, prior.length),
        interviews: pctChange(
          countWhere(recent, (r) => INTERVIEW_STAGE.has(r.status)),
          countWhere(prior, (r) => INTERVIEW_STAGE.has(r.status)),
        ),
        offers: pctChange(
          countWhere(recent, (r) => r.status === "offer"),
          countWhere(prior, (r) => r.status === "offer"),
        ),
      },
      recentCount: recent.length,
      funnel: STATUSES.map((s) => ({ status: s, count: byStatus[s] })),
      trend,
      topCompanies: topCompanies.map(([name, count]) => ({ name, count })),
      sources: [
        { name: "From matches", count: fromMatches },
        { name: "Added manually", count: manual },
      ],
    },
  });
});

export default router;
