import { useEffect, useState } from 'react'
import { auth } from '../lib/authClient'
import { DEV_PREVIEW, PREVIEW_USER } from '../devPreview'

export function useAuth() {
  const [user, setUser] = useState(DEV_PREVIEW ? PREVIEW_USER : auth.getUser())
  const [loading, setLoading] = useState(!DEV_PREVIEW)

  useEffect(() => {
    // Dev preview: hand back a stub session so the signed-in UI can be
    // reviewed without a backend. Compiled out of production builds.
    if (DEV_PREVIEW) return

    let mounted = true

    const unsubscribe = auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null
      // Token refreshes hand back a new user object with the same id. Only
      // update state when the identity actually changes, so the `user`
      // reference stays stable and downstream effects don't refetch.
      setUser((prev) => (prev?.id === next?.id ? prev : next))
    })

    // An email link (sign-up confirmation / password reset) may have brought
    // tokens in the URL; take those first, then make sure the stored session
    // is still usable.
    auth
      .consumeUrlSession()
      .then(() => auth.getSession())
      .finally(() => {
        if (!mounted) return
        setUser((prev) => {
          const next = auth.getUser()
          return prev?.id === next?.id ? prev : next
        })
        setLoading(false)
      })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return { user, loading }
}
