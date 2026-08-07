import Razorpay from "razorpay";
import crypto from "node:crypto";

// Server-side source of truth for plan pricing (USD). Annual is billed once
// per year at the discounted monthly rate × 12. Amounts are in the smallest
// currency unit (cents) as Razorpay requires.
const PRICING = {
  professional: { monthly: 19, annual: 15 * 12 },
  career_accelerator: { monthly: 49, annual: 39 * 12 },
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

export function planAmount(plan, billingCycle) {
  const p = PRICING[plan];
  if (!p) throw new Error("Unknown plan");
  const dollars = billingCycle === "annual" ? p.annual : p.monthly;
  return Math.round(dollars * 100); // cents
}

export async function createOrder({ plan, billingCycle, userId }) {
  const amount = planAmount(plan, billingCycle);
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
