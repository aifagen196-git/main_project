import { useState } from "react";
import { updatePassword, signOut } from "../services/auth";

const label = {
  fontFamily: "'JetBrains Mono',monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

const input = {
  width: "100%",
  marginTop: 8,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "14px 15px",
  fontSize: 14.5,
  color: "var(--ink)",
  outline: "none",
};

export default function ResetPasswordScreen({ hasSession, onDone, onCancel }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== confirm) return setErr("Passwords don't match.");
    setSaving(true);
    try {
      await updatePassword(pw);
      setDone(true);
    } catch (e2) {
      setErr(e2.message || "Could not update your password. Request a new reset link and try again.");
    }
    setSaving(false);
  }

  return (
    <div
      className="page-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "var(--surface-2)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "clamp(24px,5vw,36px)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque',sans-serif",
            fontSize: 28,
            letterSpacing: "-.03em",
            fontWeight: 700,
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {done ? "Password updated" : "Set a new password"}
        </h1>

        {!hasSession ? (
          <>
            <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "var(--ink-2)" }}>
              This reset link is invalid or has expired. Request a new one from the login screen.
            </p>
            <button type="button" onClick={onCancel} className="v3-btn-dark" style={btn}>
              Back to login
            </button>
          </>
        ) : done ? (
          <>
            <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "var(--ink-2)" }}>
              You're all set — use your new password next time you log in.
            </p>
            <button type="button" onClick={onDone} className="v3-btn-dark" style={btn}>
              Continue to your dashboard
            </button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <label>
              <span style={label}>New password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="v3-input"
                style={input}
              />
            </label>
            <label>
              <span style={label}>Confirm new password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="v3-input"
                style={input}
              />
            </label>
            {err && (
              <div
                role="alert"
                style={{
                  fontSize: 13,
                  color: "var(--rose-ink)",
                  background: "var(--rose-wash)",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                {err}
              </div>
            )}
            <button type="submit" disabled={saving} className="v3-btn-dark" style={{ ...btn, marginTop: 0, opacity: saving ? 0.65 : 1 }}>
              {saving ? "Saving…" : "Update password"}
            </button>
            <button
              type="button"
              onClick={() => signOut().finally(onCancel)}
              style={{ background: "none", border: "none", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const btn = {
  width: "100%",
  marginTop: 24,
  background: "var(--inverse)",
  border: "none",
  borderRadius: 12,
  padding: 15,
  fontSize: 15,
  fontWeight: 700,
  color: "var(--on-inverse)",
  cursor: "pointer",
};
