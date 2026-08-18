import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { signOut } from "../services/auth";
import { updateProfile } from "../services/profile";
import { PLAN_LABEL, isPaidPlan } from "../utils/plan";

/* Exact port of the "AIFAGen v3" settings screen.
 *
 * Two deviations from the mockup, both because the backing data doesn't exist:
 * the spec's "Match preferences" toggles (remote / relocate / alerts / share)
 * have no columns on `profiles` and no endpoint, and its "Delete account"
 * action has no route — shipping either would mean controls that silently do
 * nothing. The danger-zone treatment is kept and carries log-out, which is
 * real. Restore both here once the backend supports them. */

const T = {
  brand: "#6D4AFF",
  clay: "#F43F5E",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

export default function SettingsView({ profile }) {
  const navigate = useNavigate();
  const setView = (view) => navigate(`/${view}`);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    headline: profile?.headline || "",
    location: profile?.location || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const upd = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  async function handleLogout() {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    }
  }

  async function save() {
    setErr("");
    setSaving(true);
    try {
      await updateProfile(profile.id, form);
      setSaved(true);
    } catch (e) {
      setErr(e.message || "Could not save changes.");
    }
    setSaving(false);
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const plan = profile?.plan || "free";
  const paid = isPaidPlan(plan);

  const fieldLabel = {
    fontFamily: T.mono,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: T.faint,
  };

  const fieldInput = {
    width: "100%",
    marginTop: 8,
    background: T.page,
    border: `1px solid ${T.line}`,
    borderRadius: 11,
    padding: "12px 13px",
    fontSize: 14,
    color: T.ink,
    outline: "none",
    transition: "background .2s,border-color .2s",
  };

  const h2Style = {
    fontFamily: T.display,
    fontSize: 19,
    fontWeight: 700,
    letterSpacing: "-.02em",
    margin: 0,
    color: T.ink,
  };

  return (
    <div>
      {/* ---------------- HEADER ---------------- */}
      <div style={{ animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) both" }}>
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: T.faint,
          }}
        >
          Settings
        </div>
        <h1
          style={{
            fontFamily: T.display,
            fontSize: "clamp(28px,3.4vw,40px)",
            lineHeight: 1.04,
            letterSpacing: "-.035em",
            fontWeight: 700,
            margin: "12px 0 0",
            color: T.ink,
          }}
        >
          Your account
        </h1>
        <p style={{ margin: "9px 0 0", fontSize: 15, color: T.muted }}>
          Details here shape which jobs the matcher shows you.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 16,
          marginTop: 26,
        }}
      >
        {/* ---------------- PROFILE ---------------- */}
        <div
          data-r="wide"
          className="v3-settings-wide"
          style={{
            minWidth: 0,
            background: "#fff",
            border: `1px solid ${T.line}`,
            borderRadius: 20,
            padding: 26,
            boxShadow: "0 1px 2px rgba(15,23,42,.04)",
            animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .08s both",
          }}
        >
          <h2 style={h2Style}>Profile</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Full name</span>
              <input
                value={form.full_name}
                onChange={(e) => upd("full_name", e.target.value)}
                className="v3-field"
                style={fieldInput}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Headline</span>
              <input
                value={form.headline}
                onChange={(e) => upd("headline", e.target.value)}
                placeholder="Senior Product Designer"
                className="v3-field"
                style={fieldInput}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Location</span>
              <input
                value={form.location}
                onChange={(e) => upd("location", e.target.value)}
                placeholder="Hyderabad, India"
                className="v3-field"
                style={fieldInput}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Email</span>
              <input
                value={profile?.email || ""}
                readOnly
                title="Your email is managed by your login and can't be changed here."
                className="v3-field"
                style={{ ...fieldInput, color: T.muted, cursor: "not-allowed" }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              marginTop: 22,
            }}
          >
            <button
              onClick={save}
              disabled={saving}
              className="v3-btn-dark"
              style={{
                background: T.ink,
                border: "none",
                borderRadius: 11,
                padding: "12px 20px",
                fontSize: 13.5,
                fontWeight: 700,
                color: T.page,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>
                Saved ✓
              </span>
            )}
            {err && (
              <span style={{ fontSize: 13, color: T.clay }}>{err}</span>
            )}
          </div>
        </div>

        {/* ---------------- RAIL ---------------- */}
        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .16s both",
          }}
        >
          <div style={{ background: T.ink, borderRadius: 20, padding: 26, color: T.page }}>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: T.faint,
              }}
            >
              Plan
            </div>
            <div
              style={{
                fontFamily: T.display,
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-.03em",
                marginTop: 8,
              }}
            >
              {PLAN_LABEL[plan] || "Free"}
            </div>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                lineHeight: 1.6,
                color: T.faint,
              }}
            >
              {paid
                ? "Unlimited matching, resume optimization and cover letters are active on your account."
                : "5 AI matches a day. Upgrade for unlimited matching, resume optimization and cover letters."}
            </p>
            <button
              onClick={() => setView(paid ? "billing" : "pricing")}
              className="v3-btn-light"
              style={{
                width: "100%",
                marginTop: 18,
                background: T.page,
                border: "none",
                borderRadius: 11,
                padding: 12,
                fontSize: 13.5,
                fontWeight: 700,
                color: T.ink,
                cursor: "pointer",
              }}
            >
              {paid ? "Manage billing" : "See plans"}
            </button>
          </div>

          <div
            style={{
              background: "#fff",
              border: `1px solid ${T.line}`,
              borderRadius: 20,
              padding: 26,
              boxShadow: "0 1px 2px rgba(15,23,42,.04)",
            }}
          >
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: T.faint,
              }}
            >
              Session
            </div>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 13,
                lineHeight: 1.6,
                color: T.muted,
              }}
            >
              Signing out ends this session on this device. Your resume, matches
              and application history are kept.
            </p>
            <button
              onClick={handleLogout}
              className="v3-dangerzone"
              style={{
                width: "100%",
                marginTop: 16,
                background: "#fff",
                border: "1px solid #FFD3DB",
                borderRadius: 11,
                padding: 12,
                fontSize: 13.5,
                fontWeight: 700,
                color: T.clay,
                cursor: "pointer",
                transition: "background .2s",
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
