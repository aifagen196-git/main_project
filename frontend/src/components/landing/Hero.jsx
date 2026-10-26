import { useState, useEffect } from "react";
import { V3, v3Kicker, v3Score, prefersReducedMotion } from "./theme";
import { useRamp } from "./motion";

function RotatingWord({ words, interval = 2600 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span
      key={i}
      style={{
        display: "inline-block",
        animation: prefersReducedMotion()
          ? "none"
          : `${i % 2 ? "wordInB" : "wordIn"} .5s cubic-bezier(.2,.7,.2,1) both`,
      }}
    >
      {words[i]}
    </span>
  );
}

const HERO_ROWS = [
  { initial: "S", title: "Senior Product Designer", meta: "Stripe · Remote (US)", score: 95 },
  { initial: "A", title: "Machine Learning Engineer", meta: "Anthropic · San Francisco, CA (Hybrid)", score: 92 },
  { initial: "V", title: "Frontend Engineer", meta: "Vercel · Remote (US)", score: 89 },
];

function HeroFeedCard({ t }) {
  const [tilt, setTilt] = useState(null);
  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -7,
      y: ((e.clientX - r.left) / r.width - 0.5) * 9,
    });
  };
  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={() => setTilt(null)}
      style={{
        position: "relative",
        perspective: 1100,
        animation: "riseIn .9s cubic-bezier(.2,.7,.2,1) .15s both",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: `1px solid ${V3.line}`,
          borderRadius: 22,
          boxShadow:
            "0 1px 2px rgba(15,23,42,.04),0 30px 70px -40px rgba(15,23,42,.3)",
          overflow: "hidden",
          transform: tilt
            ? `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) translateZ(0)`
            : "none",
          transition: tilt
            ? "transform .12s ease-out"
            : "transform .5s cubic-bezier(.2,.7,.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: `1px solid ${V3.lineSoft}`,
          }}
        >
          <span style={{ ...v3Kicker(V3.faint), letterSpacing: ".14em" }}>
            Live match feed
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: V3.mono,
              fontSize: 11,
              fontWeight: 700,
              color: V3.brand,
            }}
          >
            resume parsed ✓
          </span>
        </div>

        <div style={{ padding: 8 }}>
          {HERO_ROWS.map((row) => (
            <div
              key={row.title}
              className="v3-feedrow"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 14px",
                borderRadius: 15,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--surface-3)",
                  border: `1px solid ${V3.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: V3.display,
                  fontSize: 17,
                  fontWeight: 700,
                  color: V3.ink,
                  flexShrink: 0,
                }}
              >
                {row.initial}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: V3.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.title}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: V3.muted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.meta}
                </div>
              </div>
              <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: `conic-gradient(${v3Score(row.score)} ${(
                      row.score * 3.6 * t
                    ).toFixed(1)}deg, ${V3.track} 0)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 5,
                    borderRadius: "50%",
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: V3.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    color: v3Score(row.score),
                  }}
                >
                  {Math.round(row.score * t)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            borderTop: `1px solid ${V3.lineSoft}`,
            background: "var(--surface)",
          }}
        >
          <span style={{ fontSize: 12.5, color: V3.muted }}>
            Ranked against 12 signals from your resume
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: V3.mono,
              fontSize: 11,
              fontWeight: 700,
              color: V3.ink,
            }}
          >
            +128 more
          </span>
        </div>
      </div>

      <div
        className="v3-narrowhide"
        style={{
          position: "absolute",
          right: 22,
          top: -24,
          background: V3.inverse,
          color: V3.onInverse,
          borderRadius: 14,
          padding: "12px 18px",
          boxShadow: "0 20px 40px -22px rgba(15,23,42,.5)",
          animation: "floaty 6.5s ease-in-out infinite",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: V3.mono,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "#A8B3C4",
          }}
        >
          ATS score
        </div>
        <div
          style={{
            fontFamily: V3.mono,
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          88%
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  // Drives the match rings filling on first paint.
  const t = useRamp();

  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%,rgba(109,74,255,.16),rgba(109,74,255,0) 68%)",
          animation: "drift 22s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -160,
          left: -120,
          width: 460,
          height: 460,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%,rgba(168,121,42,.14),rgba(168,121,42,0) 68%)",
          animation: "drift 28s ease-in-out -8s infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(44px,6vw,86px) 24px clamp(40px,5vw,64px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))",
          gap: "clamp(36px,5vw,64px)",
          alignItems: "center",
        }}
      >
        <div style={{ animation: "riseIn .8s cubic-bezier(.2,.7,.2,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: V3.brand,
                animation: "blink 2.4s ease-in-out infinite",
              }}
            />
            <span style={v3Kicker(V3.muted)}>AI career engine</span>
          </div>

          <h1
            style={{
              fontFamily: V3.display,
              fontSize: "clamp(42px,6.2vw,74px)",
              lineHeight: 0.96,
              letterSpacing: "-.04em",
              fontWeight: 700,
              margin: 0,
              color: V3.ink,
            }}
          >
            Stop Applying.
            <br />
            <span style={{ color: V3.brand, position: "relative", display: "inline-block" }}>
              Start Getting{" "}
              <RotatingWord words={["Interviews", "Offers", "Callbacks", "Hired"]} />.
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: ".06em",
                  height: 5,
                  background: V3.brand,
                  opacity: 0.18,
                  transformOrigin: "left",
                  animation: "sweep 1s cubic-bezier(.2,.7,.2,1) .55s both",
                }}
              />
            </span>
          </h1>

          <p
            style={{
              margin: "24px 0 0",
              fontSize: "clamp(16px,1.5vw,19px)",
              lineHeight: 1.55,
              color: V3.body,
              maxWidth: "30em",
            }}
          >
            AIFAGen uses AI to find the right opportunities, optimize your
            profile, and help you move faster through the hiring process.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <button
              onClick={() => {
                const el = document.getElementById("pricing");
                if (!el) return;
                window.scrollTo({
                  top: el.getBoundingClientRect().top + window.scrollY - 74,
                  behavior: "smooth",
                });
              }}
              className="v3-btn-dark v3-btn-hero"
              style={{
                position: "relative",
                overflow: "hidden",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                whiteSpace: "nowrap",
                background: V3.inverse,
                border: "none",
                borderRadius: 13,
                padding: "16px 26px",
                fontSize: 15,
                fontWeight: 700,
                color: V3.onInverse,
                cursor: "pointer",
                animation: "pulseRing 3.4s ease-out 1.4s infinite",
              }}
            >
              Get Your Career Plan <span style={{ fontSize: 17 }}>→</span>
            </button>
            <a
              href="#how-it-works"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
                background: "var(--surface)",
                border: `1px solid ${V3.lineMid}`,
                borderRadius: 13,
                padding: "16px 24px",
                fontSize: 15,
                fontWeight: 700,
                color: V3.ink,
              }}
            >
              See how it works
            </a>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 34 }}>
            <div style={{ display: "flex" }}>
              {[V3.brand, V3.clay, V3.ochre, V3.ink].map((c, i) => (
                <span
                  key={c}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: `2px solid ${V3.page}`,
                    background: c,
                    marginLeft: i === 0 ? 0 : -11,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 700, color: V3.ink }}>
                Join 50,000+ job seekers
              </div>
              <div style={{ color: V3.muted }}>who are getting hired faster</div>
            </div>
          </div>
        </div>

        <HeroFeedCard t={t} />
      </div>
    </section>
  );
}
