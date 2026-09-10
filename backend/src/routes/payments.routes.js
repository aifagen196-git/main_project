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
// frontend/src/utils/plan.js for display copy. No free tier: profiles.plan
// starts at 'none' and stays there until checkout completes.
const VALID_PAIRS = new Set(["basic:monthly", "basic:semiannual", "premium:semiannual"]);

// DEAD (UNREACHABLE FROM THE UI) — Pricing.jsx no longer offers a free plan,
// so nothing calls this anymore. Left mounted (harmless, still auth-gated) in
// case a free tier returns, and because any account that activated it while
// it was live still legitimately holds plan='free' and this is the only
// documented path that ever set that state.
router.post("/free", async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ plan: "free", subscription_status: "active", billing_cycle: null })
    .eq("id", req.user.id)
    .in("plan", ["none", "free"])
    .select()
    .maybeSingle();

  if (error) {
    console.error("Free plan activation failed", error);
    return res.status(500).json({ success: false, message: "Could not activate free plan" });
  }
  if (!data) {
    return res.status(409).json({ success: false, message: "Free plan not available for this account" });
  }
  return res.json({ success: true, profile: data });
});

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

  const { plan, billingCycle, userId } = notes;
  // The order must belong to the same user completing checkout — otherwise
  // a valid signature for someone else's order could activate a plan on
  // this account (or vice versa) if an order id ever leaked.
  if (!VALID_PAIRS.has(`${plan}:${billingCycle}`) || userId !== req.user.id) {
    return res.status(400).json({ success: false, message: "Order does not match this account" });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      plan,
      subscription_status: "active",
      billing_cycle: billingCycle,
      current_period_end: periodEndFor(billingCycle),
      razorpay_payment_id,
      razorpay_order_id,
    })
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) {
    console.error("Plan activation failed", error);
    return res.status(500).json({ success: false, message: "Could not activate plan" });
  }

  invalidatePlanCache(req.user.id);
  return res.json({ success: true, profile: data });
});

export default router;
