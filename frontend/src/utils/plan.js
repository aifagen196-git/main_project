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

/** A user has access to the app once they hold an active/trialing paid plan
 *  (basic or premium — the only paid plans). */
export function isSubscribed(profile) {
  return (
    ["active", "trialing"].includes(profile?.subscription_status) &&
    ["basic", "premium"].includes(profile?.plan)
  );
}

export function isPaidPlan(plan) {
  return plan === "basic" || plan === "premium";
}

// NOTE: AI usage limits are enforced ENTIRELY on the backend via the
// consume_ai_usage RPC (backend/src/services/ai/usage.js). The frontend does
// not count or gate usage — it just surfaces the backend's 429 ("daily limit
// reached") if it happens.

// The plan cards — one per (plan, billingCycle) pair. Basic offers two;
// Premium offers one. Both the landing page and the in-app Pricing screen
// render these, so the two always show the same lists. `price` and
// `billingCycle` are DISPLAY values only; backend/src/services/payments/
// razorpay.service.js's PRICING is the real source of truth for what Razorpay
// actually charges, and backend/src/routes/payments.routes.js's VALID_PAIRS is
// what /order and /verify actually accept — all three MUST stay in sync.
export const PRICING_CARDS = [
  {
    id: "basic",
    billingCycle: "monthly",
    name: "Basic",
    periodTag: "Monthly",
    price: 229,
    tagline: "Ongoing support while you're actively job hunting.",
    cta: "Get Basic — monthly",
    popular: false,
    features: [
      "Targeted job applications",
      "Resume review & optimization",
      "Personalized career suggestions",
    ],
  },
  {
    id: "basic",
    billingCycle: "semiannual",
    name: "Basic",
    periodTag: "One-time payment",
    price: 1299,
    tagline: "Job Marketing Program — a full application push.",
    cta: "Get Basic — one-time payment",
    popular: false,
    features: [
      "50+ targeted job applications every day",
      "Resume drafting & optimization using 70-80 real job descriptions",
      "ATS-optimized custom cover letter",
      "Recruiter outreach across top U.S. job boards",
      "Mock interview sessions with structured feedback",
      "Dedicated marketing manager for your profile",
      "Ongoing resume and keyword optimization based on market response",
    ],
  },
  {
    id: "premium",
    billingCycle: "semiannual",
    name: "Premium",
    periodTag: "One-time payment",
    price: 2499,
    tagline: "Acceleration Program — everything in Basic, plus interview prep.",
    cta: "Get Premium — one-time payment",
    popular: true,
    featuresIntro: "Includes everything in Basic, plus:",
    features: [
      "Immigration support",
      "Advanced resume crafting tailored to 70-80 targeted job descriptions",
      "Customized cover letters specific to each role",
      "Evaluation calls with expert hiring mentors",
      "LinkedIn optimization and portfolio website building",
      "Advanced interview training with performance feedback",
    ],
  },
];
