import { rateLimit } from "express-rate-limit";

// Behind Caddy every request arrives from the proxy's IP, so an IP key put
// ALL users in one shared bucket. These limiters run after requireAuth, so
// key on the user instead.
const byUser = (req) => req.user?.id || "anonymous";

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator: byUser,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
    message: { success: false, message },
  });

export const matchRateLimiter = limiter(
  60 * 1000,
  30,
  "Too many matching requests. Please try again shortly.",
);

// Default ceiling for every signed-in API route.
export const apiRateLimiter = limiter(
  60 * 1000,
  120,
  "Too many requests. Please slow down and try again in a minute.",
);

// Uploads and AI-backed actions cost real money per call.
export const heavyRateLimiter = limiter(
  10 * 60 * 1000,
  20,
  "Too many uploads or AI requests. Please try again in a few minutes.",
);

// Signed-out routes key on the client IP. Caddy sets X-Forwarded-For to the
// real client IP (and the API container is not reachable from outside), so
// the LAST entry is the one to trust; any earlier entries are client-supplied.
export const clientIp = (req) => {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff[xff.length - 1] || req.socket.remoteAddress || "unknown";
};
const byClientIp = clientIp;

// Session refresh: a tab refreshes about once an hour, so 60 per 10 minutes
// per IP is plenty for an office of users, and keeps one client from using
// up Supabase's token allowance.
export const refreshRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  keyGenerator: byClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: { success: false, message: "Too many requests. Please try again in a few minutes." },
});

// Per-account limits. The per-IP limits above don't stop guessing spread
// over many addresses, so these count attempts against one email or user,
// whichever address they come from. `count` picks which replies count:
// "failures" (wrong password / code) or "successes" (an email was sent).
const emailKey = (req) => String(req.body?.email || "").trim().toLowerCase().slice(0, 254) || "none";

const perAccount = ({ windowMs, limit, key, message, count = "failures" }) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator: key,
    skipSuccessfulRequests: count === "failures",
    skipFailedRequests: count === "successes",
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
    message: { success: false, message },
  });

// Password guessing on one account: 10 wrong passwords per 15 minutes.
export const loginAccountLimiter = perAccount({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  key: (req) => `login:${emailKey(req)}`,
  message: "Too many failed sign-in attempts for this account. Wait 15 minutes, or reset your password.",
});

// Emails sent to one address (reset links, sign-up confirmations): 5 an hour
// across both, so nobody can flood someone's inbox or use up the project's
// email quota. A mistyped form (an error reply) doesn't count.
export const emailAccountLimiter = perAccount({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  key: (req) => `email:${emailKey(req)}`,
  count: "successes",
  message: "Too many requests for this email address. Please try again in an hour.",
});

// Authenticator-code guessing on one account: 10 wrong codes per 15 minutes.
// Runs after requireAuth.
export const mfaAccountLimiter = perAccount({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  key: (req) => `mfa:${req.user?.id || "anonymous"}`,
  message: "Too many wrong codes. Please wait 15 minutes and try again.",
});

// Current-password guessing through the password change form: 5 wrong per
// 15 minutes per account. Runs after requireAuth.
export const passwordChangeLimiter = perAccount({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  key: (req) => `pwchange:${req.user?.id || "anonymous"}`,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

// Login / sign-up / forgot-password: tight, to slow password guessing and
// email spam.
export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: byClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: { success: false, message: "Too many attempts. Please wait a few minutes and try again." },
});

// Token refresh and the other session calls happen in the background for
// every signed-in tab, so they get more room.
export const sessionRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 300,
  keyGenerator: byClientIp,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  message: { success: false, message: "Too many requests. Please try again in a few minutes." },
});
