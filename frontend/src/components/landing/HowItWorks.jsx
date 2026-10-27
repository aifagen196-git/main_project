import { Search, Upload, ChevronRight, Wand2, Mic } from "lucide-react";
import { V3, v3Kicker, h2Style } from "./theme";
import { useRevealChildren } from "./motion";

const STEP_CARDS = [
  { t: "Create Your Profile", d: "Sign up and upload your resume — we read your skills and experience.", icon: Upload },
  { t: "AI Finds Best Matches", d: "We scan thousands of jobs to find the perfect ones for you.", icon: Search },
  { t: "Optimize & Apply", d: "AI optimizes your resume and creates tailored applications.", icon: Wand2 },
  { t: "Get Interviews", d: "Stand out, get noticed, and land more interviews.", icon: Mic },
];

export default function HowItWorks() {
  const stepsRef = useRevealChildren("stagger");

  return (
    <section
      id="how-it-works"
      style={{
        position: "relative",
        overflow: "hidden",
        background: V3.inverse,
        color: V3.onInverse,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-30%",
          left: "-10%",
          width: "60%",
          height: "150%",
          background:
            "radial-gradient(ellipse at center,rgba(109,74,255,.5),rgba(109,74,255,0) 62%)",
          filter: "blur(22px)",
          animation: "auroraA 18s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-40%",
          right: "-8%",
          width: "55%",
          height: "150%",
          background:
            "radial-gradient(ellipse at center,rgba(168,121,42,.38),rgba(168,121,42,0) 62%)",
          filter: "blur(26px)",
          animation: "auroraB 24s ease-in-out -6s infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(56px,7vw,96px) 24px",
        }}
      >
        <span style={v3Kicker(V3.faint)}>Simple. Fast. Effective.</span>
        <h2 style={{ ...h2Style, maxWidth: "22em" }}>How AIFAGen Works</h2>
        <div
          ref={stepsRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 34,
            marginTop: 56,
          }}
        >
          {STEP_CARDS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.t} style={{ position: "relative" }}>
                <div
                  className="v3-step-card"
                  style={{
                    position: "relative",
                    height: "100%",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,.10)",
                    background: "rgba(255,255,255,.025)",
                    padding: "28px 26px 30px",
                    animation: `riseIn .7s cubic-bezier(.2,.7,.2,1) ${i * 0.08}s both`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div
                      className="v3-step-chip"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: `${V3.brand}1f`,
                        border: `1px solid ${V3.brand}4d`,
                      }}
                    >
                      <Icon size={24} color={V3.brand} strokeWidth={2} />
                    </div>
                    <span
                      style={{
                        fontFamily: V3.mono,
                        fontSize: 34,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.14)",
                        lineHeight: 1,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <span
                    className="v3-step-line"
                    style={{
                      display: "block",
                      height: 2,
                      marginTop: 22,
                      borderRadius: 2,
                      background: `linear-gradient(90deg,${V3.brand},transparent)`,
                    }}
                  />

                  <h3
                    style={{
                      fontFamily: V3.display,
                      fontSize: 19,
                      fontWeight: 700,
                      letterSpacing: "-.02em",
                      margin: "18px 0 0",
                    }}
                  >
                    {s.t}
                  </h3>
                  <p
                    style={{
                      margin: "9px 0 0",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: V3.faint,
                    }}
                  >
                    {s.d}
                  </p>
                </div>

                {i < STEP_CARDS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="v3-narrowhide"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: -26,
                      transform: "translateY(-50%)",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: V3.inverse,
                      border: "1px solid rgba(255,255,255,.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1,
                    }}
                  >
                    <ChevronRight size={14} color="rgba(255,255,255,.5)" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
