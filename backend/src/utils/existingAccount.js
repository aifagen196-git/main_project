// Supabase answers a sign-up for an email that already has an account with a
// normal-looking "success" and creates nothing, so the reply can't be used to
// find out which emails are registered. We tell the person instead (the
// sign-up route's per-IP limit keeps that slow to abuse).
//
// Returns "confirmed" (account exists and is confirmed), "unconfirmed" (it
// exists, was never confirmed, and Supabase has re-sent the confirmation
// link) or null (a genuinely new account).
export function existingAccount(user, session, now = Date.now()) {
  if (!user || session) return null;
  if (Array.isArray(user.identities) && user.identities.length === 0) return "confirmed";
  const age = now - new Date(user.created_at).getTime();
  if (!user.email_confirmed_at && age > 60_000) return "unconfirmed";
  return null;
}
