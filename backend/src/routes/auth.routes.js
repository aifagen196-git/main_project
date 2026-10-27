import express from "express";
import { createClient } from "@supabase/supabase-js";

import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { validArea } from "../utils/profileFields.js";
import { toUsE164 } from "../utils/phone.js";
import { assuranceLevel } from "../utils/sessionClaims.js";
import { SUPPORT_EMAIL } from "../config/site.js";
import { existingAccount } from "../utils/existingAccount.js";
import { tokenClaims } from "../utils/sessionClaims.js";
import { clientIp, mfaAccountLimiter, passwordChangeLimiter } from "../middleware/rateLimiter.js";

// Sign-in goes through the backend so the browser never loads the Supabase
// client, URL or key — it only ever talks to this API.
//
// Each call gets its own short-lived client: signIn/refresh store the session
// on the client instance, and a shared one would leak sessions between
// concurrent requests.
const router = express.Router();

// Every sign-in reaches Supabase from this server, so without help Supabase's
// per-IP limits would count all users together (one attacker could use them
// up for everyone). Sb-Forwarded-For passes the visitor's IP instead; Supabase
// honours it for requests made with an sb_secret_ key once "IP address
// forwarding" is on in the project's Auth rate-limit settings.
const forwardedFor = (req) => ({ "Sb-Forwarded-For": clientIp(req) });

function authClient(req) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: forwardedFor(req) },
  });
}

// Where confirmation / reset emails send people back to. Only an origin we
// already trust for CORS, so a request can't point the link at another site.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
function siteOrigin(req) {
  const origin = req.get("origin");
  if (origin && allowedOrigins.includes(origin)) return origin;
  if (origin && process.env.NODE_ENV !== "production" && /^http:\/\/localhost:51[78]\d$/.test(origin)) {
    return origin;
  }
  return (
    process.env.SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://aifagenlabs.com" : allowedOrigins[0])
  );
}

// Only what the frontend needs from a session.
function publicSession(session) {
  if (!session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user: publicUser(session.user),
  };
}
function publicUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, user_metadata: user.user_metadata || {} };
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Supabase's own messages are already user-facing ("Invalid login
// credentials", "User already registered", rate limits) and the frontend maps
// them to friendlier copy, so pass them through with a matching status.
function fail(res, error, fallback) {
  const status = error?.status && error.status >= 400 && error.status < 500 ? error.status : 400;
  // A database failure inside Supabase Auth comes back as an empty or "{}"
  // message, or "Database error …" — none of it means anything to a user.
  const msg = String(error?.message || "").trim();
  const useless = !msg || msg === "{}" || /database error/i.test(msg);
  if (useless) console.error("Auth error:", error);
  return res.status(status).json({ success: false, message: useless ? fallback : msg });
}

router.post("/signup", async (req, res) => {
  const email = str(req.body?.email, 254);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const d = req.body?.data || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
  }

  // Required here, not just on the form: an account with no name or area gets
  // them from its first resume, which would skip the resume ownership checks.
  const firstName = str(d.first_name, 60);
  const lastName = str(d.last_name, 60);
  const area = str(d.area_of_interest, 40);
  if (!firstName || !lastName) {
    return res.status(400).json({ success: false, message: "Enter your first and last name." });
  }
  if (!validArea(area)) {
    return res.status(400).json({ success: false, message: "Choose an area of interest from the list." });
  }
  // Self sign-up is US only. (Admins can add accounts with Indian numbers
  // from the admin page.)
  const mobile = toUsE164(d.mobile);
  if (!mobile) {
    return res.status(400).json({ success: false, message: "Enter a US mobile number, e.g. (555) 234-5678." });
  }
  // One account per mobile number (the database enforces it too, but its
  // error reaches us as "{}").
  const { data: taken } = await supabase.from("profiles").select("id").eq("mobile", mobile).limit(1);
  if (taken?.length) {
    return res.status(409).json({
      success: false,
      message: `This mobile number is already registered. Log in instead, or contact ${SUPPORT_EMAIL}.`,
    });
  }
  const { data, error } = await authClient(req).auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteOrigin(req)}/`,
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        mobile,
        area_of_interest: area,
      },
    },
  });
  if (error) return fail(res, error, "Could not create the account.");
  const existing = existingAccount(data.user, data.session);
  if (existing === "confirmed") {
    return res.status(409).json({
      success: false,
      code: "EMAIL_TAKEN",
      message: "An account with this email already exists. Log in, or use Forgot password if you don't remember the password.",
    });
  }
  if (existing === "unconfirmed") {
    return res.status(409).json({
      success: false,
      code: "EMAIL_NOT_CONFIRMED",
      message: "An account with this email already exists but hasn't been confirmed yet. We've sent the confirmation link to that email again.",
    });
  }
  return res.json({ success: true, session: publicSession(data.session) });
});

router.post("/login", async (req, res) => {
  const email = str(req.body?.email, 254);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }
  const { data, error } = await authClient(req).auth.signInWithPassword({ email, password });
  if (error) return fail(res, error, "Could not log in.");
  return res.json({ success: true, session: publicSession(data.session) });
});

router.post("/refresh", async (req, res) => {
  const refresh_token = str(req.body?.refresh_token, 500);
  if (!refresh_token) return res.status(400).json({ success: false, message: "Missing refresh token." });
  const { data, error } = await authClient(req).auth.refreshSession({ refresh_token });
  if (error || !data.session) {
    return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }
  return res.json({ success: true, session: publicSession(data.session) });
});

router.post("/forgot", async (req, res) => {
  const email = str(req.body?.email, 254);
  if (!email) return res.status(400).json({ success: false, message: "Email is required." });
  const { error } = await authClient(req).auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin(req)}/?recovery=1`,
  });
  // Rate limits are worth surfacing; anything else stays generic so this
  // can't be used to probe which emails have accounts.
  if (error?.status === 429) return fail(res, error);
  if (error) console.error("Password reset email failed", error.message);
  return res.json({ success: true });
});

// The signed-in user (used after an email link hands the browser its tokens).
router.get("/user", requireAuth, (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

// Signed in through an emailed link (password reset, sign-up confirmation)
// within the last hour: the person has just proved they own the email, and a
// reset has no old password to ask for.
const EMAIL_LINK_METHODS = ["recovery", "otp", "magiclink", "email/signup", "invite"];
function viaEmailLink(req) {
  const amr = tokenClaims(req).amr;
  const hourAgo = Date.now() / 1000 - 3600;
  return Array.isArray(amr) && amr.some((a) => EMAIL_LINK_METHODS.includes(a?.method) && a.timestamp > hourAgo);
}

// Changing the password needs the current one (so a stolen session can't
// lock the owner out), except right after a reset link. Supabase signs out
// every session on a password change, this one included, so this device is
// signed straight back in and gets a fresh session; other devices stay out.
router.post("/password", requireAuth, passwordChangeLimiter, async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const current = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
  }
  if (!viaEmailLink(req)) {
    if (!current) {
      return res.status(400).json({ success: false, code: "CURRENT_PASSWORD_REQUIRED", message: "Enter your current password." });
    }
    const check = await authClient(req).auth.signInWithPassword({ email: req.user.email, password: current });
    if (check.error || !check.data?.session) {
      return res.status(400).json({ success: false, code: "WRONG_PASSWORD", message: "Your current password isn't right." });
    }
    // The check opened a session of its own; close it.
    await supabase.auth.admin.signOut(check.data.session.access_token, "local").catch(() => {});
  }
  const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password });
  if (error) return fail(res, error, "Could not update the password.");
  const fresh = await authClient(req).auth.signInWithPassword({ email: req.user.email, password });
  if (fresh.error) console.error("Sign-in after password change failed", fresh.error.message);
  return res.json({ success: true, session: publicSession(fresh.data?.session) });
});

router.post("/logout", requireAuth, async (req, res) => {
  const token = req.get("authorization").split(" ")[1];
  // Revokes the refresh token server-side; the browser drops its copy anyway.
  const { error } = await supabase.auth.admin.signOut(token, "local");
  if (error) console.error("Sign-out failed", error.message);
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Two-step sign-in with an authenticator app (TOTP), required for admin pages
// (middleware/requireAdmin.js). Supabase Auth creates the secret, checks the
// codes and upgrades the session to "aal2"; these calls act as the signed-in
// user. If an admin loses their phone, remove their factor in the Supabase
// dashboard (Authentication → Users → the user → MFA) and they set it up again.
// ---------------------------------------------------------------------------
async function gotrue(req, path, method, body) {
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${bearer(req)}`,
      "Content-Type": "application/json",
      ...forwardedFor(req),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
const bearer = (req) => req.get("authorization").split(" ")[1];

// Whether this session has passed the second step, and the user's set-up apps.
router.get("/mfa", requireAuth, (req, res) => {
  const verified = (req.user.factors || []).filter((f) => f.status === "verified" && f.factor_type === "totp");
  return res.json({
    success: true,
    aal: assuranceLevel(req),
    factors: verified.map((f) => ({ id: f.id, name: f.friendly_name || "Authenticator app" })),
  });
});

// Start setting up an authenticator app: returns the QR code to scan. Clears
// any half-finished set-up first. Only for users with no app set up yet —
// replacing one goes through the dashboard (see above).
router.post("/mfa/enroll", requireAuth, async (req, res) => {
  const factors = req.user.factors || [];
  if (factors.some((f) => f.status === "verified")) {
    return res.status(409).json({ success: false, message: "An authenticator app is already set up for this account." });
  }
  for (const f of factors) await gotrue(req, `factors/${f.id}`, "DELETE");

  const r = await gotrue(req, "factors", "POST", {
    factor_type: "totp",
    // Names must be unique per user; two set-ups started together would clash.
    friendly_name: `Authenticator ${new Date().toISOString().slice(0, 10)} ${Math.random().toString(36).slice(2, 6)}`,
    issuer: "AIFAGen Admin",
  });
  if (!r.ok || !r.data?.totp) {
    console.error("MFA enroll failed", r.status, r.data?.msg || r.data?.message || r.data?.error_code);
    return res.status(502).json({ success: false, message: "Could not start two-step set-up. Please try again." });
  }
  // Supabase returns the QR code as raw SVG markup; send it as an image URL
  // the browser can show directly.
  const qr = String(r.data.totp.qr_code || "");
  return res.json({
    success: true,
    factorId: r.data.id,
    qrCode: qr.startsWith("data:") ? qr : `data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`,
    secret: r.data.totp.secret,
  });
});

// Check a 6-digit code. On success the session is upgraded to aal2 and the
// new session is returned (the browser swaps it in).
router.post("/mfa/verify", requireAuth, mfaAccountLimiter, async (req, res) => {
  const factorId = typeof req.body?.factorId === "string" ? req.body.factorId : "";
  const code = String(req.body?.code || "").replace(/\D/g, "");
  if (!/^[0-9a-f-]{36}$/i.test(factorId) || code.length !== 6) {
    return res.status(400).json({ success: false, message: "Enter the 6-digit code from your authenticator app." });
  }
  const ch = await gotrue(req, `factors/${factorId}/challenge`, "POST", {});
  if (!ch.ok || !ch.data?.id) {
    return res.status(400).json({ success: false, message: "Could not check the code. Please try again." });
  }
  const v = await gotrue(req, `factors/${factorId}/verify`, "POST", { challenge_id: ch.data.id, code });
  if (!v.ok || !v.data?.access_token) {
    return res.status(400).json({ success: false, message: "That code didn't match. Check the time on your phone and try the newest code." });
  }
  return res.json({ success: true, session: publicSession(v.data) });
});

export default router;
