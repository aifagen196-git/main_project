import { api } from "./api";
import { loadRazorpay } from "./subscription";

/**
 * One-time $2.99 checkout for the WhatsApp community. No account needed:
 * the backend checks the payment and only then returns the invite link,
 * which never ships in the frontend bundle. Resolves with the link.
 */
export async function joinCommunity() {
  const Razorpay = await loadRazorpay();
  const { order, keyId } = await api.post("/api/community/order", {});

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "AIFAGen",
      description: "Job Seeker Community access",
      handler: async (response) => {
        try {
          const { link } = await api.post("/api/community/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve(link);
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => reject(new Error("Checkout cancelled")) },
    });
    rzp.on("payment.failed", (resp) =>
      reject(new Error(resp?.error?.description || "Payment failed")),
    );
    rzp.open();
  });
}
