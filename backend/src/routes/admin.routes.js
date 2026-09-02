import express from "express";
import { supabase } from "../config/supabase.js";

// All routes here are mounted behind requireAuth + requireAdmin in app.js.
const router = express.Router();

// Matches frontend/src/utils/plan.js — two paid tiers, no free tier.
const PLAN_VALUES = ["none", "basic", "premium"];
const STATUS_VALUES = ["inactive", "trialing", "active", "past_due", "canceled"];

// ---------------------------------------------------------------------------
// GET /api/admin/users — paginated, searchable user + subscription list.
// ---------------------------------------------------------------------------
router.get("/users", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
  const search = (req.query.search || "").trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select(
      "id, email, full_name, plan, subscription_status, billing_cycle, current_period_end, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: profiles, error, count } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  // ai_usage count (last 30 days) per user, in one query rather than N.
  const userIds = (profiles || []).map((p) => p.id);
  const usageByUser = {};
  if (userIds.length) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: usage, error: usageErr } = await supabase
      .from("ai_usage")
      .select("user_id")
      .in("user_id", userIds)
      .gte("used_at", since);
    if (!usageErr) {
      for (const row of usage || []) {
        usageByUser[row.user_id] = (usageByUser[row.user_id] || 0) + 1;
      }
    }
  }

  const users = (profiles || []).map((p) => ({
    ...p,
    aiUsage30d: usageByUser[p.id] || 0,
  }));

  return res.json({
    success: true,
    users,
    page,
    pageSize,
    total: count ?? users.length,
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/plan — manual support override.
// Goes through the service-role client, which the billing-protection
// trigger on public.profiles exempts (see 0001_subscriptions.sql) — only
// the 'authenticated' role is blocked from writing these fields directly.
// ---------------------------------------------------------------------------
router.patch("/users/:id/plan", async (req, res) => {
  const { id } = req.params;
  const { plan, subscription_status, current_period_end } = req.body || {};

  const update = {};
  if (plan !== undefined) {
    if (!PLAN_VALUES.includes(plan)) {
      return res.status(400).json({ success: false, message: `plan must be one of: ${PLAN_VALUES.join(", ")}` });
    }
    update.plan = plan;
  }
  if (subscription_status !== undefined) {
    if (!STATUS_VALUES.includes(subscription_status)) {
      return res.status(400).json({ success: false, message: `subscription_status must be one of: ${STATUS_VALUES.join(", ")}` });
    }
    update.subscription_status = subscription_status;
  }
  if (current_period_end !== undefined) {
    update.current_period_end = current_period_end || null;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ success: false, message: "Nothing to update." });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id, email, plan, subscription_status, current_period_end")
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: "User not found." });

  return res.json({ success: true, user: data });
});

// ---------------------------------------------------------------------------
// GET /api/admin/ai-usage — aggregate usage for monitoring/abuse detection.
// ---------------------------------------------------------------------------
router.get("/ai-usage", async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: usage, error } = await supabase
    .from("ai_usage")
    .select("user_id, used_at")
    .gte("used_at", since)
    .order("used_at", { ascending: false })
    .limit(20000);

  if (error) return res.status(500).json({ success: false, message: error.message });

  const rows = usage || [];

  // Daily totals for the trend chart.
  const dayKey = (iso) => iso.slice(0, 10);
  const byDay = new Map();
  for (const r of rows) {
    const k = dayKey(r.used_at);
    byDay.set(k, (byDay.get(k) || 0) + 1);
  }
  const trend = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, count]) => ({ date, count }));

  // Per-user totals, for a top-users table.
  const byUser = new Map();
  for (const r of rows) {
    byUser.set(r.user_id, (byUser.get(r.user_id) || 0) + 1);
  }
  const topUserIds = [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);

  let topUsers = [];
  if (topUserIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, plan")
      .in("id", topUserIds.map(([id]) => id));
    const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    topUsers = topUserIds.map(([id, count]) => ({
      id,
      email: byId[id]?.email || "(unknown)",
      plan: byId[id]?.plan || "none",
      count,
    }));
  }

  return res.json({
    success: true,
    days,
    total: rows.length,
    uniqueUsers: byUser.size,
    trend,
    topUsers,
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/collector-runs — job-engine run history (see
// job-engine/collectors/runLog.js, supabase/migrations/0015).
// ---------------------------------------------------------------------------
router.get("/collector-runs", async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));

  const { data: runs, error } = await supabase
    .from("collector_runs")
    .select("id, source, started_at, finished_at, success, saved, failed, error")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ success: false, message: error.message });

  // Latest run per source, for a summary/health row per collector.
  const latestBySource = new Map();
  for (const r of runs || []) {
    if (!latestBySource.has(r.source)) latestBySource.set(r.source, r);
  }

  return res.json({
    success: true,
    runs: runs || [],
    latestBySource: [...latestBySource.values()],
  });
});

export default router;
