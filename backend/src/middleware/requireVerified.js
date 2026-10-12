// Chain after requireAuth. A user can't start a free trial, pay, or use the
// app until BOTH their email and their mobile number are verified. The flags
// come from Supabase Auth (email_confirmed_at / phone_confirmed_at on the
// user requireAuth already loaded), so they can't be set by the user.
export function isVerified(user) {
  return Boolean(user?.email_confirmed_at && user?.phone && user?.phone_confirmed_at);
}

export function requireVerified(req, res, next) {
  if (isVerified(req.user)) return next();
  return res.status(403).json({
    success: false,
    code: "VERIFICATION_REQUIRED",
    message: req.user?.email_confirmed_at
      ? "Please verify your mobile number to continue."
      : "Please verify your email address to continue.",
  });
}
