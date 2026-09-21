import Razorpay from "razorpay";
import crypto from "node:crypto";

// Server-side source of truth for plan pricing (USD). Amounts are in the
// smallest currency unit (cents) as Razorpay requires.
//
// Basic has two selectable billing cycles (same features either way — see
// PLAN_LIMITS in frontend/src/utils/plan.js and consume_ai_usage() in
// supabase/migrations/0009_plan_tiers.sql, both keyed on plan alone, not
// cycle). Premium has exactly one.
//
// MUST stay in sync with frontend/src/utils/plan.js's PRICING_CARDS (display).
export const PRICING = {
  basic: { monthly: 210, semiannual: 1299 },
  premium: { semiannual: 2499 },
};

// Monthly-equivalent price per plan+cycle, for the admin MRR figure.
export function monthlyEquivalent(plan, billingCycle) {
  const price = PRICING[plan]?.[billingCycle];
  if (!price) return 0;
  return billingCycle === "semiannual" ? price / 6 : price;
}

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

export function planAmount(plan, billingCycle) {
  const cents = PRICING[plan]?.[billingCycle];
  if (!cents) throw new Error("Unknown plan/billing cycle combination");
  return Math.round(cents * 100);
}

export async function createOrder({ plan, billingCycle, userId }) {
  const amount = planAmount(plan, billingCycle); // throws on an invalid pair
  return client().orders.create({
    amount,
    currency: CURRENCY,
    receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
    notes: { plan, billingCycle, userId },
  });
}

/**
 * Fetches the order back from Razorpay and returns its notes — the plan,
 * billingCycle and userId it was actually created for.
 *
 * /verify (payments.routes.js) uses this instead of trusting whatever plan/
 * billingCycle the browser sends back alongside the payment IDs. The HMAC
 * signature proves the payment belongs to this order, but says nothing about
 * what a client CLAIMS that order was for — and now that Basic has two valid
 * prices, a client could otherwise pay the cheaper one and claim the pricier
 * cycle got activated. The order's own notes, set server-side at creation,
 * are the only trustworthy source for what was actually paid.
 */
export async function fetchOrderNotes(orderId) {
  const order = await client().orders.fetch(orderId);
  return order.notes || {};
}

/**
 * Lists payments from the Razorpay account (admin Payments panel).
 *
 * Razorpay is the source of truth here: profiles only keeps the LAST
 * razorpay_payment_id per user, so it can't show a real transaction history,
 * failed attempts, or refunds. `from`/`to` are unix seconds; `count` caps at
 * 100 per the API.
 */
export async function listPayments({ from, to, count = 100, skip = 0 } = {}) {
  const params = { count: Math.min(100, Math.max(1, count)), skip: Math.max(0, skip) };
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await client().payments.all(params);
  return res?.items || [];
}

/**
 * Refunds a captured payment. `amount` is in the major unit (dollars) and is
 * converted here; omit it for a full refund. Razorpay rejects a refund on an
 * uncaptured or already-refunded payment, so the caller surfaces its error
 * rather than guessing.
 */
export async function refundPayment(paymentId, { amount, notes } = {}) {
  const payload = {};
  if (amount != null) payload.amount = Math.round(Number(amount) * 100);
  if (notes) payload.notes = notes;
  return client().payments.refund(paymentId, payload);
}

/**
 * Constant-time compare of two hex strings. `crypto.timingSafeEqual` throws a
 * RangeError when the buffers differ in length, so a caller passing a
 * wrong-length signature (or garbage) would otherwise crash the route with an
 * unhandled exception → 500 + HTML stack trace. Length mismatch simply means
 * "not a match" here.
 */
function safeHexEqual(a, b) {
  const bufA = Buffer.from(String(a), "hex");
  const bufB = Buffer.from(String(b), "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Verifies the checkout signature returned to the browser. */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("RAZORPAY_KEY_SECRET not set — cannot verify payment signature");
    return false;
  }
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return safeHexEqual(expected, signature);
  } catch (e) {
    console.error("Payment signature verification error", e.message);
    return false;
  }
}

/** Verifies a webhook payload signature (raw request body). */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || secret === "REPLACE_WITH_RAZORPAY_WEBHOOK_SECRET") {
    console.error(
      "RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook. " +
        "Set the real value from Razorpay Dashboard > Settings > Webhooks.",
    );
    return false;
  }
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return safeHexEqual(expected, signature);
  } catch (e) {
    console.error("Webhook signature verification error", e.message);
    return false;
  }
}
