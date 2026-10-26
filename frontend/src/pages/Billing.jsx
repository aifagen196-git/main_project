import { useNavigate } from "react-router-dom";
import { Rocket, Crown, Star, Mail } from "lucide-react";

import { PLAN_LABEL, isPaidPlan } from "../utils/plan";
import { SUPPORT_EMAIL } from "../data/site";

/* Billing: the current plan and when access ends. Plans never renew, so
 * there is nothing to cancel. Changing plan goes through the Pricing screen
 * (Razorpay checkout); anything else is by email to SUPPORT_EMAIL.
 */

const B = {
  brand: "#6D4AFF",
  clay: "#F43F5E",
  amber: "#F59E0B",
  emerald: "#22C55E",
  ink: "var(--ink)",
  page: "var(--surface-2)",
  line: "var(--line)",
  body: "var(--ink-2)",
  muted: "var(--ink-2)",
  faint: "var(--ink-3)",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const STATUS_META = {
  active: { label: "Active", color: B.emerald },
  trialing: { label: "Trial active", color: B.brand },
  past_due: { label: "Payment due", color: B.amber },
  canceled: { label: "Canceled", color: B.faint },
  inactive: { label: "No active plan", color: B.faint },
};

const BILLING_CYCLE_LABEL = {
  monthly: "Monthly plan",
  semiannual: "One-time payment",
};


export default function Billing({ profile }) {
  const navigate = useNavigate();
  const plan = profile?.plan || "none";
  const status = profile?.subscription_status || "inactive";
  const paid = isPaidPlan(plan);
  const Icon = plan === "premium" ? Crown : plan === "basic" ? Rocket : Star;
  const meta = STATUS_META[status] || STATUS_META.inactive;

  const renew = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Question about my AIFAGen plan",
  )}&body=${encodeURIComponent(
    `\n\n—\nAccount: ${profile?.email || "unknown"}\nPlan: ${PLAN_LABEL[plan] || plan}`,
  )}`;

  return (
    <div>
      {/* ---------------- HEADER ---------------- */}
      <div style={{ animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) both" }}>
        <div
          style={{
            fontFamily: B.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: B.faint,
          }}
        >
          Billing
        </div>
        <h1
          style={{
            fontFamily: B.display,
            fontSize: "clamp(28px,3.4vw,40px)",
            lineHeight: 1.04,
            letterSpacing: "-.035em",
            fontWeight: 700,
            margin: "12px 0 0",
            color: B.ink,
          }}
        >
          Plan &amp; billing
        </h1>
        <p style={{ margin: "9px 0 0", fontSize: 15, color: B.muted }}>
          What you're on, and how to change it.
        </p>
      </div>

      {/* ---------------- PLAN SUMMARY ---------------- */}
      <div
        style={{
          marginTop: 26,
          background: "var(--inverse)",
          borderRadius: 20,
          padding: 28,
          color: "var(--on-inverse)",
          position: "relative",
          overflow: "hidden",
          animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .08s both",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -70,
            right: -50,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(109,74,255,.25)",
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontFamily: B.mono,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                background: "rgba(255,255,255,.12)",
                borderRadius: 20,
                padding: "6px 12px",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: meta.color,
                }}
              />
              {meta.label}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 14,
                fontFamily: B.display,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-.02em",
              }}
            >
              <Icon size={24} />
              {PLAN_LABEL[plan] || "No plan"}
            </div>
            {profile?.billing_cycle && (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#B9C2D6" }}>
                {BILLING_CYCLE_LABEL[profile.billing_cycle] || profile.billing_cycle}
              </p>
            )}
          </div>

          {renew && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, color: "#B9C2D6" }}>
                {/* Plans are one-time payments; nothing renews automatically. */}
                Access until
              </div>
              <div
                style={{
                  fontFamily: B.mono,
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  marginTop: 3,
                }}
              >
                {renew}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: "relative", marginTop: 22 }}>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              background: B.page,
              border: "none",
              borderRadius: 12,
              padding: "12px 20px",
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: "inherit",
              color: B.ink,
              cursor: "pointer",
            }}
          >
            {paid ? "Change plan" : "See plans"}
          </button>
        </div>
      </div>

      {/* ---------------- HOW TO CHANGE SOMETHING ---------------- */}
      <div
        style={{
          marginTop: 16,
          background: "var(--surface)",
          border: `1px solid ${B.line}`,
          borderRadius: 20,
          padding: 26,
          boxShadow: "0 1px 2px rgba(15,23,42,.04)",
          animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .16s both",
        }}
      >
        <h2
          style={{
            fontFamily: B.display,
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: "-.02em",
            margin: 0,
            color: B.ink,
          }}
        >
          Need to change something?
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: B.ink }}>
              Change or renew your plan
            </div>
            <p style={{ margin: "5px 0 0", fontSize: 13, lineHeight: 1.6, color: B.muted }}>
              Head to Plans &amp; pricing — a new plan runs a new checkout and
              takes effect right away.
            </p>
            <button
              onClick={() => navigate("/pricing")}
              style={{
                marginTop: 12,
                background: B.page,
                border: `1px solid ${B.line}`,
                borderRadius: 10,
                padding: "9px 15px",
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: "inherit",
                color: B.ink,
                cursor: "pointer",
              }}
            >
              View plans
            </button>
          </div>

          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: B.ink }}>
              Nothing renews automatically
            </div>
            <p style={{ margin: "5px 0 0", fontSize: 13, lineHeight: 1.6, color: B.muted }}>
              Your plan simply ends on its end date — we never charge you again.
              Questions about a payment? Email us.
            </p>
            <a
              href={mailHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginTop: 12,
                background: "var(--surface)",
                border: "1px solid #FFD3DB",
                borderRadius: 10,
                padding: "9px 15px",
                fontSize: 12.5,
                fontWeight: 700,
                color: B.clay,
                textDecoration: "none",
              }}
            >
              <Mail size={13} /> Email us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
