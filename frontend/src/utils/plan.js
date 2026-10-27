// Central plan definitions + gating helpers used across the app.
//
// Two paid TIERS. `profiles.plan` starts at 'none'; the app shell opens once
// the user starts the 7-day free trial (Basic, status 'trialing') or pays
// (status 'active') — see isSubscribed below.
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
 *  (basic or premium — the only paid plans) that hasn't ended yet. The end
 *  date matters most for the 7-day free trial, which stops exactly on time;
 *  the server applies the same rule (requireActivePlan). */
export function isSubscribed(profile) {
  const end = profile?.current_period_end ? new Date(profile.current_period_end) : null;
  return (
    ["active", "trialing"].includes(profile?.subscription_status) &&
    ["basic", "premium"].includes(profile?.plan) &&
    (!end || end > new Date())
  );
}

/** End of the plan time the account still has (free trial or paid), or null.
 *  Paying adds the new time after this (paidTimeStartsAt on the server). */
export function timeLeftUntil(profile, now = new Date()) {
  const end = profile?.current_period_end ? new Date(profile.current_period_end) : null;
  return isSubscribed(profile) && end && end > now ? end : null;
}

/** Days left in a free trial, rounded up (1 on the last day; 0 once it has
 *  ended), or null if not in one. 3.5 days left reads as 4, not 3. */
export function trialDaysLeft(profile) {
  if (profile?.subscription_status !== "trialing" || !profile?.current_period_end) return null;
  const ms = new Date(profile.current_period_end) - new Date();
  return ms > 0 ? Math.ceil(ms / 86400000) : 0;
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
