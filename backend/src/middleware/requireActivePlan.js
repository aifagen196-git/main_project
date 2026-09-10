import { supabase } from "../config/supabase.js";

// Server-side paywall. The frontend already refuses to render the app shell
// for a user without an active plan (isSubscribed() in utils/plan.js), but
// nothing stopped a raw API call — every product endpoint served a
// plan='none' account, including the two LLM calls a resume upload triggers.
// This closes that: the same routes the app shell gates are gated here too.
//
// Chain AFTER requireAuth (needs req.user). Does NOT gate /api/profile
// (a user must be able to read their own status), /api/payments (they need
// to pay), /api/admin (its own requireAdmin), or /api/health.

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

// Tiny per-user cache so we don't hit the DB on every single request. Short
// TTL so a just-activated plan is picked up quickly; invalidated explicitly
// on activation (see payments.routes.js).
const cache = new Map(); // userId -> { active, expiresAt }
const TTL_MS = 60 * 1000;

export function invalidatePlanCache(userId) {
  cache.delete(userId);
}

export async function requireActivePlan(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const cached = cache.get(req.user.id);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.active) return next();
    return res.status(402).json({
      success: false,
      code: "PLAN_REQUIRED",
      message: "An active plan is required to use this feature.",
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_status, current_period_end")
    .eq("id", req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  const statusOk = ACTIVE_STATUSES.has(data?.subscription_status);
  // If an expiry is set and has passed, the plan is no longer active even if
  // the status column still says so (a lapsed subscription nobody downgraded).
  const notExpired =
    !data?.current_period_end || new Date(data.current_period_end) > new Date();
  const active = statusOk && notExpired;

  cache.set(req.user.id, { active, expiresAt: Date.now() + TTL_MS });

  if (active) return next();
  return res.status(402).json({
    success: false,
    code: "PLAN_REQUIRED",
    message: "An active plan is required to use this feature.",
  });
}
