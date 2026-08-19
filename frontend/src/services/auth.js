import { supabase } from '../lib/supabase'
import { DEV_PREVIEW } from '../devPreview'

export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })

  if (error) throw error

  // NOTE: the matching profiles row is created automatically by the
  // `handle_new_user` database trigger (see supabase/migrations/0001_subscriptions.sql).
  // No client-side insert is needed, which also works when email confirmation is on.

  return data
}

export async function signIn(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    })

  if (error) {
    throw error
  }

  return data
}

export async function updatePassword(newPassword) {
  if (DEV_PREVIEW) {
    // The preview user has no real Supabase session (see devPreview.js), so
    // a genuine updateUser() call would 401. Resolve like a real save so the
    // Settings UI's loading/success states can still be exercised.
    await new Promise((r) => setTimeout(r, 300))
    return { user: null }
  }

  // No backend route needed — this goes straight to Supabase Auth against
  // the current session, the same as sign-in/sign-up above. Supabase does
  // not require the current password to authorize the change; being signed
  // in already is enough.
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const { error } =
    await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  return user
}