import express from "express";
import { supabase } from "../config/supabase.js";
import { listPayments, monthlyEquivalent, refundPayment } from "../services/payments/razorpay.service.js";
import { invalidatePlanCache } from "../middleware/requireActivePlan.js";

// All routes here are mounted behind requireAuth + requireAdmin in app.js.
const router = express.Router();

// Matches frontend/src/utils/plan.js — two paid tiers, no free tier.
const PLAN_VALUES = ["none", "basic", "premium"];
const STATUS_VALUES = ["inactive", "trialing", "active", "past_due", "canceled"];

const ACTIVE_STATUSES = ["active", "trialing"];
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (n) => new Date(Date.now() - n * DAY_MS).toISOString();

/**
 * Records a privileged admin action. Never throws: an audit write failing
 * must not roll back or 500 the action the admin actually asked for — but it
 * is logged loudly, and a missing table (migration 0016 not applied yet) is
 * reported once rather than on every call.
 */
// PostgREST reports an absent table as "Could not find the table 'x' in the
// schema cache"; Postgres itself says "relation ... does not exist". Match
// both so a pre-migration database is detected either way.
const isMissingTable = (msg = "") =>
  /could not find the table|relation .* does not exist|schema cache/i.test(msg);

let auditTableMissing = false;
async function logAudit(req, { action, targetType, targetId, detail }) {
  if (auditTableMissing) return;
  const { error } = await supabase.from("admin_audit_log").insert({
    actor_id: req.user?.id || null,
    actor_email: req.user?.email || null,
    action,
    target_type: targetType || null,
    target_id: targetId != null ? String(targetId) : null,
    detail: detail || {},
  });
  if (error) {
    if (isMissingTable(error.message)) {
      auditTableMissing = true;
      console.warn("admin_audit_log missing — run supabase/migrations/0016. Audit logging disabled.");
    } else {
      console.error("Audit log write failed", error.message);
    }
  }
}

// Cheap exact row count. head:true means no rows come back, only the count —
// and "*" (rather than a named column) keeps this usable on saved_jobs, which
// has a composite primary key and no id column.
async function countRows(table, apply = (q) => q) {
  const { count, error } = await apply(supabase.from(table).select("*", { count: "exact", head: true }));
  if (error) throw new Error(`${table}: ${error.message}`);
  // A HEAD request against a table that doesn't exist answers 204 with no
  // error and a null count, so an absent table would otherwise read as a
  // legitimate zero. Treat null as the failure it is.
  if (count == null) throw new Error(`${table}: no count returned (does the table exist?)`);
  return count;
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
      jobsLive, jobsTotal, jobs24h, internalJobs, jobsInactive, jobsStale,
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
      // Deactivated rows are never removed by the retention policy (it keys on
      // expires_at / last_seen, not is_active), so they accumulate silently.
      countRows("jobs", (q) => q.eq("is_active", false)),
      // Stale enough that cleanup_old_jobs() would take them, if it ran.
      countRows("jobs", (q) => q.lt("last_seen", isoDaysAgo(14))),
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
      content: { jobsLive, jobsTotal, jobs24h, internalJobs, jobsInactive, jobsStale },
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
  const failed = payments.filter((p) => p.status === "failed");
  const summary = {
    grossCaptured: captured.reduce((s, p) => s + p.amount, 0),
    capturedCount: captured.length,
    failedCount: failed.length,
    refundedCount: payments.filter((p) => p.status === "refunded").length,
    currency: payments[0]?.currency || process.env.RAZORPAY_CURRENCY || "USD",
    // Attempts that failed vs. attempts that went through. A high rate here is
    // lost revenue, not just noise.
    failureRate: payments.length ? Math.round((failed.length / payments.length) * 100) : 0,
  };

  // Captured revenue per day, for the trend chart.
  const byDay = new Map();
  for (const p of captured) {
    if (!p.createdAt) continue;
    const k = p.createdAt.slice(0, 10);
    byDay.set(k, (byDay.get(k) || 0) + p.amount);
  }
  const revenueTrend = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

  // Failure triage: group by payer so a customer who tried repeatedly and
  // never succeeded stands out from a one-off decline.
  const triage = new Map();
  for (const p of failed) {
    const key = p.email || p.contact || p.id;
    const entry = triage.get(key) || {
      email: p.email,
      contact: p.contact,
      attempts: 0,
      amount: p.amount,
      reasons: new Set(),
      lastAttempt: null,
      recovered: false,
    };
    entry.attempts += 1;
    if (p.errorDescription) entry.reasons.add(p.errorDescription);
    if (!entry.lastAttempt || p.createdAt > entry.lastAttempt) entry.lastAttempt = p.createdAt;
    triage.set(key, entry);
  }
  // Did this payer eventually succeed? If so they need no follow-up.
  for (const p of captured) {
    const key = p.email || p.contact;
    if (key && triage.has(key)) triage.get(key).recovered = true;
  }
  const failedPayers = [...triage.values()]
    .map((e) => ({ ...e, reasons: [...e.reasons] }))
    .sort((a, b) => b.attempts - a.attempts || (b.lastAttempt > a.lastAttempt ? 1 : -1));

  return res.json({
    success: true,
    days,
    skip,
    hasMore: items.length === count,
    payments,
    summary,
    revenueTrend,
    failedPayers,
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/users — paginated, searchable user + subscription list.
// ---------------------------------------------------------------------------
router.get("/users", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
  const search = (req.query.search || "").trim();
  const plan = (req.query.plan || "").trim();
  const status = (req.query.status || "").trim();
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
    // Escape PostgREST's or() delimiters so a comma or paren can't break out
    // of the filter expression.
    const safe = search.replace(/[,()]/g, " ");
    query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`);
  }
  // Plan and status filter server-side, across the whole table. Doing this in
  // the browser only ever filtered the 25 rows already on screen, so "show me
  // every past_due account" silently skipped everyone on another page.
  if (plan) query = query.eq("plan", plan);
  if (status) query = query.eq("subscription_status", status);

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
  const { plan, subscription_status, current_period_end, reason } = req.body || {};

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

  // Capture the prior values so the audit entry shows what actually changed.
  const { data: before } = await supabase
    .from("profiles")
    .select("plan, subscription_status, current_period_end")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id, email, plan, subscription_status, current_period_end")
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: "User not found." });

  // Granting paid access by hand is the single most sensitive thing this API
  // can do, so it is always attributable.
  await logAudit(req, {
    action: "user.plan_override",
    targetType: "user",
    targetId: id,
    detail: { before: before || null, after: update, targetEmail: data.email, reason: reason || null },
  });
  invalidatePlanCache(id);

  return res.json({ success: true, user: data });
});

// ---------------------------------------------------------------------------
// GET /api/admin/ai-usage — aggregate usage for monitoring/abuse detection.
// ---------------------------------------------------------------------------
router.get("/ai-usage", async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Migration 0016 adds provider/model/feature/cost. Ask for them, and fall
  // back to the original two columns if it hasn't been applied yet, so this
  // endpoint works either way.
  let rows;
  let hasAttribution = true;
  {
    const rich = await supabase
      .from("ai_usage")
      .select("user_id, used_at, provider, model, feature, input_tokens, output_tokens, cost_usd, success")
      .gte("used_at", since)
      .order("used_at", { ascending: false })
      .limit(20000);

    if (rich.error) {
      hasAttribution = false;
      const basic = await supabase
        .from("ai_usage")
        .select("user_id, used_at")
        .gte("used_at", since)
        .order("used_at", { ascending: false })
        .limit(20000);
      if (basic.error) return res.status(500).json({ success: false, message: basic.error.message });
      rows = basic.data || [];
    } else {
      rows = rich.data || [];
    }
  }

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

  // Provider / feature / cost breakdown — empty until 0016 is applied and the
  // AI services start recording attribution.
  const tally = (key) => {
    const m = new Map();
    for (const r of rows) {
      const v = r[key];
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  };

  const totalCost = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const failures = rows.filter((r) => r.success === false).length;

  return res.json({
    success: true,
    days,
    total: rows.length,
    uniqueUsers: byUser.size,
    trend,
    topUsers,
    hasAttribution,
    byProvider: tally("provider"),
    byFeature: tally("feature"),
    byModel: tally("model"),
    totalCost: Math.round(totalCost * 10000) / 10000,
    failures,
    tokens: {
      input: rows.reduce((s, r) => s + (Number(r.input_tokens) || 0), 0),
      output: rows.reduce((s, r) => s + (Number(r.output_tokens) || 0), 0),
    },
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

// ---------------------------------------------------------------------------
// GET /api/admin/jobs — search/moderate the scraped job pool.
//
// The pool is ~60k rows and had no admin surface at all: a junk or broken
// listing could only be found and removed through the Supabase SQL editor.
// ---------------------------------------------------------------------------
router.get("/jobs", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
  const search = (req.query.search || "").trim();
  const source = (req.query.source || "").trim();
  const status = (req.query.status || "").trim(); // active | inactive | ''
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("jobs")
    .select("id, title, company, location, source, apply_url, salary, employment_type, is_active, posted_date, last_seen, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (search) {
    // Escape PostgREST's or() delimiters so a comma or paren in the search
    // term can't break out of the filter expression.
    const safe = search.replace(/[,()]/g, " ");
    query = query.or(`title.ilike.%${safe}%,company.ilike.%${safe}%`);
  }
  if (source) query = query.eq("source", source);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  return res.json({ success: true, jobs: data || [], page, pageSize, total: count ?? 0 });
});

// ---------------------------------------------------------------------------
// GET /api/admin/jobs/sources — per-source counts, for the moderation filter
// and for spotting a collector that has stopped contributing.
// ---------------------------------------------------------------------------
router.get("/jobs/sources", async (req, res) => {
  // PostgREST caps a result set at ~1000 rows no matter what .limit() says, so
  // scanning `jobs` for distinct sources silently returns only the handful
  // that appear in the newest 1000 rows. collector_runs has exactly one row
  // per collector run and is small, so it's the reliable list of source names;
  // the newest slice of `jobs` then catches anything that never logged a run.
  const [runs, recent] = await Promise.all([
    supabase.from("collector_runs").select("source").limit(1000),
    supabase.from("jobs").select("source").order("created_at", { ascending: false }).limit(1000),
  ]);
  if (runs.error && recent.error) {
    return res.status(500).json({ success: false, message: runs.error.message });
  }

  const names = [
    ...new Set([...(runs.data || []), ...(recent.data || [])].map((r) => r.source).filter(Boolean)),
  ].sort();
  const sources = await Promise.all(
    names.map(async (name) => ({
      source: name,
      total: await countRows("jobs", (q) => q.eq("source", name)),
      active: await countRows("jobs", (q) => q.eq("source", name).eq("is_active", true)),
    })),
  );

  return res.json({ success: true, sources });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/jobs/:id — hide or restore a single listing.
// ---------------------------------------------------------------------------
router.patch("/jobs/:id", async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body || {};
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ success: false, message: "is_active (boolean) is required." });
  }

  const { data, error } = await supabase
    .from("jobs")
    .update({ is_active })
    .eq("id", id)
    .select("id, title, company, is_active")
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: "Job not found." });

  await logAudit(req, {
    action: is_active ? "job.activate" : "job.deactivate",
    targetType: "job",
    targetId: id,
    detail: { title: data.title, company: data.company },
  });

  return res.json({ success: true, job: data });
});

// ---------------------------------------------------------------------------
// POST /api/admin/jobs/bulk — deactivate several listings at once.
// ---------------------------------------------------------------------------
router.post("/jobs/bulk", async (req, res) => {
  const { ids, is_active } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "ids must be a non-empty array." });
  }
  if (ids.length > 500) {
    return res.status(400).json({ success: false, message: "At most 500 jobs per request." });
  }
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ success: false, message: "is_active (boolean) is required." });
  }

  const { data, error } = await supabase
    .from("jobs")
    .update({ is_active })
    .in("id", ids)
    .select("id");

  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAudit(req, {
    action: is_active ? "job.bulk_activate" : "job.bulk_deactivate",
    targetType: "job",
    targetId: null,
    detail: { count: data?.length || 0, ids: ids.slice(0, 50) },
  });

  return res.json({ success: true, updated: data?.length || 0 });
});

// ---------------------------------------------------------------------------
// GET /api/admin/users/:id — everything about one account, for support.
// ---------------------------------------------------------------------------
router.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!profile) return res.status(404).json({ success: false, message: "User not found." });

  const [resumes, applications, saved, preferences, aiUsage] = await Promise.all([
    supabase
      .from("resumes")
      .select("id, file_name, uploaded_at, extracted_skills, ai_analysis")
      .eq("user_id", id)
      .order("uploaded_at", { ascending: false })
      .limit(20),
    supabase
      .from("applications")
      .select("id, company, role, status, match_score, applied_at")
      .eq("user_id", id)
      .order("applied_at", { ascending: false })
      .limit(50),
    supabase.from("saved_jobs").select("job_id, created_at").eq("user_id", id).limit(50),
    supabase.from("user_job_preferences").select("*").eq("user_id", id).maybeSingle(),
    supabase
      .from("ai_usage")
      .select("used_at")
      .eq("user_id", id)
      .order("used_at", { ascending: false })
      .limit(200),
  ]);

  // Keep the response small: the analysis blob is large, so send only the
  // headline scores the support view actually shows.
  const resumeRows = (resumes.data || []).map((r) => ({
    id: r.id,
    file_name: r.file_name,
    uploaded_at: r.uploaded_at,
    skillCount: (r.extracted_skills || []).length,
    resume_score: r.ai_analysis?.resume_score ?? null,
    ats_score: r.ai_analysis?.ats_score ?? null,
  }));

  return res.json({
    success: true,
    profile,
    resumes: resumeRows,
    applications: applications.data || [],
    savedJobs: saved.data || [],
    preferences: preferences.data || null,
    aiUsage: {
      total: (aiUsage.data || []).length,
      last30d: (aiUsage.data || []).filter((r) => r.used_at >= isoDaysAgo(30)).length,
      lastUsedAt: aiUsage.data?.[0]?.used_at || null,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/audit-log — who did what.
// ---------------------------------------------------------------------------
router.get("/audit-log", async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
  const action = (req.query.action || "").trim();

  let query = supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (action) query = query.eq("action", action);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error.message)) {
      return res.status(503).json({
        success: false,
        code: "MIGRATION_REQUIRED",
        message: "Run supabase/migrations/0016_admin_audit_and_ai_usage.sql to enable the audit log.",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.json({ success: true, entries: data || [] });
});

// ---------------------------------------------------------------------------
// POST /api/admin/payments/:id/refund — refund without leaving the portal.
// ---------------------------------------------------------------------------
router.post("/payments/:id/refund", async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body || {};

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ success: false, message: "Razorpay keys are not configured." });
  }

  let refund;
  try {
    refund = await refundPayment(id, {
      amount: amount != null ? amount : undefined,
      notes: reason ? { reason, refundedBy: req.user.email || req.user.id } : undefined,
    });
  } catch (e) {
    // Razorpay's own message ("payment already refunded", "not captured") is
    // more useful to the admin than anything generic.
    const msg = e?.error?.description || e?.message || "Refund failed.";
    return res.status(400).json({ success: false, message: msg });
  }

  await logAudit(req, {
    action: "payment.refund",
    targetType: "payment",
    targetId: id,
    detail: { refundId: refund?.id, amount: refund?.amount ? refund.amount / 100 : null, reason: reason || null },
  });

  return res.json({ success: true, refund });
});

// ---------------------------------------------------------------------------
// GET /api/admin/subscriptions/expiring — renewals and silent lapses.
//
// current_period_end is only meaningful now that /verify stamps it (B5); this
// surfaces accounts about to expire, plus the ones already past their period
// end but still marked active — those are getting access they stopped paying
// for, and nothing else in the app reports them.
// ---------------------------------------------------------------------------
router.get("/subscriptions/expiring", async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
  const now = new Date().toISOString();
  const horizon = new Date(Date.now() + days * DAY_MS).toISOString();

  const [upcoming, lapsed] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, plan, billing_cycle, subscription_status, current_period_end")
      .in("subscription_status", ACTIVE_STATUSES)
      .gte("current_period_end", now)
      .lte("current_period_end", horizon)
      .order("current_period_end", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, email, full_name, plan, billing_cycle, subscription_status, current_period_end")
      .in("subscription_status", ACTIVE_STATUSES)
      .lt("current_period_end", now)
      .order("current_period_end", { ascending: true }),
  ]);

  if (upcoming.error) return res.status(500).json({ success: false, message: upcoming.error.message });

  return res.json({
    success: true,
    days,
    upcoming: upcoming.data || [],
    lapsed: lapsed.data || [],
  });
});

// ---------------------------------------------------------------------------
// GET/POST/DELETE /api/admin/admins — manage the allowlist without the SQL
// editor. Adding an admin is itself audited.
// ---------------------------------------------------------------------------
router.get("/admins", async (req, res) => {
  const { data, error } = await supabase.from("admins").select("user_id, created_at");
  if (error) return res.status(500).json({ success: false, message: error.message });

  const ids = (data || []).map((a) => a.user_id);
  let profiles = [];
  if (ids.length) {
    const { data: p } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
    profiles = p || [];
  }
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));

  return res.json({
    success: true,
    admins: (data || []).map((a) => ({
      user_id: a.user_id,
      created_at: a.created_at,
      email: byId[a.user_id]?.email || "(unknown)",
      full_name: byId[a.user_id]?.full_name || null,
      isSelf: a.user_id === req.user.id,
    })),
  });
});

router.post("/admins", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: "email is required." });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: "No account with that email — they must sign up first.",
    });
  }

  const { error } = await supabase.from("admins").insert({ user_id: profile.id });
  if (error) {
    if (/duplicate key/i.test(error.message)) {
      return res.status(409).json({ success: false, message: "That user is already an admin." });
    }
    return res.status(500).json({ success: false, message: error.message });
  }

  await logAudit(req, {
    action: "admin.grant",
    targetType: "admin",
    targetId: profile.id,
    detail: { email: profile.email },
  });

  return res.json({ success: true, admin: { user_id: profile.id, email: profile.email } });
});

router.delete("/admins/:id", async (req, res) => {
  const { id } = req.params;

  // Refuse to remove yourself, and refuse to empty the allowlist — either one
  // locks everybody out of the portal with no way back in but the SQL editor.
  if (id === req.user.id) {
    return res.status(400).json({ success: false, message: "You can't remove your own admin access." });
  }
  const remaining = await countRows("admins");
  if (remaining <= 1) {
    return res.status(400).json({ success: false, message: "Can't remove the last admin." });
  }

  const { error } = await supabase.from("admins").delete().eq("user_id", id);
  if (error) return res.status(500).json({ success: false, message: error.message });

  await logAudit(req, { action: "admin.revoke", targetType: "admin", targetId: id, detail: {} });

  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST /api/admin/collectors/trigger — kick the job-engine workflow.
//
// The collectors live in their own repo (github.com/aifagen196-git/collectors)
// and run on a schedule, so the only way to force a run was the GitHub UI.
// Needs GITHUB_TOKEN (a PAT with `actions: write` on that repo).
// ---------------------------------------------------------------------------
router.post("/collectors/trigger", async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.COLLECTORS_REPO || "aifagen196-git/collectors";
  const workflow = process.env.COLLECTORS_WORKFLOW || "job-engine.yml";
  const ref = process.env.COLLECTORS_REF || "main";

  if (!token) {
    return res.status(503).json({
      success: false,
      message: "GITHUB_TOKEN is not set on the server — add a PAT with actions:write to trigger runs.",
    });
  }

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  let ghRes;
  try {
    ghRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref }),
    });
  } catch (e) {
    return res.status(502).json({ success: false, message: `Could not reach GitHub: ${e.message}` });
  }

  if (!ghRes.ok) {
    const body = await ghRes.text().catch(() => "");
    return res.status(502).json({
      success: false,
      message: `GitHub refused the dispatch (${ghRes.status}). ${body.slice(0, 300)}`,
    });
  }

  await logAudit(req, {
    action: "collectors.trigger",
    targetType: "workflow",
    targetId: `${repo}/${workflow}`,
    detail: { ref },
  });

  return res.json({ success: true, message: `Dispatched ${workflow} on ${repo}@${ref}.` });
});

// ---------------------------------------------------------------------------
// GET /api/admin/system-health — which integrations are actually configured.
//
// Keys are reported as configured/absent only; no key material is returned.
// ---------------------------------------------------------------------------
router.get("/system-health", async (req, res) => {
  const present = (v) => Boolean(v && v.trim());
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const checks = [
    {
      name: "Supabase",
      ok: present(process.env.SUPABASE_URL) && present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: present(process.env.SUPABASE_URL) ? process.env.SUPABASE_URL : "SUPABASE_URL not set",
    },
    {
      name: "Razorpay keys",
      ok: present(process.env.RAZORPAY_KEY_ID) && present(process.env.RAZORPAY_KEY_SECRET),
      detail: present(process.env.RAZORPAY_KEY_ID)
        ? `${process.env.RAZORPAY_KEY_ID.startsWith("rzp_live") ? "LIVE" : "test"} mode`
        : "not configured",
    },
    {
      name: "Razorpay webhook secret",
      ok: present(webhookSecret) && webhookSecret !== "REPLACE_WITH_RAZORPAY_WEBHOOK_SECRET",
      detail:
        !present(webhookSecret) || webhookSecret === "REPLACE_WITH_RAZORPAY_WEBHOOK_SECRET"
          ? "placeholder — webhook events are rejected"
          : "configured",
    },
    {
      name: "Claude (Anthropic)",
      ok: present(process.env.ANTHROPIC_API_KEY),
      detail: present(process.env.ANTHROPIC_API_KEY) ? "configured" : "not set — falls through to Groq",
    },
    {
      name: "Groq",
      ok: present(process.env.GROQ_API_KEY),
      detail: present(process.env.GROQ_API_KEY)
        ? `model: ${process.env.GROQ_MODEL || "meta-llama/llama-4-maverick-17b-128e-instruct (default)"}`
        : "not set",
    },
    {
      name: "Gemini",
      ok: present(process.env.GEMINI_API_KEY),
      detail: present(process.env.GEMINI_API_KEY) ? "configured" : "not set",
    },
    {
      name: "Embeddings (OpenAI)",
      ok: present(process.env.EMBEDDINGS_API_KEY),
      detail: present(process.env.EMBEDDINGS_API_KEY) ? "configured" : "disabled — semantic ranking off",
    },
  ];

  // Is the audit table actually there? A HEAD request answers 204 with no
  // error even when the table is missing, so this has to be a real select.
  const { error: auditErr } = await supabase.from("admin_audit_log").select("id").limit(1);
  checks.push({
    name: "Audit log table",
    ok: !auditErr,
    detail: auditErr
      ? "missing — run supabase/migrations/0016 to enable audit logging"
      : "ready",
  });

  return res.json({
    success: true,
    env: process.env.NODE_ENV || "development",
    checks,
    aiChain: ["Claude", "Groq", "Gemini"].filter((_, i) =>
      [process.env.ANTHROPIC_API_KEY, process.env.GROQ_API_KEY, process.env.GEMINI_API_KEY][i],
    ),
  });
});

export default router;
