import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PLAN_LABEL } from "../../utils/plan";

/* Help & Support panel, opened from the sidebar.
 *
 * Deliberately built only from things that actually work: the answers describe
 * this product's real behaviour, the shortcuts route to real screens, and the
 * contact links are mailto:/tel: which hand off to the user's own mail or phone
 * app. There is no contact form here — the app has no mail-sending backend, and
 * a form that silently discarded a support request would be worse than no form.
 */

const H = {
  brand: "#6D4AFF",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  lineMid: "#DDE3EE",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const SUPPORT_EMAIL = "info@aifagenlabs.com";
const SUPPORT_PHONE = "+1 (475) 224-0417";
const SUPPORT_PHONE_HREF = "+14752240417";

// Answers describe how the product actually behaves today.
const FAQS = [
  {
    q: "How are jobs matched to me?",
    a: "Matching runs off your resume — your skills, titles and years of experience are scored against each role. There is no separate preferences form: to change what you get matched with, upload an updated resume on the Resume screen.",
  },
  {
    q: "What does the “Stretch” tag mean?",
    a: "It marks a role scoring below 70. You don't clearly meet everything listed, but it's close enough to be worth a look — a reach rather than a safe match.",
  },
  {
    q: "How do I track an application?",
    a: "Press “I applied” on any match, or add one by hand on the Applications screen. Nothing is detected automatically, so move a row through interviewing, assessment, offer or closed yourself using its status dropdown.",
  },
  {
    q: "My matches don't look right.",
    a: "Matching only sees what your resume says. If a role family or seniority looks wrong, check that your resume states it plainly, replace it on the Resume screen, then use “Re-run matching” on Job Matches.",
  },
  {
    q: "How do I change or cancel my plan?",
    a: "Open Settings and use the plan card, or Billing for invoices. To cancel, email support and we'll take care of it.",
  },
];

export default function HelpPanel({ open, onClose, profile, plan }) {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  // Close on Escape, and stop the page behind from scrolling while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Pre-fill the support mail with context the user can see and edit before
  // sending — nothing is transmitted by opening their mail client.
  const mailBody = [
    "",
    "",
    "—",
    "Sent from AIFAGen",
    `Account: ${profile?.email || "unknown"}`,
    `Plan: ${PLAN_LABEL[plan] || plan || "unknown"}`,
  ].join("\n");
  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "AIFAGen support request",
  )}&body=${encodeURIComponent(mailBody)}`;

  const goto = (path) => {
    onClose();
    navigate(path);
  };

  const shortcut = {
    background: H.page,
    border: `1px solid ${H.line}`,
    borderRadius: 11,
    padding: "10px 13px",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    color: H.body,
    cursor: "pointer",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help and support"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(15,23,42,.42)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "v3FadeIn .18s ease both",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "86vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 22,
          padding: 26,
          boxShadow: "0 40px 80px -32px rgba(15,23,42,.5)",
          animation: "riseIn .28s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: H.mono,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: H.faint,
              }}
            >
              Help &amp; Support
            </div>
            <h2
              style={{
                fontFamily: H.display,
                fontSize: 23,
                fontWeight: 700,
                letterSpacing: "-.03em",
                margin: "10px 0 0",
                color: H.ink,
              }}
            >
              How can we help?
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help"
            className="v3-iconbtn"
            style={{
              background: "#fff",
              border: `1px solid ${H.line}`,
              borderRadius: 10,
              padding: "6px 10px",
              fontSize: 15,
              lineHeight: 1,
              color: H.muted,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* ---- Shortcuts ---- */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
          <button onClick={() => goto("/resume")} style={shortcut}>
            Update my resume
          </button>
          <button onClick={() => goto("/applications")} style={shortcut}>
            My applications
          </button>
          <button onClick={() => goto("/settings")} style={shortcut}>
            Account settings
          </button>
        </div>

        {/* ---- FAQs ---- */}
        <div style={{ marginTop: 22 }}>
          {FAQS.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={f.q}
                style={{ borderBottom: `1px solid ${H.lineSoft}` }}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "transparent",
                    border: "none",
                    padding: "14px 2px",
                    textAlign: "left",
                    fontSize: 14,
                    fontFamily: "inherit",
                    fontWeight: 700,
                    color: H.ink,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ flex: 1 }}>{f.q}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      fontSize: 15,
                      color: isOpen ? H.brand : H.faint,
                      transition: "transform .2s",
                      transform: isOpen ? "rotate(45deg)" : "none",
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p
                    style={{
                      margin: "0 2px 15px",
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: H.muted,
                      animation: "expand .28s cubic-bezier(.2,.7,.2,1) both",
                    }}
                  >
                    {f.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ---- Contact ---- */}
        <div
          style={{
            marginTop: 22,
            background: H.ink,
            borderRadius: 17,
            padding: 20,
            color: H.page,
          }}
        >
          <div
            style={{
              fontFamily: H.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: H.faint,
            }}
          >
            Still stuck?
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: H.faint,
            }}
          >
            Mail us and describe what you were doing when it went wrong — that
            gets to an answer fastest.
          </p>
          <a
            href={mailHref}
            className="v3-btn-light"
            style={{
              display: "block",
              width: "100%",
              marginTop: 15,
              background: H.page,
              borderRadius: 11,
              padding: 12,
              fontSize: 13.5,
              fontWeight: 700,
              color: H.ink,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Email {SUPPORT_EMAIL}
          </a>
          <a
            href={`tel:${SUPPORT_PHONE_HREF}`}
            style={{
              display: "block",
              marginTop: 12,
              fontFamily: H.mono,
              fontSize: 12.5,
              fontWeight: 700,
              color: H.page,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            {SUPPORT_PHONE}
          </a>
        </div>
      </div>
    </div>
  );
}
