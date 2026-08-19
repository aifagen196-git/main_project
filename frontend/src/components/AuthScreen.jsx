import { useState } from "react";
import { signIn, signUp } from "../services/auth";

/* Exact port of the "AIFAGen v3" auth screen. Palette, type ramp and spacing
   come from the design spec, so static properties are written inline; hover
   and focus states live in the v3 CSS block in AIFAGen.jsx. The sign-up mode
   reuses the same treatment, since the spec only draws the log-in state. */

const C = {
  brand: "#6D4AFF",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineMid: "#DDE3EE",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const fieldLabel = {
  fontFamily: C.mono,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: C.faint,
};

const fieldInput = {
  width: "100%",
  marginTop: 8,
  background: "#fff",
  border: `1px solid ${C.lineMid}`,
  borderRadius: 12,
  padding: "14px 15px",
  fontSize: 14.5,
  color: C.ink,
  outline: "none",
  transition: "border-color .2s,box-shadow .2s",
};

export default function AuthScreen({ onBack }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      if (isSignup) {
        await signUp(email, password, name);
        setError("Account created — check your email to confirm.");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="font-body"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
      }}
    >
      {/* ---------------- LEFT PANEL ---------------- */}
      <div
        style={{
          background: C.ink,
          color: C.page,
          padding: "clamp(32px,5vw,64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 340,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <img
            src="/logo.png"
            alt="AIFAGen"
            style={{
              height: 32,
              width: 32,
              objectFit: "contain",
              filter: "invert(1)",
            }}
          />
          <span
            style={{
              fontFamily: C.display,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-.03em",
              color: C.page,
            }}
          >
            AIFAGen
          </span>
        </button>

        <div style={{ animation: "riseIn .8s cubic-bezier(.2,.7,.2,1) .1s both" }}>
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.faint,
            }}
          >
            Since you were last here
          </div>
          <div
            style={{
              fontFamily: C.display,
              fontSize: "clamp(30px,4vw,52px)",
              lineHeight: 1.02,
              letterSpacing: "-.04em",
              fontWeight: 700,
              marginTop: 20,
            }}
          >
            24 new roles
            <br />
            matched your
            <br />
            profile.
          </div>
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 15,
              lineHeight: 1.6,
              color: C.faint,
              maxWidth: "26em",
            }}
          >
            Your resume stays yours. We use it to rank opportunities, never to
            spam recruiters on your behalf.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 26,
            fontFamily: C.mono,
            fontSize: 11,
            fontWeight: 700,
            color: C.faint,
          }}
        >
          <span>50,000+ candidates</span>
          <span>12 match signals</span>
        </div>
      </div>

      {/* ---------------- RIGHT PANEL ---------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(32px,5vw,64px)",
          background: "#fff",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            animation: "riseIn .7s cubic-bezier(.2,.7,.2,1) both",
          }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="v3-backlink"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                margin: "0 0 22px",
                padding: 0,
                background: "transparent",
                border: "none",
                fontFamily: C.mono,
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: C.faint,
                cursor: "pointer",
                transition: "color .18s",
              }}
            >
              <span aria-hidden="true">←</span> Back to home
            </button>
          )}

          <h1
            style={{
              fontFamily: C.display,
              fontSize: 34,
              lineHeight: 1.06,
              letterSpacing: "-.035em",
              fontWeight: 700,
              margin: 0,
              color: C.ink,
            }}
          >
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 14.5, color: C.muted }}>
            {isSignup
              ? "Start matching with roles built for you."
              : "Log in to pick up where you left off."}
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginTop: 32,
            }}
          >
            {isSignup && (
              <label style={{ display: "block" }}>
                <span style={fieldLabel}>Full name</span>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="v3-input"
                  style={fieldInput}
                />
              </label>
            )}

            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="v3-input"
                style={fieldInput}
              />
            </label>

            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="v3-input"
                style={fieldInput}
              />
            </label>

            {error && (
              <div
                role="alert"
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#B4232F",
                  background: "#FFF0F3",
                  border: "1px solid #FBD5DC",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="v3-btn-dark"
              style={{
                background: C.ink,
                border: "none",
                borderRadius: 12,
                padding: 15,
                fontSize: 15,
                fontWeight: 700,
                color: C.page,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.65 : 1,
              }}
            >
              {loading
                ? "Please wait…"
                : isSignup
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <p style={{ margin: "26px 0 0", fontSize: 13.5, color: C.muted }}>
            {isSignup ? "Already have an account? " : "New here? "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setError("");
                setMode(isSignup ? "login" : "signup");
              }}
              style={{ fontWeight: 700, color: C.brand }}
            >
              {isSignup ? "Log in" : "Create an account"}
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
