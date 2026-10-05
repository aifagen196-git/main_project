import express from "express";
import { createClient } from "@supabase/supabase-js";

import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

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
  const { data, error } = await authClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteOrigin(req)}/`,
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        mobile: str(d.mobile, 20),
        area_of_interest: str(d.area_of_interest, 40),
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

router.post("/logout", requireAuth, async (req, res) => {
  const token = req.get("authorization").split(" ")[1];
  // Revokes the refresh token server-side; the browser drops its copy anyway.
  const { error } = await supabase.auth.admin.signOut(token, "local");
  if (error) console.error("Sign-out failed", error.message);
  return res.json({ success: true });
});

export default router;
