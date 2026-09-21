import express from "express";
import { supabase } from "../config/supabase.js";
import { listPayments, monthlyEquivalent } from "../services/payments/razorpay.service.js";

// All routes here are mounted behind requireAuth + requireAdmin in app.js.
const router = express.Router();

// Matches frontend/src/utils/plan.js — two paid tiers, no free tier.
const PLAN_VALUES = ["none", "basic", "premium"];
const STATUS_VALUES = ["inactive", "trialing", "active", "past_due", "canceled"];

const ACTIVE_STATUSES = ["active", "trialing"];
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (n) => new Date(Date.now() - n * DAY_MS).toISOString();

// Cheap exact row count. head:true means no rows come back, only the count —
// and "*" (rather than a named column) keeps this usable on saved_jobs, which
// has a composite primary key and no id column.
async function countRows(table, apply = (q) => q) {
  const { count, error } = await apply(supabase.from(table).select("*", { count: "exact", head: true }));
  if (error) throw new Error(`${table}: ${error.message}`);
  return count || 0;
}

// ---------------------------------------------------------------------------
// GET /api/admin/overview — headline metrics for the Dashboard tab.
// ---------------------------------------------------------------------------
router.get("/overview", async (req, res) => {
  try {
    const d7 = isoDaysAgo(7);
    const d30 = isoDaysAgo(30);
    const d1 = isoDaysAgo(1);

    const byStatus = (s) => (q) => q.eq("subscription_status", s);
    const activePlan = (plan, cycle) => (q) =>
      q.eq("plan", plan).eq("billing_cycle", cycle).in("subscription_status", ACTIVE_STATUSES);

    const [
      usersTotal, users7d, users30d,
      subsActive, subsTrialing, subsPastDue, subsCanceled,
      planBasic, planPremium,
      basicMonthly, basicSemi, premiumSemi,
      jobsLive, jobsTotal, jobs24h, internalJobs,
      applications, savedJobs, resumes,
      aiCalls30d,
    ] = await Promise.all([
      countRows("profiles"),
      countRows("profiles", (q) => q.gte("created_at", d7)),
      countRows("profiles", (q) => q.gte("created_at", d30)),
      countRows("profiles", byStatus("active")),
      countRows("profiles", byStatus("trialing")),
      countRows("profiles", byStatus("past_due")),
      countRows("profiles", byStatus("canceled")),
      countRows("profiles", (q) => q.eq("plan", "basic").in("subscription_status", ACTIVE_STATUSES)),
      countRows("profiles", (q) => q.eq("plan", "premium").in("subscription_status", ACTIVE_STATUSES)),
      countRows("profiles", activePlan("basic", "monthly")),
      countRows("profiles", activePlan("basic", "semiannual")),
      countRows("profiles", activePlan("premium", "semiannual")),
      countRows("jobs", (q) => q.eq("is_active", true)),
      countRows("jobs"),
      countRows("jobs", (q) => q.gte("created_at", d1)),
      countRows("internal_jobs"),
      countRows("applications"),
      countRows("saved_jobs"),
      countRows("resumes"),
      countRows("ai_usage", (q) => q.gte("used_at", d30)),
    ]);

    // MRR from what each active subscription is actually worth per month.
    const mrr =
      basicMonthly * monthlyEquivalent("basic", "monthly") +
      basicSemi * monthlyEquivalent("basic", "semiannual") +
      premiumSemi * monthlyEquivalent("premium", "semiannual");

    // Signups per day (30d) for the trend chart.
    const { data: recent } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", d30)
      .limit(10000);
    const byDay = new Map();
    for (const r of recent || []) {
      const k = r.created_at.slice(0, 10);
      byDay.set(k, (byDay.get(k) || 0) + 1);
    }
    const signupTrend = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, count]) => ({ date, count }));

    // Collector health — latest run per source, and which of those failed.
    const { data: runs } = await supabase
      .from("collector_runs")
      .select("source, started_at, success, saved")
      .order("started_at", { ascending: false })
      .limit(500);
    const latest = new Map();
    for (const r of runs || []) if (!latest.has(r.source)) latest.set(r.source, r);
    const latestRuns = [...latest.values()];

    return res.json({
      success: true,
      users: { total: usersTotal, new7d: users7d, new30d: users30d },
      subscriptions: {
        active: subsActive,
        trialing: subsTrialing,
        pastDue: subsPastDue,
        canceled: subsCanceled,
        basic: planBasic,
        premium: planPremium,
        paying: planBasic + planPremium,
      },
      revenue: {
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        currency: process.env.RAZORPAY_CURRENCY || "USD",
      },
      content: { jobsLive, jobsTotal, jobs24h, internalJobs },
      engagement: { applications, savedJobs, resumes, aiCalls30d },
      collectors: {
        sources: latestRuns.length,
        failing: latestRuns.filter((r) => !r.success).length,
        lastRunAt: latestRuns[0]?.started_at || null,
      },
      signupTrend,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/payments — transaction history straight from Razorpay.
//
// profiles only stores the LAST payment id per user, so it can't show history,
// failed attempts or refunds. Razorpay is queried live and each payment is
// matched back to a profile by its order id / email where possible.
// ---------------------------------------------------------------------------
router.get("/payments", async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 90));
  const count = Math.min(100, Math.max(1, parseInt(req.query.count, 10) || 100));
  const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Razorpay keys are not configured on this server.",
    });
  }

  let items;
  try {
    items = await listPayments({
      from: Math.floor((Date.now() - days * DAY_MS) / 1000),
      to: Math.floor(Date.now() / 1000),
      count,
      skip,
    });
  } catch (e) {
    console.error("Razorpay payments fetch failed", e);
    return res.status(502).json({ success: false, message: "Could not reach Razorpay." });
  }

  // Match payments back to accounts: first on the order id stored at
  // activation, then on the payer's email. The email fallback matters because
  // /verify is the only path that writes razorpay_order_id — a payment
  // activated by the webhook, made before that column existed, or paid from a
  // different email than the account would otherwise show as orphaned.
  const orderIds = [...new Set(items.map((p) => p.order_id).filter(Boolean))];
  const emails = [...new Set(items.map((p) => p.email).filter(Boolean))];
  const byOrder = {};
  const byEmail = {};
  if (orderIds.length || emails.length) {
    const filters = [];
    if (orderIds.length) filters.push(`razorpay_order_id.in.(${orderIds.join(",")})`);
    if (emails.length) filters.push(`email.in.(${emails.map((e) => `"${e}"`).join(",")})`);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, plan, billing_cycle, razorpay_order_id")
      .or(filters.join(","));
    for (const p of profiles || []) {
      if (p.razorpay_order_id) byOrder[p.razorpay_order_id] = p;
      if (p.email) byEmail[p.email.toLowerCase()] = p;
    }
  }

  const payments = items.map((p) => {
    const profile = byOrder[p.order_id] || byEmail[(p.email || "").toLowerCase()] || null;
    return {
      id: p.id,
      orderId: p.order_id,
      amount: p.amount / 100, // Razorpay returns the smallest currency unit
      currency: p.currency,
      status: p.status, // created | authorized | captured | refunded | failed
      method: p.method,
      description: p.description,
      email: p.email || profile?.email || null,
      contact: p.contact || null,
      errorDescription: p.error_description || null,
      createdAt: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
      plan: p.notes?.plan || profile?.plan || null,
      billingCycle: p.notes?.billingCycle || profile?.billing_cycle || null,
      userId: p.notes?.userId || profile?.id || null,
      matched: Boolean(profile),
    };
  });

  const captured = payments.filter((p) => p.status === "captured");
  const summary = {
    grossCaptured: captured.reduce((s, p) => s + p.amount, 0),
    capturedCount: captured.length,
    failedCount: payments.filter((p) => p.status === "failed").length,
    refundedCount: payments.filter((p) => p.status === "refunded").length,
    currency: payments[0]?.currency || process.env.RAZORPAY_CURRENCY || "USD",
  };

  return res.json({ success: true, days, payments, summary });
});

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
