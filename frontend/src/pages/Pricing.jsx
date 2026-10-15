import { useState } from "react";
import { Check, Loader2, LogOut, Shield, CreditCard, Lock, HelpCircle } from "lucide-react";

import { PRICING_CARDS } from "../utils/plan";
import { startCheckout, startFreeTrial } from "../services/subscription";
import { signOut } from "../services/auth";
import ConfirmPayment from "../components/ConfirmPayment";

/* Pricing screen in the "AIFAGen v3" design language.
 *
 * Three cards, no free tier: Basic monthly ($229), Basic one-time payment
 * ($1299 — same features as monthly), and Premium one-time payment ($2499).
 * One-time plans are "semiannual" internally (access is still time-limited
 * server-side), but the UI never shows the period. PRICING_CARDS (utils/plan.js) is the
 * display list; each card carries both `id` (the plan tier) and
 * `billingCycle`, since Basic now has two cards with the same id.
 *
 * Two render modes, unchanged from before this pass:
 *  - onboarding: full-screen gate shown right after account creation, with
 *    its own header (no sidebar exists yet — the user hasn't picked a plan).
 *    With no free tier, this is now the ONLY way into the app for a new
 *    account: checkout must complete before subscription_status becomes
 *    active/trialing (see isSubscribed in utils/plan.js).
 *  - in-app (/pricing route, inside AppShell): plain section, no header,
 *    reached from "Manage subscription" on Billing.
 *
 * Checkout (startCheckout — real Razorpay order + verify flow, see
 * services/subscription.js) charges the card immediately. CTA and body copy
 * now say so plainly — the old "Start 7-Day Free Trial" wording was removed
 * because no delayed-charge / trial-period mechanism exists (that would be a
 * Razorpay Subscriptions integration, not the one-time Orders flow here).
 *
 * Trust strip corrected: it previously said "Payments handled securely by
 * Stripe", but this app's payment processor is Razorpay; there is no Stripe
 * integration anywhere in the codebase.
 */

const P = {
  brand: "#6D4AFF",
  clay: "#F43F5E",
  ink: "var(--ink)",
  page: "var(--surface-2)",
  line: "var(--line)",
  lineMid: "var(--line)",
  body: "var(--ink-2)",
  muted: "var(--ink-2)",
  faint: "var(--ink-3)",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const kicker = {
  fontFamily: P.mono,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: P.faint,
};

export default function Pricing({ profile, refresh, onboarding = false }) {
  const [busy, setBusy] = useState(null); // "id:billingCycle" currently processing
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(null); // card awaiting confirmation
  const currentPlan = profile?.plan;
  const currentCycle = profile?.billing_cycle;

  async function choose(card) {
    const key = `${card.id}:${card.billingCycle}`;
    setPending(null);
    setErr("");
    setBusy(key);
    try {
      await startCheckout(card.id, card.billingCycle); // opens Razorpay, resolves on success
      await refresh?.();
    } catch (e) {
      if (e?.message !== "Checkout cancelled") {
        setErr(e.message || "Something went wrong. Please try again.");
      }
      setBusy(null);
    }
  }

  const monthly = pending?.billingCycle === "monthly";
  // Paying during the free trial keeps the free days: the server starts the
  // paid time when the trial ends (activatePaidPlan).
  const trialEnd =
    profile?.subscription_status === "trialing" && profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()
      ? new Date(profile.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })
      : null;
  const confirm = pending && (
    <ConfirmPayment
      title="Confirm your plan"
      lines={[
        ["Plan", pending.name],
        ["Billing", monthly ? "Monthly" : "One-time payment"],
      ]}
      total={`$${pending.price.toLocaleString("en-US")}`}
      note={
        trialEnd
          ? `You'll be charged once today and your plan unlocks right away. You keep your free days: the paid time starts when your trial ends on ${trialEnd}.`
          : monthly
          ? "You'll be charged once today for one month, and your plan unlocks right after payment. It doesn't renew automatically."
          : "You'll be charged once today and your plan unlocks right after payment."
      }
      onConfirm={() => choose(pending)}
      onCancel={() => setPending(null)}
    />
  );

  const grid = (
    <>
      {confirm}
      <div style={{ textAlign: "center" }}>
        <div style={{ ...kicker, textAlign: "center" }}>Pricing</div>
        <h1
          style={{
            fontFamily: P.display,
            fontSize: "clamp(28px,4vw,42px)",
            lineHeight: 1.05,
            letterSpacing: "-.035em",
            fontWeight: 700,
            margin: "12px 0 0",
            color: P.ink,
          }}
        >
          {onboarding ? "Choose your plan to get started" : "Plans & pricing"}
        </h1>
        <p
          style={{
            margin: "12px auto 0",
            maxWidth: 460,
            fontSize: 15,
            lineHeight: 1.6,
            color: P.muted,
          }}
        >
          {onboarding
            ? profile?.trial_eligible
              ? "Start with a free 7-day trial, or pick a plan to unlock your dashboard now."
              : "Pick a plan to unlock your dashboard. You pay once — nothing renews automatically."
            : profile?.subscription_status === "trialing"
            ? "Enjoying the trial? Pay now and your paid time starts when the free trial ends — you keep your free days."
            : "Change plans anytime. Charges apply immediately for the new plan."}
        </p>
      </div>

      {err && (
        <div
          style={{
            marginTop: 20,
            maxWidth: 460,
            marginLeft: "auto",
            marginRight: "auto",
            background: "var(--rose-wash)",
            border: "1px solid #FFD3DB",
            borderRadius: 13,
            padding: "12px 15px",
            fontSize: 13.5,
            color: P.clay,
            textAlign: "center",
          }}
        >
          {err}
        </div>
      )}

      {profile?.trial_eligible && (
        <TrialOffer
          busy={busy !== null}
          onStart={async () => {
            setErr("");
            setBusy("trial");
            try {
              await startFreeTrial();
              await refresh?.();
            } catch (e) {
              setErr(e.message || "Could not start your trial. Please try again.");
              setBusy(null);
            }
          }}
          starting={busy === "trial"}
        />
      )}

      {profile?.trial_ends_at && !profile?.trial_eligible && new Date(profile.trial_ends_at) <= new Date() && (
        <div
          style={{
            marginTop: 20,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
            background: "var(--brand-wash)",
            borderRadius: 13,
            padding: "12px 15px",
            fontSize: 13.5,
            color: P.ink,
            textAlign: "center",
          }}
        >
          Your free trial ended on{" "}
          <strong>
            {new Date(profile.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </strong>
          . Choose a plan to keep using AIFAGen.
        </div>
      )}

      {/* ---- Plan cards ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 18,
          marginTop: 34,
          alignItems: "start",
        }}
      >
        {PRICING_CARDS.map((p) => {
          const key = `${p.id}:${p.billingCycle}`;
          const isCurrent = currentPlan === p.id && currentCycle === p.billingCycle;
          return (
            <div
              key={key}
              style={{
                position: "relative",
                background: "var(--surface)",
                border: `1.5px solid ${p.popular ? P.brand : P.line}`,
                boxShadow: p.popular
                  ? "0 24px 54px -28px rgba(109,74,255,.4)"
                  : "0 1px 2px rgba(15,23,42,.04)",
                borderRadius: 20,
                padding: 28,
              }}
            >
              {p.popular && (
                <span
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: P.brand,
                    color: "#fff",
                    borderRadius: 20,
                    padding: "5px 13px",
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  Most popular
                </span>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <h3
                  style={{
                    fontFamily: P.display,
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    margin: 0,
                    color: P.ink,
                  }}
                >
                  {p.name}
                </h3>
                <span
                  style={{
                    fontFamily: P.mono,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: P.muted,
                    background: P.page,
                    border: `1px solid ${P.line}`,
                    borderRadius: 20,
                    padding: "3px 9px",
                  }}
                >
                  {p.periodTag}
                </span>
              </div>
              <p
                style={{
                  margin: "7px 0 0",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: P.muted,
                  minHeight: "2.6em",
                }}
              >
                {p.tagline}
              </p>

              <div
                style={{
                  fontFamily: P.mono,
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: "-.03em",
                  color: P.ink,
                  lineHeight: 1,
                  marginTop: 14,
                }}
              >
                ${p.price.toLocaleString("en-US")}
              </div>

              <button
                onClick={() => {
                  setErr("");
                  setPending(p);
                }}
                disabled={busy !== null || isCurrent}
                style={{
                  width: "100%",
                  marginTop: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: isCurrent ? P.page : p.popular ? P.brand : "var(--surface)",
                  border: `1px solid ${isCurrent ? P.line : p.popular ? P.brand : P.lineMid}`,
                  borderRadius: 12,
                  padding: 13,
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  color: isCurrent ? P.muted : p.popular ? "#fff" : P.ink,
                  cursor: busy !== null || isCurrent ? "default" : "pointer",
                  opacity: busy !== null && busy !== key ? 0.55 : 1,
                }}
              >
                {busy === key ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Please wait…
                  </>
                ) : isCurrent ? (
                  "Current plan"
                ) : (
                  p.cta
                )}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 22 }}>
                {p.featuresIntro && (
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: P.ink }}>
                    {p.featuresIntro}
                  </div>
                )}
                {p.features.map((f) => (
                  <div
                    key={f}
                    style={{ display: "flex", gap: 10, fontSize: 13, color: P.body }}
                  >
                    <Check size={16} style={{ color: P.brand, flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Trust strip ---- */}
      <div
        style={{
          marginTop: 36,
          background: "var(--brand-wash)",
          borderRadius: 20,
          padding: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 20,
        }}
      >
        {[
          [Shield, "Full access on day one", "Every feature in your plan, unlocked immediately."],
          [CreditCard, "No auto-renewal", "You pay once per plan — we never charge you again without asking."],
          [Lock, "Secure payments", "Handled by Razorpay, not stored on our servers."],
          [HelpCircle, "Real support", "Email us and a person answers."],
        ].map(([Icon, title, desc]) => (
          <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} style={{ color: P.brand }} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: P.ink }}>{title}</div>
              <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (!onboarding) return <div>{grid}</div>;

  return (
    <div style={{ minHeight: "100vh", background: P.page }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${P.line}`,
          height: 68,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            width: "100%",
            margin: "0 auto",
            padding: "0 clamp(16px,3vw,32px)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img src="/logo.png" alt="AIFAGen" style={{ height: 28, width: 28, objectFit: "contain" }} />
            <span
              style={{
                fontFamily: P.display,
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-.02em",
                color: P.ink,
              }}
            >
              AIFAGen
            </span>
          </div>
          <button
            onClick={() => signOut()}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: "none",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "inherit",
              color: P.muted,
              cursor: "pointer",
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(36px,6vw,64px) clamp(16px,3vw,32px)",
        }}
      >
        {profile?.full_name && (
          <p
            style={{
              textAlign: "center",
              margin: "0 0 8px",
              fontSize: 14,
              color: P.muted,
            }}
          >
            Welcome, {profile.full_name.split(" ")[0]} 👋
          </p>
        )}
        {grid}
      </main>
    </div>
  );
}

/* One-time 7-day free trial, offered only to accounts the server marks as
 * eligible (email verified, never paid, never trialed). Basic features; access
 * ends exactly 7 days after it starts. */
function TrialOffer({ onStart, busy, starting }) {
  const ends = new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return (
    <div
      style={{
        marginTop: 28,
        background: "var(--surface)",
        border: `1.5px dashed ${P.brand}`,
        borderRadius: 20,
        padding: "22px 26px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div style={{ flex: "1 1 320px" }}>
        <div style={{ ...kicker, color: P.brand }}>New here?</div>
        <h3
          style={{
            fontFamily: P.display,
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: "-.02em",
            margin: "8px 0 0",
            color: P.ink,
          }}
        >
          Try AIFAGen free for 7 days
        </h3>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.55, color: P.muted }}>
          Basic plan features, no payment needed. Your trial ends automatically on {ends} — choose a plan any time to keep going.
        </p>
      </div>
      <button
        onClick={onStart}
        disabled={busy}
        style={{
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: P.brand,
          border: "none",
          borderRadius: 12,
          padding: "13px 22px",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "inherit",
          color: "#fff",
          cursor: busy ? "default" : "pointer",
          opacity: busy && !starting ? 0.55 : 1,
        }}
      >
        {starting ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Starting…
          </>
        ) : (
          "Start free trial"
        )}
      </button>
    </div>
  );
}
