import express from "express";
import { supabase } from "../config/supabase.js";
import {
  createOrder,
  verifyPaymentSignature,
  planBillingCycle,
} from "../services/payments/razorpay.service.js";

const router = express.Router();

// Two paid tiers, one fixed price + billing period each — see
// razorpay.service.js's PRICING for the amounts (source of truth) and
// frontend/src/utils/plan.js for display copy. No free tier: profiles.plan
// starts at 'none' and stays there until checkout completes.
const PAID_PLANS = new Set(["basic", "premium"]);

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

// Create a Razorpay order for a paid plan. Amount AND billing cycle are both
// derived server-side from the plan id (razorpay.service.js) — a client
// can't request "basic" pricing while claiming a "premium" billing cycle.
router.post("/order", async (req, res) => {
  const { plan } = req.body || {};
  if (!PAID_PLANS.has(plan)) {
    return res.status(400).json({ success: false, message: "Invalid plan" });
  }

  try {
    const order = await createOrder({ plan, userId: req.user.id });
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

// Verify the payment signature from checkout, then activate the plan.
// Service-role update bypasses the profiles billing-protection trigger.
router.post("/verify", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
  } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !PAID_PLANS.has(plan)) {
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

  const { data, error } = await supabase
    .from("profiles")
    .update({
      plan,
      subscription_status: "active",
      // Derived from the plan, same as /order — never trust a client-supplied
      // billing cycle for what actually gets stored/billed.
      billing_cycle: planBillingCycle(plan),
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

  return res.json({ success: true, profile: data });
});

export default router;
