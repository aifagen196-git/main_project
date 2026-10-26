import { FileText, Zap, ArrowRight, Target, ClipboardList } from "lucide-react";
import { V3, v3Kicker, h2Style } from "./theme";
import { useRevealChildren } from "./motion";

// Only features the product really has (Application Tracking is the
// Applications screen; there is no interview-practice feature).
const FEATURE_CARDS = [
  { icon: Target, color: V3.brand, t: "Smart Job Matching", d: "AI finds the most relevant jobs based on your skills, experience, and career goals." },
  { icon: FileText, color: V3.ochre, t: "Resume Optimization", d: "Get AI-powered suggestions to improve your resume and pass ATS scans." },
  { icon: ClipboardList, color: V3.clay, t: "Application Tracking", d: "Log every application and move it through your pipeline — applied, interviewing, assessment, offer." },
  { icon: Zap, color: "#3987e5", t: "Application Accelerator", d: "Apply smarter and faster with AI-generated cover letters and tailored applications." },
];

// Full-bleed tinted band (not just a constrained blob inside a white
// box) — deliberately more saturated than the hero's own aurora, so
// this section actually reads as "a different, colorful place" while
// scrolling instead of a white gap between two dark sections.
export default function Features() {
  const featuresRef = useRevealChildren("flip");

  return (
    <section
      id="features"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(1100px 520px at 85% -8%,rgba(109,74,255,.16),transparent 60%),radial-gradient(900px 460px at 5% 105%,rgba(245,158,11,.14),transparent 60%),linear-gradient(180deg,var(--surface-2) 0%,var(--brand-wash) 100%)",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(56px,7vw,96px) 24px",
        }}
      >
        <div style={{ maxWidth: "34em" }}>
          <span style={v3Kicker(V3.brand)}>Powered by AI. Built for you.</span>
          <h2 style={{ ...h2Style, color: V3.ink }}>
            Everything you need to stand out and land your dream role.
          </h2>
        </div>
        <div
          ref={featuresRef}
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(238px,1fr))",
            gap: 20,
            marginTop: 52,
            perspective: 1200,
          }}
        >
        {FEATURE_CARDS.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.t}
              data-feature-card="1"
              className="v3-feature-card"
              style={{
                position: "relative",
                overflow: "hidden",
                background: `radial-gradient(ellipse at top left,${f.color}14,transparent 60%),var(--surface)`,
                border: `1px solid ${V3.line}`,
                borderRadius: 22,
                boxShadow: "0 1px 2px rgba(15,23,42,.04)",
                height: 300,
                perspective: 1400,
              }}
            >
              {/* The card itself twists on hover — front shows only the
                  number/icon/title, back reveals the description. Both
                  faces are absolutely positioned on top of each other so
                  the flip has nothing to reflow around. Duration/easing
                  tuned for a smooth, even twist — no overshoot/bounce. */}
              <div
                data-feature-flip="1"
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  transition: "transform .8s cubic-bezier(.65,0,.35,1)",
                }}
              >
                {/* ---- Front ---- */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    padding: "38px 32px 42px",
                  }}
                >
                  {/* Corner ribbon in the card's own accent color — a
                      visual "there's more here" cue that replaces the old
                      "Hover to read more" caption, no text needed. */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 64,
                      height: 64,
                      background: `linear-gradient(135deg,transparent 50%,${f.color}26 50%)`,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: V3.mono,
                        fontSize: 30,
                        fontWeight: 700,
                        color: `${f.color}33`,
                        lineHeight: 1,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div
                    data-feature-chip="1"
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 15,
                      marginTop: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform .5s cubic-bezier(.34,1.4,.4,1)",
                      background: f.color,
                      boxShadow: `0 10px 22px -10px ${f.color}99`,
                    }}
                  >
                    <Icon size={24} color="#fff" strokeWidth={2} />
                  </div>
                  <h3
                    style={{
                      fontFamily: V3.display,
                      fontSize: 23,
                      fontWeight: 700,
                      letterSpacing: "-.02em",
                      margin: "22px 0 0",
                      color: V3.ink,
                    }}
                  >
                    {f.t}
                  </h3>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 14,
                      fontFamily: V3.mono,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: f.color,
                    }}
                  >
                    Explore <ArrowRight size={13} />
                  </span>
                </div>

                {/* ---- Back ---- */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: `radial-gradient(ellipse at top left,rgba(255,255,255,.22),transparent 60%),${f.color}`,
                    padding: "38px 32px 42px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Icon size={24} color="#fff" strokeWidth={2} style={{ opacity: 0.9 }} />
                  <h3
                    style={{
                      fontFamily: V3.display,
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: "-.02em",
                      margin: "16px 0 0",
                      color: "#fff",
                    }}
                  >
                    {f.t}
                  </h3>
                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: "rgba(255,255,255,.88)",
                    }}
                  >
                    {f.d}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
