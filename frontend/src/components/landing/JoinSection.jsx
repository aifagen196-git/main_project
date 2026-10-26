import { Sparkles, MessageSquare, Bell, HelpCircle } from "lucide-react";
import CommunityJoin from "../marketing/CommunityJoin";
import { V3 } from "./theme";

// Closing call to action and the free WhatsApp community.
export default function JoinSection({ enter }) {
  return (
    <section
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "0 24px clamp(56px,7vw,96px)",
      }}
    >
      <div
        style={{
          background: V3.brand,
          color: V3.onInverse,
          borderRadius: 24,
          padding: "clamp(34px,4vw,56px)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 26,
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <h3
            style={{
              fontFamily: V3.display,
              fontSize: "clamp(26px,3vw,38px)",
              lineHeight: 1.06,
              letterSpacing: "-.035em",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Your dream role is closer than you think.
          </h3>
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 16,
              lineHeight: 1.55,
              color: "rgba(248,249,254,.82)",
              maxWidth: "34em",
            }}
          >
            Join AIFAGen today and take the first step toward the career you
            deserve.
          </p>
        </div>
        <button
          onClick={enter}
          className="v3-btn-light"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: V3.page,
            border: "none",
            borderRadius: 13,
            padding: "17px 27px",
            fontSize: 15,
            fontWeight: 700,
            color: V3.ink,
            cursor: "pointer",
          }}
        >
          Get Your Career Plan <span style={{ fontSize: 17 }}>→</span>
        </button>
      </div>

      <div
        style={{
          marginTop: 24,
          borderRadius: 24,
          padding: "clamp(30px,4vw,44px)",
          textAlign: "center",
          background:
            "radial-gradient(ellipse at top,rgba(109,74,255,.08),transparent 65%),var(--surface-2)",
          border: `1px solid ${V3.line}`,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 18px",
            borderRadius: "50%",
            background: "rgba(109,74,255,.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: V3.brand,
            position: "relative",
          }}
        >
          <MessageSquare size={26} />
          {/* Small "live" indicator — honest signal that this is an active
              space, without claiming a specific member count we don't have
              a real number for. */}
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: V3.brand,
              border: `2px solid ${V3.page}`,
            }}
            className="v3-pulse-dot"
          />
        </div>

        <h3
          style={{
            fontFamily: V3.display,
            fontSize: "clamp(22px,2.6vw,28px)",
            lineHeight: 1.15,
            letterSpacing: "-.03em",
            fontWeight: 700,
            margin: 0,
            color: V3.ink,
          }}
        >
          Join Our Job Seeker Community
        </h3>
        <p
          style={{
            margin: "10px auto 0",
            fontSize: 15.5,
            lineHeight: 1.6,
            color: V3.body,
            maxWidth: "34em",
          }}
        >
          A dedicated space for people on the same job hunt as you —
          not a broadcast channel, an actual community.
        </p>

        {/* Three scannable value props instead of burying them in the
            paragraph above — each is a concrete reason to join, not a
            vague promise. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px 14px",
            marginTop: 22,
          }}
        >
          {[
            [Bell, "Real-time job alerts"],
            [Sparkles, "Career & resume tips"],
            [HelpCircle, "Ask questions anytime"],
          ].map(([Icon, label], i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
                borderRadius: 999,
                background: "var(--surface)",
                border: `1px solid ${V3.line}`,
                fontSize: 13.5,
                fontWeight: 600,
                color: V3.ink,
              }}
            >
              <Icon size={15} style={{ color: V3.brand }} />
              {label}
            </div>
          ))}
        </div>

        <CommunityJoin brand={V3.brand} faint={V3.faint} />
      </div>
    </section>
  );
}
