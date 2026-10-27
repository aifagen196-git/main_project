import express from "express";
import { supabase } from "../config/supabase.js";
import {
  createOrder,
  verifyPaymentSignature,
  fetchOrderNotes,
} from "../services/payments/razorpay.service.js";
import { invalidatePlanCache } from "../middleware/requireActivePlan.js";

const router = express.Router();

// How long a paid term lasts, by billing cycle. Used to stamp
// current_period_end so a plan actually expires (B5) rather than granting
// permanent access off a single payment.
export function periodEndFor(billingCycle, from = new Date()) {
  const d = new Date(from);
  if (billingCycle === "semiannual") d.setMonth(d.getMonth() + 6);
  else d.setMonth(d.getMonth() + 1); // "monthly" / anything else
  return d.toISOString();
}

// Two paid tiers — Basic can be billed monthly or every 6 months (same
// features either way); Premium is 6-monthly only. See razorpay.service.js's
// PRICING for the actual amounts (source of truth) and
// frontend/src/utils/plan.js for display copy. profiles.plan starts at 'none'
// and changes with the free trial (/trial) or a payment.
export const VALID_PAIRS = new Set(["basic:monthly", "basic:semiannual", "premium:semiannual"]);

// Time left on the account's current plan (free trial or paid), or null.
function timeLeftUntil(profile, now = new Date()) {
  const end = profile?.current_period_end ? new Date(profile.current_period_end) : null;
  const running =
    ["active", "trialing"].includes(profile?.subscription_status) &&
    ["basic", "premium"].includes(profile?.plan);
  return running && end && end > now ? end : null;
}

// When newly bought time begins. Paying never loses time: if the account
// still has time left (free trial or a paid plan), the new time is added
// after it; otherwise it starts now.
export function paidTimeStartsAt(profile, now = new Date()) {
  return timeLeftUntil(profile, now) || now;
}

// Premium includes everything in Basic, so buying Basic while Premium runs
// would only downgrade the account.
export function basicWhilePremium(profile, plan, now = new Date()) {
  return plan === "basic" && profile?.plan === "premium" && Boolean(timeLeftUntil(profile, now));
}

// Turns on a paid plan for one Razorpay payment. Used by /verify and by the
// webhook, so whichever arrives first applies it and the other is a no-op
// (same payment id). The plan bought applies right away; its time is added
// after any time left (paidTimeStartsAt).
export async function activatePaidPlan({ userId, plan, billingCycle, paymentId, orderId }) {
  const { data: current, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  if (current.razorpay_payment_id === paymentId) return { profile: current, already: true };

  const from = paidTimeStartsAt(current);

  const { data, error: upErr } = await supabase
    .from("profiles")
    .update({
      plan,
      subscription_status: "active",
      billing_cycle: billingCycle,
      current_period_end: periodEndFor(billingCycle, from),
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
    })
    .eq("id", userId)
    .select()
    .single();
  if (upErr) throw upErr;

  invalidatePlanCache(userId);
  return { profile: data, already: false };
}

// Create a Razorpay order for a plan + billing cycle. The pair is validated
// against VALID_PAIRS, and the actual amount is looked up server-side from
// PRICING (razorpay.service.js) — a client can't request Basic's monthly
// price while claiming the semiannual cycle, or invent a pair that doesn't
// exist.
router.post("/order", async (req, res) => {
  const { plan, billingCycle } = req.body || {};
  if (!VALID_PAIRS.has(`${plan}:${billingCycle}`)) {
    return res.status(400).json({ success: false, message: "Invalid plan/billing cycle" });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("plan, subscription_status, current_period_end")
    .eq("id", req.user.id)
    .single();
  if (profileErr) {
    console.error("Order: profile lookup failed", profileErr);
    return res.status(500).json({ success: false, message: "Could not create order" });
  }
  if (basicWhilePremium(profile, plan)) {
    return res.status(409).json({
      success: false,
      code: "PLAN_INCLUDED",
      message: "Your Premium plan already includes everything in Basic.",
    });
  }

  try {
    const order = await createOrder({ plan, billingCycle, userId: req.user.id });
    return res.json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("Razorpay order failed", e);
    return res.status(502).json({ success: false, message: "Could not create order" });
  }
});

// Verify the payment signature, then activate the plan. Service-role update
// bypasses the profiles billing-protection trigger.
//
// Deliberately does NOT accept plan/billingCycle from the request body. The
// HMAC signature only proves this payment belongs to this order — it says
// nothing about what the CLIENT CLAIMS the order was for, and with Basic now
// having two valid prices, trusting a client-sent cycle here would let
// someone pay the cheaper one and claim the pricier cycle got activated.
// fetchOrderNotes() reads back what the order was actually created for
// (set server-side, in /order above), which is the only trustworthy source.
router.post("/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment fields" });
  }

  const valid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) {
    return res.status(400).json({ success: false, message: "Invalid payment signature" });
  }

  let notes;
  try {
    notes = await fetchOrderNotes(razorpay_order_id);
  } catch (e) {
    console.error("Could not fetch order notes", e);
    return res.status(502).json({ success: false, message: "Could not verify order" });
  }

  const { plan, billingCycle, userId, _createdAt } = notes;
  // Checkout completes within minutes of /order. An old order being
  // "verified" now is a replay of a past payment, not a new purchase.
  if (!_createdAt || Date.now() - _createdAt > 24 * 60 * 60 * 1000) {
    return res.status(400).json({ success: false, message: "This payment has expired. Please start checkout again." });
  }
  // The order must belong to the same user completing checkout — otherwise
  // a valid signature for someone else's order could activate a plan on
  // this account (or vice versa) if an order id ever leaked.
  if (!VALID_PAIRS.has(`${plan}:${billingCycle}`) || userId !== req.user.id) {
    return res.status(400).json({ success: false, message: "Order does not match this account" });
  }

  // A signature stays valid forever, so re-posting the same payment later
  // would otherwise push current_period_end forward again for free.
  // activatePaidPlan treats a payment that's already been applied as a no-op.
  try {
    const { profile, already } = await activatePaidPlan({
      userId: req.user.id,
      plan,
      billingCycle,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
    return res.json({ success: true, profile, ...(already ? { already: true } : {}) });
  } catch (error) {
    console.error("Plan activation failed", error);
    return res.status(500).json({ success: false, message: "Could not activate plan" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/payments/trial — start the one-time 7-day free trial.
//
// Mounted behind requireVerified, so the email is already confirmed.
// The trial is Basic features, status 'trialing', and current_period_end set
// to exactly 7 days from now; requireActivePlan checks that date on every
// request, so access stops at that moment. One trial per account AND per
// sign-up mobile number (trial_claims), so a new email with the same number
// doesn't get another week.
// ---------------------------------------------------------------------------
export const TRIAL_DAYS = 7;

router.post("/trial", async (req, res) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, subscription_status, trial_started_at, razorpay_payment_id, mobile")
    .eq("id", req.user.id)
    .single();
  if (error) {
    console.error("Trial: profile lookup failed", error.message);
    return res.status(500).json({ success: false, message: "Could not start your trial. Please try again." });
  }
  if (profile.trial_started_at) {
    return res.status(409).json({ success: false, code: "TRIAL_USED", message: "You've already used your free trial." });
  }
  if (profile.plan !== "none" || profile.razorpay_payment_id) {
    return res.status(409).json({ success: false, code: "TRIAL_NOT_ELIGIBLE", message: "The free trial is only for new accounts." });
  }

  // One trial per mobile number too (the number given at sign-up). Claim it
  // first: the primary key makes a second claim fail, even if two requests
  // race. Older accounts with no number on file are limited per account only.
  const phone = profile.mobile || null;
  const { error: claimErr } = phone
    ? await supabase.from("trial_claims").insert({ phone, user_id: req.user.id })
    : { error: null };
  if (claimErr) {
    if (claimErr.code === "23505") {
      return res.status(409).json({
        success: false,
        code: "TRIAL_USED",
        message: "A free trial has already been used with this mobile number.",
      });
    }
    console.error("Trial: claim failed", claimErr.message);
    return res.status(500).json({ success: false, message: "Could not start your trial. Please try again." });
  }

  const start = new Date();
  const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const { data, error: upErr } = await supabase
    .from("profiles")
    .update({
      plan: "basic",
      subscription_status: "trialing",
      billing_cycle: null,
      current_period_end: end.toISOString(),
      trial_started_at: start.toISOString(),
      trial_ends_at: end.toISOString(),
    })
    .eq("id", req.user.id)
    .is("trial_started_at", null)
    .select("plan, subscription_status, current_period_end, trial_started_at, trial_ends_at")
    .maybeSingle();
  if (upErr || !data) {
    // Give the number back so the user can retry.
    if (phone) await supabase.from("trial_claims").delete().eq("phone", phone).eq("user_id", req.user.id);
    if (upErr) console.error("Trial: activation failed", upErr.message);
    return res.status(upErr ? 500 : 409).json({
      success: false,
      message: upErr ? "Could not start your trial. Please try again." : "You've already used your free trial.",
    });
  }

  invalidatePlanCache(req.user.id);
  return res.json({ success: true, trial: data });
});

export default router;
