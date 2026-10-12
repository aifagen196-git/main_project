import { useEffect, useState } from "react";
import { confirmPhoneCode, sendPhoneCode, signOut } from "../services/auth";

/* Shown after login until the user's mobile number is verified. Nothing else
 * in the app — free trial, payment, features — is reachable before this; the
 * server enforces the same rule (requireVerified). The number from sign-up is
 * pre-filled; a 6-digit code is texted to it. */

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

const btn = {
  width: "100%",
  marginTop: 4,
  background: "var(--inverse)",
  border: "none",
  borderRadius: 12,
  padding: 15,
  fontSize: 14.5,
  fontWeight: 700,
  color: "var(--on-inverse)",
  cursor: "pointer",
};

const RESEND_SECONDS = 60;

export default function PhoneVerifyScreen({ profile, onVerified }) {
  // US numbers only: show the 10-digit national part; +1 is fixed.
  const [phone, setPhone] = useState(() => {
    const d = String(profile?.mobile || "").replace(/\D/g, "");
    return d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : "";
  });
  const [sentTo, setSentTo] = useState(""); // number the code went to
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e) {
    e?.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await sendPhoneCode(`+1${phone.replace(/\D/g, "").slice(-10)}`);
      if (r.alreadyVerified) {
        await onVerified();
        return;
      }
      setSentTo(r.phone);
      setCode("");
      setWait(RESEND_SECONDS);
    } catch (e2) {
      setErr(e2.message || "Could not send the code. Please try again.");
    }
    setBusy(false);
  }

  async function verify(e) {
    e.preventDefault();
    setErr("");
    if (!/^\d{6}$/.test(code)) return setErr("Enter the 6-digit code from the text message.");
    setBusy(true);
    try {
      await confirmPhoneCode(sentTo, code);
      await onVerified();
    } catch (e2) {
      setErr(e2.message || "That code didn't work. Please try again.");
      setBusy(false);
    }
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
          Verify your mobile number
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
          {sentTo
            ? `We texted a 6-digit code to ${sentTo}. Enter it below.`
            : "One last step before you start. We'll text you a 6-digit code to confirm your number."}
        </p>

        {!sentTo ? (
          <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <label>
              <span style={label}>US mobile number</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span
                  aria-hidden="true"
                  style={{ ...input, width: "auto", flex: "0 0 auto", display: "flex", alignItems: "center", color: "var(--ink-2)" }}
                >
                  +1
                </span>
                <input
                  type="tel"
                  required
                  autoComplete="tel-national"
                  inputMode="tel"
                  maxLength={16}
                  pattern="\(?[2-9]\d{2}\)?[ \-\.]?[2-9]\d{2}[ \-\.]?\d{4}"
                  title="Enter a 10-digit US mobile number, e.g. (555) 234-5678"
                  placeholder="(555) 234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="v3-input"
                  style={{ ...input, flex: 1 }}
                />
              </div>
            </label>
            {err && <ErrorBox>{err}</ErrorBox>}
            <button type="submit" disabled={busy} className="v3-btn-dark" style={{ ...btn, opacity: busy ? 0.65 : 1 }}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <label>
              <span style={label}>6-digit code</span>
              <input
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="v3-input"
                style={{ ...input, letterSpacing: ".3em", fontSize: 18 }}
              />
            </label>
            {err && <ErrorBox>{err}</ErrorBox>}
            <button type="submit" disabled={busy} className="v3-btn-dark" style={{ ...btn, opacity: busy ? 0.65 : 1 }}>
              {busy ? "Checking…" : "Verify"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <button
                type="button"
                onClick={() => {
                  setSentTo("");
                  setErr("");
                }}
                style={linkBtn}
              >
                Change number
              </button>
              <button type="button" onClick={send} disabled={wait > 0 || busy} style={{ ...linkBtn, opacity: wait > 0 ? 0.55 : 1 }}>
                {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        <button
          type="button"
          onClick={() => signOut().catch(() => {})}
          style={{ ...linkBtn, display: "block", margin: "20px auto 0" }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function ErrorBox({ children }) {
  return (
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
      {children}
    </div>
  );
}

const linkBtn = {
  background: "none",
  border: "none",
  color: "var(--ink-2)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};
