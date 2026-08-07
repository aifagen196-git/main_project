import { supabase } from '../lib/supabase'

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