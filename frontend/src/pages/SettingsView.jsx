import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { signOut, updatePassword } from "../services/auth";
import { updateProfile, uploadAvatar, removeAvatar, validateAvatarFile } from "../services/profile";
import { PLAN_LABEL, isPaidPlan } from "../utils/plan";

/* Port of the "AIFAGen v3" settings screen, redesigned from the original
 * exact port: an identity strip (avatar, name, email) heads the Profile
 * card instead of a bare "Profile" label over a form, and a Security card
 * fills what used to be dead space under Save changes — real, since
 * supabase.auth.updateUser() needs no backend route (see services/auth.js).
 *
 * Two things from the original v3 mockup are still deliberately absent,
 * both because the backing data doesn't exist: the spec's "Match
 * preferences" toggles (remote / relocate / alerts / share) have no columns
 * on `profiles` and no endpoint, and its "Delete account" action has no
 * route — shipping either would mean controls that silently do nothing.
 * The danger-zone treatment is kept and carries log-out, which is real.
 * Restore both once the backend supports them. */

const T = {
  brand: "#6D4AFF",
  clay: "#F43F5E",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

export default function SettingsView({ profile, refresh }) {
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

  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState("");

  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwErr, setPwErr] = useState("");

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

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setAvatarErr("");
    try {
      validateAvatarFile(file);
    } catch (err) {
      setAvatarErr(err.message);
      return;
    }

    setAvatarBusy(true);
    try {
      const updated = await uploadAvatar(file);
      setAvatarUrl(updated.avatar_url || "");
      await refresh?.();
    } catch (err) {
      setAvatarErr(err.message || "Could not upload photo.");
    }
    setAvatarBusy(false);
  }

  async function handleRemoveAvatar() {
    setAvatarErr("");
    setAvatarBusy(true);
    try {
      const updated = await removeAvatar();
      setAvatarUrl(updated.avatar_url || "");
      await refresh?.();
    } catch (err) {
      setAvatarErr(err.message || "Could not remove photo.");
    }
    setAvatarBusy(false);
  }

  async function savePassword() {
    setPwErr("");
    setPwSaved(false);
    if (pw.next.length < 8) {
      setPwErr("Password must be at least 8 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwErr("Passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      await updatePassword(pw.next);
      setPwSaved(true);
      setPw({ next: "", confirm: "" });
    } catch (e) {
      setPwErr(e.message || "Could not update password.");
    }
    setPwSaving(false);
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const plan = profile?.plan || "none";
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
        {/* ---------------- PROFILE + SECURITY (wide column) ---------------- */}
        <div
          data-r="wide"
          className="v3-settings-wide"
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
        <div
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
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
              title={avatarUrl ? "Change profile photo" : "Add profile photo"}
              style={{
                position: "relative",
                width: 104,
                height: 104,
                borderRadius: 26,
                background: avatarUrl ? T.page : T.brand,
                color: T.page,
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: T.display,
                fontSize: 32,
                fontWeight: 700,
                flexShrink: 0,
                overflow: "hidden",
                cursor: avatarBusy ? "default" : "pointer",
                opacity: avatarBusy ? 0.6 : 1,
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
              {/* Camera badge — signals the circle is clickable to add/change a photo. */}
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: T.ink,
                  border: `2.5px solid #fff`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 8a2 2 0 0 1 2-2h1.2a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.8 3.5h4.4a1 1 0 0 1 .83.45l.94 1.4a1 1 0 0 0 .83.45H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
                    stroke="#fff"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12.5" r="3.1" stroke="#fff" strokeWidth="1.6" />
                </svg>
              </span>
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: T.display,
                  fontSize: 21,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  color: T.ink,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.full_name || "Your account"}
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 14,
                  color: T.muted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.email || ""}
              </div>
              {avatarUrl && !avatarBusy && (
                <button
                  onClick={handleRemoveAvatar}
                  style={{
                    marginTop: 8,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.clay,
                    cursor: "pointer",
                  }}
                >
                  Remove photo
                </button>
              )}
              {avatarBusy && (
                <span style={{ display: "block", marginTop: 4, fontSize: 12, color: T.muted }}>
                  Saving…
                </span>
              )}
            </div>
          </div>
          {avatarErr && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: T.clay }}>{avatarErr}</div>
          )}

          <div style={{ height: 1, background: T.lineSoft, margin: "22px 0" }} />

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

        {/* ---------------- SECURITY ---------------- */}
        <div
          style={{
            minWidth: 0,
            background: "#fff",
            border: `1px solid ${T.line}`,
            borderRadius: 20,
            padding: 26,
            boxShadow: "0 1px 2px rgba(15,23,42,.04)",
            animation: "riseIn .6s cubic-bezier(.2,.7,.2,1) .12s both",
          }}
        >
          <h2 style={h2Style}>Security</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: T.muted }}>
            Choose a new password for your account.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => {
                  setPw((p) => ({ ...p, next: e.target.value }));
                  setPwSaved(false);
                }}
                placeholder="At least 8 characters"
                className="v3-field"
                style={fieldInput}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={fieldLabel}>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => {
                  setPw((p) => ({ ...p, confirm: e.target.value }));
                  setPwSaved(false);
                }}
                className="v3-field"
                style={fieldInput}
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
              onClick={savePassword}
              disabled={pwSaving || !pw.next || !pw.confirm}
              className="v3-btn-dark"
              style={{
                background: T.ink,
                border: "none",
                borderRadius: 11,
                padding: "12px 20px",
                fontSize: 13.5,
                fontWeight: 700,
                color: T.page,
                cursor: pwSaving ? "default" : "pointer",
                opacity: pwSaving || !pw.next || !pw.confirm ? 0.65 : 1,
              }}
            >
              {pwSaving ? "Updating…" : "Update password"}
            </button>
            {pwSaved && (
              <span style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>
                Password updated ✓
              </span>
            )}
            {pwErr && (
              <span style={{ fontSize: 13, color: T.clay }}>{pwErr}</span>
            )}
          </div>
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
              {PLAN_LABEL[plan] || "No plan"}
            </div>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                lineHeight: 1.6,
                color: T.faint,
              }}
            >
              {
                // There's no free tier — the only way to land in the app shell
                // with `paid` false is plan === 'none' (isSubscribed() in
                // utils/plan.js should normally route that state to Pricing
                // before this page is even reachable). Defensive copy, not
                // the expected path.
                paid
                  ? "Unlimited matching, resume optimization and cover letters are active on your account."
                  : "Choose a plan to unlock matching, resume optimization and cover letters."
              }
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
