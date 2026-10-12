import { supabase } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "A valid Bearer token is required.",
    });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  // Anonymous Supabase sessions (no email, no password) are never our users —
  // sign-up only goes through /api/auth/signup.
  if (error || !user || user.is_anonymous) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }

  req.user = user;
  return next();
}
