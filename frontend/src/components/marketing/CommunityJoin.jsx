import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

import { joinCommunity } from "../../services/community";
import ConfirmPayment from "../ConfirmPayment";

const STORE_KEY = "aifagen.communityLink";
const PRICE = "$2.99";

function readStored() {
  try {
    return localStorage.getItem(STORE_KEY) || "";
  } catch {
    return "";
  }
}

const buttonStyle = (brand) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  marginTop: 26,
  background: brand,
  border: 0,
  borderRadius: 13,
  padding: "16px 28px",
  fontSize: 15,
  fontWeight: 700,
  color: "#fff",
  textDecoration: "none",
  cursor: "pointer",
  boxShadow: "0 10px 24px -12px rgba(109,74,255,.45)",
  transition: "transform .18s,box-shadow .18s",
});

/* Join button for the landing page's community section. Paying reveals the
   WhatsApp invite link; it's remembered on this device so a returning payer
   isn't asked to pay again. */
export default function CommunityJoin({ brand, faint }) {
  const [link, setLink] = useState(readStored);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function pay() {
    setConfirming(false);
    setBusy(true);
    setError("");
    try {
      const url = await joinCommunity();
      try {
        localStorage.setItem(STORE_KEY, url);
      } catch {
        /* storage blocked — the link is still shown below */
      }
      setLink(url);
    } catch (e) {
      if (e?.message !== "Checkout cancelled") setError(e?.message || "Payment failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const note = { marginTop: 12, fontSize: 12.5, color: faint };

  if (link) {
    return (
      <>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={buttonStyle(brand)}
          className="v3-join-cta"
        >
          <MessageSquare size={18} />
          Open the WhatsApp Community
        </a>
        <div style={note}>You're in — thanks for joining.</div>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setConfirming(true);
        }}
        disabled={busy}
        style={{ ...buttonStyle(brand), opacity: busy ? 0.75 : 1 }}
        className="v3-join-cta"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
        Join the Community — {PRICE}
      </button>
      <div style={note}>One-time payment of {PRICE}. No spam, ever.</div>
      {error && <div style={{ ...note, color: "#dc2626" }}>{error}</div>}
      {confirming && (
        <ConfirmPayment
          title="Join the community"
          lines={[
            ["Item", "Job Seeker Community access"],
            ["Payment", "One-time"],
          ]}
          total={PRICE}
          note="After payment you'll get the link to join our WhatsApp community. No account needed."
          onConfirm={pay}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
