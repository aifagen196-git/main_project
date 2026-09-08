// Central plan definitions + gating helpers used across the app.
//
// Two paid TIERS, no free tier. `profiles.plan` starts at 'none' (see
// supabase/migrations/0001_subscriptions.sql) and a user must complete
// Razorpay checkout for one of these before subscription_status becomes
// 'active'/'trialing' and the app shell is reachable (isSubscribed below).
// Feature entitlements (PLAN_LIMITS below, and consume_ai_usage() in
// 0009_plan_tiers.sql) are keyed on the TIER alone — Basic gets the same
// limits whichever cycle it's billed on.

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

// What the Pricing screen actually renders — one card per (plan, billingCycle)
// pair. Basic offers two; Premium offers one. `price` and `billingCycle` here
// are DISPLAY values only; backend/src/services/payments/razorpay.service.js's
// PRICING is the real source of truth for what Razorpay actually charges, and
// backend/src/routes/payments.routes.js's VALID_PAIRS is what /order and
// /verify actually accept — all three MUST stay in sync.
export const PRICING_CARDS = [
  {
    id: "basic",
    billingCycle: "monthly",
    name: "Basic",
    periodTag: "Monthly",
    price: 210,
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
    id: "basic",
    billingCycle: "semiannual",
    name: "Basic",
    periodTag: "Every 6 months",
    price: 1299,
    tagline: "Same Basic features, billed twice a year.",
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
    billingCycle: "semiannual",
    name: "Premium",
    periodTag: "Every 6 months",
    price: 2499,
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
