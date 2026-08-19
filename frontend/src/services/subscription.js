import { api } from "./api";

// Loads the Razorpay checkout script once.
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

/**
 * Starts Razorpay checkout for a paid plan. Creates an order on the backend,
 * opens the Razorpay modal, and verifies the payment server-side (which
 * activates the plan). Resolves once the plan is active.
 *
 * Each plan has exactly one fixed price and billing period — see
 * utils/plan.js's PLANS — so there is no billingCycle argument here; the
 * backend derives it from the plan id (razorpay.service.js) and won't trust
 * one supplied by the client either way.
 *
 * NOTE ON THE "7-DAY FREE TRIAL" CTA COPY (utils/plan.js): this function
 * charges the card immediately on checkout, exactly like before this pass.
 * There is no delayed-first-charge / trial-period mechanism implemented —
 * that would need Razorpay Subscriptions (recurring plans with a
 * trial_period), a materially different integration from the one-time
 * Orders flow this file wraps. Flagged, not silently built or silently
 * dropped from the copy — ask before changing either.
 *
 * @param {"basic"|"premium"} plan
 */
export async function startCheckout(plan) {
  const Razorpay = await loadRazorpay();
  const { order, keyId } = await api.post("/api/payments/order", { plan });

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "AIFAGen",
      description: plan,
      handler: async (response) => {
        try {
          const result = await api.post("/api/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan,
          });
          resolve(result.profile);
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Checkout cancelled")),
      },
    });
    rzp.on("payment.failed", (resp) =>
      reject(new Error(resp?.error?.description || "Payment failed")),
    );
    rzp.open();
  });
}
