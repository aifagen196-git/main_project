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
 * @param {"professional"|"career_accelerator"} plan
 * @param {"monthly"|"annual"} billingCycle
 */
export async function startCheckout(plan, billingCycle = "monthly") {
  const Razorpay = await loadRazorpay();
  const { order, keyId } = await api.post("/api/payments/order", {
    plan,
    billingCycle,
  });

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "AIFAGen",
      description: `${plan} (${billingCycle})`,
      handler: async (response) => {
        try {
          const result = await api.post("/api/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan,
            billingCycle,
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

/**
 * Razorpay has no hosted billing portal like Stripe. Direct users to support
 * to manage/cancel until a self-serve management flow is built.
 */
export async function openBillingPortal() {
  throw new Error(
    "To manage or cancel your subscription, please contact info@aifagenlabs.com.",
  );
}

/** Activates the free plan for the current user (no payment). */
export async function selectFreePlan() {
  const { profile } = await api.post("/api/payments/free", {});
  return profile;
}
