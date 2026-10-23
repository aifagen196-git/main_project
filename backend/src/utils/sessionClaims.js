// Reads claims from the caller's access token. Only use after requireAuth:
// it has already had Supabase Auth verify the token, so the payload can be
// trusted here without checking the signature again.
export function tokenClaims(req) {
  const token = (req.get("authorization") || "").split(" ")[1] || "";
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

// "aal2" once the session has passed a second factor (authenticator app);
// "aal1" for a password-only session.
export const assuranceLevel = (req) => tokenClaims(req).aal || "aal1";
