import express from "express";
import {
  COMMUNITY_PRICE,
  createCommunityOrder,
  fetchOrder,
  verifyPaymentSignature,
} from "../services/payments/razorpay.service.js";

// Paid entry to the WhatsApp community. Public (no login): visitors pay
// $2.99 on the landing page and get the invite link back. The link lives only
// in the server env (COMMUNITY_WHATSAPP_URL) so it never ships in the
// frontend bundle.
const router = express.Router();

function inviteLink() {
  const url = process.env.COMMUNITY_WHATSAPP_URL;
  return url && url.startsWith("https://chat.whatsapp.com/") ? url : null;
}

router.post("/order", async (req, res) => {
  if (!inviteLink()) {
    console.error("COMMUNITY_WHATSAPP_URL not set — community checkout disabled");
    return res.status(503).json({ success: false, message: "Community sign-up is unavailable right now." });
  }
  try {
    const order = await createCommunityOrder();
    return res.json({ success: true, order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    console.error("Community order failed", e);
    return res.status(502).json({ success: false, message: "Could not start checkout" });
  }
});

// Returns the invite link once the payment is proven. Re-posting the same
// paid order just returns the link again, which only ever reveals it to
// someone who already paid — so no replay bookkeeping is needed.
router.post("/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing payment fields" });
  }
  if (
    !verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })
  ) {
    return res.status(400).json({ success: false, message: "Invalid payment signature" });
  }

  let order;
  try {
    order = await fetchOrder(razorpay_order_id);
  } catch (e) {
    console.error("Could not fetch community order", e);
    return res.status(502).json({ success: false, message: "Could not verify payment" });
  }
  // A plan order's signature is just as valid — make sure this one was
  // created for the community fee.
  if (order?.notes?.purpose !== "community" || order.amount !== Math.round(COMMUNITY_PRICE * 100)) {
    return res.status(400).json({ success: false, message: "This payment is not for the community" });
  }

  const link = inviteLink();
  if (!link) return res.status(503).json({ success: false, message: "Community sign-up is unavailable right now." });
  return res.json({ success: true, link });
});

export default router;
