import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null
      // Supabase re-fires SIGNED_IN / TOKEN_REFRESHED every time the tab
      // regains focus, handing back a brand-new user object with the same id.
      // Only update state when the identity actually changes, so the `user`
      // reference stays stable and downstream effects don't refetch on focus.
      setUser((prev) => (prev?.id === next?.id ? prev : next))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
