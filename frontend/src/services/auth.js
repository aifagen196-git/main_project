import { auth } from '../lib/authClient'
import { DEV_PREVIEW } from '../devPreview'

// All of these go through the backend's /api/auth routes (lib/authClient.js);
// the browser never talks to Supabase directly.

export async function signUp(email, password, { firstName, lastName, mobile, areaOfInterest }) {
  // The matching profiles row is created by the handle_new_user database
  // trigger from this metadata (supabase/migrations/0021_signup_details.sql).
  return auth.signUp(email, password, {
    first_name: firstName,
    last_name: lastName,
    mobile,
    area_of_interest: areaOfInterest
  })
}

export async function signIn(email, password) {
  return auth.signIn(email, password)
}

export async function sendPasswordReset(email) {
  return auth.sendPasswordReset(email)
}

export async function updatePassword(newPassword) {
  if (DEV_PREVIEW) {
    // The preview user has no real session (see devPreview.js), so a genuine
    // call would 401. Resolve like a real save so the Settings UI's
    // loading/success states can still be exercised.
    await new Promise((r) => setTimeout(r, 300))
    return
  }
  return auth.updatePassword(newPassword)
}

export async function signOut() {
  return auth.signOut()
}
