// Central plan definitions + gating helpers used across the app.
//
// Two paid tiers, no free tier. `profiles.plan` starts at 'none' (see
// supabase/migrations/0001_subscriptions.sql) and a user must complete
// Razorpay checkout for one of these before subscription_status becomes
// 'active'/'trialing' and the app shell is reachable (isSubscribed below).
//
// Each plan has exactly one fixed price and billing period — there is no
// monthly/annual toggle. `period` is the display label; `billingCycle` is
// the value stored in profiles.billing_cycle and MUST match
// backend/src/services/payments/razorpay.service.js's PRICING table and
// PLAN_CYCLE map (the backend is the source of truth for the actual charge
// amount — this file drives display and client-side gating only).

export const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 210,
    period: "month",
    billingCycle: "monthly",
    tagline: "Get started with AI-matched roles.",
    cta: "Start 7-Day Free Trial",
    popular: false,
    features: [
      "AI Job Matching (20 / day)",
      "Resume Analysis",
      "Application Tracking",
      "Career Insights",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 2499,
    period: "6 months",
    billingCycle: "semiannual",
    tagline: "Everything you need to get more interviews.",
    cta: "Start 7-Day Free Trial",
    popular: true,
    features: [
      "Unlimited AI Job Matching",
      "AI Resume Optimization",
      "AI Cover Letter Generator",
      "Application Tracking & Analytics",
      "AI Application Automation",
      "Priority Support",
    ],
  },
];

export const PLAN_LABEL = {
  none: "No plan",
  basic: "Basic",
  premium: "Premium",
};

// Per-plan capabilities. `aiPerDay = Infinity` means unlimited. Kept in sync
// with the DB-enforced limits in consume_ai_usage()
// (supabase/migrations/0009_plan_tiers.sql) — that function, not this object,
// is what actually blocks an over-limit request; this drives frontend UI only.
export const PLAN_LIMITS = {
  none: { aiPerDay: 0, advancedAnalytics: false, coverLetters: false, automation: false },
  basic: { aiPerDay: 20, advancedAnalytics: false, coverLetters: false, automation: false },
  premium: { aiPerDay: Infinity, advancedAnalytics: true, coverLetters: true, automation: true },
};

export function planLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.none;
}

/** A user has access to the app once they hold any active/trialing plan. */
export function isSubscribed(profile) {
  return ["active", "trialing"].includes(profile?.subscription_status);
}

export function isPaidPlan(plan) {
  return plan === "basic" || plan === "premium";
}

// NOTE: AI usage limits are enforced ENTIRELY on the backend via the
// consume_ai_usage RPC (backend/src/services/ai/usage.js). The frontend does
// not count or gate usage — it just surfaces the backend's 429 ("daily limit
// reached") if it happens.
