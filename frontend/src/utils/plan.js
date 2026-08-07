// Central plan definitions + gating helpers used across the app.

export const PLANS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    tagline: "Get started and explore AIFAGen.",
    cta: "Get Started Free",
    popular: false,
    features: [
      "AI Job Matching (5 / day)",
      "Resume Analysis",
      "Basic Interview Prep",
      "Application Tracking",
      "Career Insights",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    monthly: 19,
    annual: 15, // ~20% off, billed yearly
    tagline: "Everything you need to get more interviews.",
    cta: "Start 7-Day Free Trial",
    popular: true,
    features: [
      "Unlimited AI Job Matches",
      "AI Resume Optimization",
      "Advanced Interview Prep",
      "AI Cover Letter Generator",
      "Application Tracking & Analytics",
      "Priority Support",
    ],
  },
  {
    id: "career_accelerator",
    name: "Career Accelerator",
    monthly: 49,
    annual: 39,
    tagline: "For serious professionals who want faster results.",
    cta: "Start 7-Day Free Trial",
    popular: false,
    features: [
      "Everything in Professional",
      "AI Application Automation",
      "Personalized Career Roadmap",
      "Salary Insights & Negotiation",
      "Dedicated Career Coach (AI)",
      "Early Access to New Features",
    ],
  },
];

export const PLAN_LABEL = {
  none: "No plan",
  free: "Free",
  professional: "Professional",
  career_accelerator: "Career Accelerator",
};

// Per-plan capabilities. `aiPerDay = Infinity` means unlimited.
export const PLAN_LIMITS = {
  none: { aiPerDay: 0, advancedAnalytics: false, coverLetters: false, automation: false },
  free: { aiPerDay: 5, advancedAnalytics: false, coverLetters: false, automation: false },
  professional: { aiPerDay: Infinity, advancedAnalytics: true, coverLetters: true, automation: false },
  career_accelerator: { aiPerDay: Infinity, advancedAnalytics: true, coverLetters: true, automation: true },
};

export function planLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.none;
}

/** A user has access to the app once they hold any active/trialing plan. */
export function isSubscribed(profile) {
  return ["active", "trialing"].includes(profile?.subscription_status);
}

export function isPaidPlan(plan) {
  return plan === "professional" || plan === "career_accelerator";
}

// NOTE: AI usage limits (the free-tier daily cap) are enforced ENTIRELY on the
// backend via the consume_ai_usage RPC (backend/src/services/ai/usage.js).
// The frontend does not count or gate usage — it just surfaces the backend's
// 429 ("daily limit reached") if it happens.
