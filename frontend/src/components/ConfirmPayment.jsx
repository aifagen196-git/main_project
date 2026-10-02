import { useEffect } from "react";
import { Lock, X } from "lucide-react";

const brand = "#6D4AFF";

/* Order summary shown before Razorpay opens, so a click on a price never
   jumps straight into a payment form. `lines` are [label, value] rows. */
export default function ConfirmPayment({ title, lines, total, note, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-payment-title"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,23,42,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface, #fff)",
          color: "var(--ink, #0f172a)",
          borderRadius: 20,
          padding: 26,
          boxShadow: "0 30px 70px -20px rgba(15,23,42,.45)",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2
            id="confirm-payment-title"
            style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-.02em" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--ink-3, #64748b)",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 14,
            padding: "6px 16px",
          }}
        >
          {lines.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                fontSize: 14,
                borderBottom: "1px solid var(--line-soft, #f1f5f9)",
              }}
            >
              <span style={{ color: "var(--ink-2, #475569)" }}>{label}</span>
              <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            <span>Total due today</span>
            <span>{total}</span>
          </div>
        </div>

        {note && (
          <p style={{ margin: "14px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2, #475569)" }}>
            {note}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              background: "transparent",
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: 12,
              padding: 13,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            style={{
              flex: 2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: brand,
              border: 0,
              borderRadius: 12,
              padding: 13,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Lock size={15} /> Continue to payment
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 11.5, textAlign: "center", color: "var(--ink-3, #64748b)" }}>
          You'll be taken to Razorpay's secure checkout.
        </div>
      </div>
    </div>
  );
}
