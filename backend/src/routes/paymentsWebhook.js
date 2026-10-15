import { fetchOrderNotes, verifyWebhookSignature } from "../services/payments/razorpay.service.js";
import { VALID_PAIRS, activatePaidPlan } from "./payments.routes.js";

// Razorpay webhook. Mounted with express.raw so the body is the exact bytes
// the signature was computed over. Public (no JWT) — authenticity comes from
// the HMAC signature.
export async function razorpayWebhook(req, res) {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.body; // Buffer (express.raw)

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, message: "Bad payload" });
  }

  try {
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity || {};
      const orderId = payment.order_id || event.payload?.order?.entity?.id;
      if (payment.id && orderId) {
        // What the order was for is read back from Razorpay (set server-side
        // at /order). The payment's own notes are empty: checkout sends none.
        // Community orders carry no plan and are skipped here.
        const { userId, plan, billingCycle } = await fetchOrderNotes(orderId);
        if (userId && VALID_PAIRS.has(`${plan}:${billingCycle}`)) {
          await activatePaidPlan({ userId, plan, billingCycle, paymentId: payment.id, orderId });
        }
      }
    }
  } catch (e) {
    // Razorpay retries a failed delivery for up to a day; activation is
    // idempotent (keyed on the payment id), so a retry is safe.
    console.error("Webhook handling error", e);
    return res.status(500).json({ success: false });
  }

  return res.json({ received: true });
}
