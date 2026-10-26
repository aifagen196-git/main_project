import { Check } from "lucide-react";
import { PRICING_CARDS } from "../../utils/plan";
import { V3, h2Style } from "./theme";

// Same cards as the in-app plan picker (utils/plan.js PRICING_CARDS).
// "Get Started" enters the app; sign-up then lands on the plan picker.
export default function PricingSection({ enter }) {
  return (
    <section
      id="pricing"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(1000px 480px at 50% -10%,rgba(109,74,255,.16),transparent 62%),var(--surface)",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(56px,7vw,96px) 24px 0",
        }}
      >
      <div style={{ position: "relative", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: V3.mono,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: V3.faint,
          }}
        >
          Pricing
        </div>
        <h2 style={h2Style}>Job marketing &amp; interview support</h2>
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 16,
            lineHeight: 1.6,
            color: V3.body,
          }}
        >
          Hands-on help getting your applications, resume, and interviews
          in front of the right people — pick the level of support that
          fits where you are.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 20,
          marginTop: 40,
          alignItems: "start",
        }}
      >
        {PRICING_CARDS.map((p) => (
          <div
            key={`${p.name}-${p.periodTag}`}
            style={{
              position: "relative",
              background: "var(--surface)",
              border: `1.5px solid ${p.popular ? V3.brand : V3.line}`,
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
                  background: V3.brand,
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
                  fontFamily: V3.display,
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  margin: 0,
                  color: V3.ink,
                }}
              >
                {p.name}
              </h3>
              <span
                style={{
                  fontFamily: V3.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: V3.muted,
                  background: V3.page,
                  border: `1px solid ${V3.line}`,
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
                color: V3.muted,
                minHeight: "2.6em",
              }}
            >
              {p.tagline}
            </p>

            <div
              style={{
                fontFamily: V3.mono,
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "-.03em",
                color: V3.ink,
                lineHeight: 1,
                marginTop: 14,
              }}
            >
              ${p.price.toLocaleString("en-US")}
            </div>

            <button
              onClick={enter}
              style={{
                width: "100%",
                marginTop: 20,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: p.popular ? V3.brand : "var(--surface)",
                border: `1px solid ${p.popular ? V3.brand : V3.lineMid}`,
                borderRadius: 12,
                padding: 13,
                fontSize: 13.5,
                fontWeight: 700,
                fontFamily: "inherit",
                color: p.popular ? "#fff" : V3.ink,
                cursor: "pointer",
              }}
            >
              Get Started
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 22 }}>
              {p.featuresIntro && (
                <div style={{ fontSize: 12.5, fontWeight: 700, color: V3.ink }}>
                  {p.featuresIntro}
                </div>
              )}
              {p.features.map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, fontSize: 13, color: V3.body }}>
                  <Check size={16} style={{ color: V3.brand, flexShrink: 0, marginTop: 1 }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p
        style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 13,
          color: V3.faint,
        }}
      >
        Prices in USD. Pay once — plans never renew automatically.
      </p>
      </div>
    </section>
  );
}
