// Chain after requireAuth. A user can't start a free trial, pay, or use the
// app until their email address is verified. The flag comes from Supabase Auth
// (email_confirmed_at on the user requireAuth already loaded), so it can't be
// set by the user. The mobile number is collected at sign-up but not verified.
export function isVerified(user) {
  return Boolean(user?.email_confirmed_at);
}

export function requireVerified(req, res, next) {
  if (isVerified(req.user)) return next();
  return res.status(403).json({
    success: false,
    code: "VERIFICATION_REQUIRED",
    message: "Please verify your email address to continue.",
  });
}
