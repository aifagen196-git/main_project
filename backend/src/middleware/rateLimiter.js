import { rateLimit } from "express-rate-limit";

export const matchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many matching requests. Please try again shortly.",
  },
});
