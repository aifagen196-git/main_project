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
