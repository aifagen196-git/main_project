import Razorpay from "razorpay";
import crypto from "node:crypto";

// Server-side source of truth for plan pricing (USD). Amounts are in the
// smallest currency unit (cents) as Razorpay requires. Each plan has exactly
// one fixed price and billing period — there is no monthly/annual toggle, so
// billingCycle is derived from the plan here rather than trusted from the
// client (a request can't pay the "basic" amount and have it recorded, and
// later billed, as "premium").
//
// MUST stay in sync with frontend/src/utils/plan.js's PLANS (display) and
// supabase/migrations/0009_plan_tiers.sql's consume_ai_usage() (usage caps).
const PRICING = {
  basic: { amount: 210, billingCycle: "monthly" },
  premium: { amount: 2499, billingCycle: "semiannual" },
};

const CURRENCY = process.env.RAZORPAY_CURRENCY || "USD";

let _client;
function client() {
  if (!_client) {
    _client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _client;
}

export function planAmount(plan) {
  const p = PRICING[plan];
  if (!p) throw new Error("Unknown plan");
  return Math.round(p.amount * 100); // cents
}

/** The plan's fixed billing period — the only value ever written to
 *  profiles.billing_cycle, regardless of what a client sends. */
export function planBillingCycle(plan) {
  const p = PRICING[plan];
  if (!p) throw new Error("Unknown plan");
  return p.billingCycle;
}

export async function createOrder({ plan, userId }) {
  const amount = planAmount(plan);
  const billingCycle = planBillingCycle(plan);
  return client().orders.create({
    amount,
    currency: CURRENCY,
    receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
    notes: { plan, billingCycle, userId },
  });
}

/** Verifies the checkout signature returned to the browser. */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Verifies a webhook payload signature (raw request body). */
export function verifyWebhookSignature(rawBody, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
