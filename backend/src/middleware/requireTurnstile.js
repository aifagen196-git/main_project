import { turnstileSiteKey, verifyTurnstile } from "../utils/turnstile.js";
import { clientIp } from "./rateLimiter.js";

// Refuses the request unless it carries a valid Turnstile token
// (body.captchaToken) for this form. Off while the keys aren't set.
export const requireTurnstile = (action, verify = verifyTurnstile) => async (req, res, next) => {
  if (!turnstileSiteKey()) return next();
  const r = await verify(req.body?.captchaToken, { ip: clientIp(req), action });
  if (r.ok) return next();
  if (r.reason !== "missing") console.warn(`Turnstile refused on ${action}: ${r.reason}`);
  const message =
    r.reason === "missing"
      ? "Please complete the security check."
      : r.reason === "unreachable"
        ? "We couldn't run the security check just now. Please try again in a moment."
        : "The security check expired or didn't pass. Please try again.";
  return res.status(r.reason === "unreachable" ? 503 : 400).json({ success: false, code: "CAPTCHA_FAILED", message });
};
