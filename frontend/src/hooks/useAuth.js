import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DEV_PREVIEW, PREVIEW_USER } from '../devPreview'

export function useAuth() {
  const [user, setUser] = useState(DEV_PREVIEW ? PREVIEW_USER : null)
  const [loading, setLoading] = useState(!DEV_PREVIEW)

  useEffect(() => {
    // Dev preview: hand back a stub session so the signed-in UI can be
    // reviewed without Supabase. Compiled out of production builds.
    if (DEV_PREVIEW) return

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
