import { supabase } from "../config/supabase.js";
import { verifyWebhookSignature } from "../services/payments/razorpay.service.js";
import { periodEndFor } from "./payments.routes.js";
import { invalidatePlanCache } from "../middleware/requireActivePlan.js";

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
      const entity =
        event.payload?.payment?.entity || event.payload?.order?.entity || {};
      const notes = entity.notes || {};
      const { userId, plan, billingCycle } = notes;

      if (userId && plan) {
        const cycle = billingCycle || "monthly";
        await supabase
          .from("profiles")
          .update({
            plan,
            subscription_status: "active",
            billing_cycle: cycle,
            current_period_end: periodEndFor(cycle),
          })
          .eq("id", userId);
        invalidatePlanCache(userId);
      }
    }
  } catch (e) {
    console.error("Webhook handling error", e);
    // Still 200 so Razorpay doesn't retry forever on our internal error.
  }

  return res.json({ received: true });
}
