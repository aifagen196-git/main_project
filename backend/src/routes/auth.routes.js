import express from "express";
import { createClient } from "@supabase/supabase-js";

import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { validArea } from "../utils/profileFields.js";
import { toUsE164 } from "../utils/phone.js";

// Sign-in goes through the backend so the browser never loads the Supabase
// client, URL or key — it only ever talks to this API.
//
// Each call gets its own short-lived client: signIn/refresh store the session
// on the client instance, and a shared one would leak sessions between
// concurrent requests.
const router = express.Router();

function authClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
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
  return res.status(status).json({ success: false, message: error?.message || fallback });
}

router.post("/signup", async (req, res) => {
  const email = str(req.body?.email, 254);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const d = req.body?.data || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const firstName = str(d.first_name, 60);
  const lastName = str(d.last_name, 60);
  const area = str(d.area_of_interest, 40);
  if (area && !validArea(area)) {
    return res.status(400).json({ success: false, message: "Choose an area of interest from the list." });
  }
  // Self sign-up is US only. (Admins can add accounts with Indian numbers
  // from the admin page.)
  const mobile = toUsE164(d.mobile);
  if (!mobile) {
    return res.status(400).json({ success: false, message: "Enter a US mobile number, e.g. (555) 234-5678." });
  }
  const { data, error } = await authClient().auth.signUp({
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
  return res.json({ success: true, session: publicSession(data.session) });
});

router.post("/login", async (req, res) => {
  const email = str(req.body?.email, 254);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error) return fail(res, error, "Could not log in.");
  return res.json({ success: true, session: publicSession(data.session) });
});

router.post("/refresh", async (req, res) => {
  const refresh_token = str(req.body?.refresh_token, 500);
  if (!refresh_token) return res.status(400).json({ success: false, message: "Missing refresh token." });
  const { data, error } = await authClient().auth.refreshSession({ refresh_token });
  if (error || !data.session) {
    return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }
  return res.json({ success: true, session: publicSession(data.session) });
});

router.post("/forgot", async (req, res) => {
  const email = str(req.body?.email, 254);
  if (!email) return res.status(400).json({ success: false, message: "Email is required." });
  const { error } = await authClient().auth.resetPasswordForEmail(email, {
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

router.post("/password", requireAuth, async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
  }
  const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password });
  if (error) return fail(res, error, "Could not update the password.");
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Mobile number verification. Uses Supabase Auth's own phone-change flow, so
// Supabase generates, expires and texts the code (through whichever SMS
// provider is set up under Authentication → Providers → Phone) and marks the
// number confirmed on the user. Both calls act as the signed-in user.
// ---------------------------------------------------------------------------
async function gotrue(path, method, token, body) {
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Supabase's wording is technical; say what the user can do about it.
function phoneError(data, status) {
  const msg = String(data?.msg || data?.message || data?.error_description || "");
  if (status === 429 || /rate|too many|seconds/i.test(msg)) {
    return "Please wait a minute before asking for another code.";
  }
  if (/already|registered|exists/i.test(msg)) {
    return "That mobile number is already linked to another account.";
  }
  if (/expired|invalid|token|otp/i.test(msg)) {
    return "That code is wrong or has expired. Check it, or send a new one.";
  }
  if (/provider|sms|unsupported|disabled/i.test(msg)) {
    console.error("Phone verification is not configured:", msg);
    return "We can't send text messages right now. Please try again later.";
  }
  console.error("Phone verification failed:", status, msg);
  return "Something went wrong. Please try again.";
}

router.post("/phone/start", requireAuth, async (req, res) => {
  const phone = toUsE164(req.body?.phone);
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Enter a US mobile number, e.g. (555) 234-5678.",
    });
  }
  if (req.user.phone_confirmed_at && `+${req.user.phone}` === phone) {
    return res.json({ success: true, alreadyVerified: true, phone });
  }
  const token = req.get("authorization").split(" ")[1];
  const r = await gotrue("user", "PUT", token, { phone });
  if (!r.ok) return res.status(r.status === 429 ? 429 : 400).json({ success: false, message: phoneError(r.data, r.status) });
  return res.json({ success: true, phone });
});

router.post("/phone/verify", requireAuth, async (req, res) => {
  const phone = toUsE164(req.body?.phone);
  const code = String(req.body?.code || "").replace(/\D/g, "");
  if (!phone || !/^\d{4,8}$/.test(code)) {
    return res.status(400).json({ success: false, message: "Enter the code from the text message." });
  }
  const token = req.get("authorization").split(" ")[1];
  const r = await gotrue("verify", "POST", token, { type: "phone_change", phone, token: code });
  if (!r.ok) return res.status(400).json({ success: false, message: phoneError(r.data, r.status) });

  // Keep the profile's copy in step with the verified number (admins and the
  // trial check read it from there).
  const { error } = await supabase.from("profiles").update({ mobile: phone }).eq("id", req.user.id);
  if (error) console.error("Saving verified mobile on profile failed", error.message);
  return res.json({ success: true, phone });
});

router.post("/logout", requireAuth, async (req, res) => {
  const token = req.get("authorization").split(" ")[1];
  // Revokes the refresh token server-side; the browser drops its copy anyway.
  const { error } = await supabase.auth.admin.signOut(token, "local");
  if (error) console.error("Sign-out failed", error.message);
  return res.json({ success: true });
});

export default router;
