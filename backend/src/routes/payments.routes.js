import express from "express";
import { supabase } from "../config/supabase.js";
import {
  createOrder,
  verifyPaymentSignature,
} from "../services/payments/razorpay.service.js";

const router = express.Router();

const PAID_PLANS = new Set(["professional", "career_accelerator"]);

// Activate the free plan (no payment). Only from 'none'/'free', and never for
// a user who already has a paid plan.
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

// Create a Razorpay order for a paid plan. Amount is derived server-side.
router.post("/order", async (req, res) => {
  const { plan, billingCycle = "monthly" } = req.body || {};
  if (!PAID_PLANS.has(plan)) {
    return res.status(400).json({ success: false, message: "Invalid plan" });
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

// Verify the payment signature from checkout, then activate the plan.
// Service-role update bypasses the profiles billing-protection trigger.
router.post("/verify", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
    billingCycle = "monthly",
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
      billing_cycle: billingCycle,
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
