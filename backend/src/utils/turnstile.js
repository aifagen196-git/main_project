// Cloudflare Turnstile: the "are you human" check on sign-in and sign-up.
// Both keys come from the server's settings (TURNSTILE_SITE_KEY,
// TURNSTILE_SECRET_KEY); with either missing the check is off, which is how
// local development runs. Cloudflare's test keys work on any host:
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileSiteKey = () =>
  process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY : null;

/**
 * Asks Cloudflare whether a widget token is genuine. Tokens work once and
 * expire after 5 minutes. Returns { ok: true } or { ok: false, reason }, where
 * reason is "missing", "unreachable", "wrong-action" or Cloudflare's codes.
 */
export async function verifyTurnstile(token, { ip, action, fetchImpl = fetch } = {}) {
  if (typeof token !== "string" || !token || token.length > 2048) return { ok: false, reason: "missing" };
  let data;
  try {
    const res = await fetchImpl(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(10_000),
    });
    data = await res.json();
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (!data?.success) return { ok: false, reason: (data?.["error-codes"] || []).join(",") || "failed" };
  // A token from the sign-up form can't be spent on the login form.
  if (action && data.action && data.action !== action) return { ok: false, reason: "wrong-action" };
  return { ok: true };
}
