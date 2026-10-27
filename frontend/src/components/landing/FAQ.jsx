import { useState } from "react";
import { V3 } from "./theme";
import { useRevealChildren } from "./motion";

const FAQS = [
  {
    q: "Can I change my plan later?",
    a: "Yes. Pick a new plan any time from Billing — it applies right away, and any time you have left is kept. Plans never renew automatically, so there's nothing to cancel.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. New accounts can try Basic free for 7 days, once. After that, you pay once when you choose a plan, and it never renews automatically.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major credit and debit cards, processed securely by Razorpay.",
  },
];

export default function FAQ() {
  const [faq, setFaq] = useState(0);
  const faqRef = useRevealChildren("stagger");

  return (
    <section
      id="faq"
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "clamp(56px,7vw,96px) 24px",
      }}
    >
      <h2
        style={{
          fontFamily: V3.display,
          fontSize: "clamp(28px,3.2vw,40px)",
          lineHeight: 1.05,
          letterSpacing: "-.035em",
          fontWeight: 700,
          margin: 0,
          color: V3.ink,
        }}
      >
        Frequently asked questions
      </h2>
      <div
        ref={faqRef}
        style={{ marginTop: 34, borderTop: `1px solid ${V3.line}` }}
      >
        {FAQS.map((f, i) => (
          <div key={f.q} style={{ borderBottom: `1px solid ${V3.line}` }}>
            <button
              onClick={() => setFaq((p) => (p === i ? -1 : i))}
              aria-expanded={faq === i}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "22px 4px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: V3.display,
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: "-.02em",
                  color: V3.ink,
                }}
              >
                {f.q}
              </span>
              <span
                style={{
                  fontFamily: V3.mono,
                  fontSize: 18,
                  fontWeight: 700,
                  color: V3.brand,
                  transition: "transform .3s cubic-bezier(.2,.7,.2,1)",
                  transform: faq === i ? "rotate(45deg)" : "none",
                }}
              >
                +
              </span>
            </button>
            {faq === i && (
              <p
                style={{
                  margin: 0,
                  padding: "0 44px 24px 4px",
                  fontSize: 14.5,
                  lineHeight: 1.65,
                  color: V3.muted,
                  animation: "v3FadeIn .3s ease both",
                }}
              >
                {f.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
