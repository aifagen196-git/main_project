import { useCallback, useEffect, useState } from 'react'
import { getProfile } from '../services/profile'
import { auth } from '../lib/authClient'
import { DEV_PREVIEW, PREVIEW_PROFILE } from '../devPreview'

export function useProfile(user) {
  const [profile, setProfile] = useState(DEV_PREVIEW ? PREVIEW_PROFILE : null)
  const [loading, setLoading] = useState(!DEV_PREVIEW)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) return
    setError(null)
    setLoading(true)
    try {
      const data = await getProfile(user.id)
      setProfile(data)
      return data
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load your account.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    // Dev preview: serve a stub profile and skip the realtime subscription,
    // since there is no Supabase session. Compiled out of production builds.
    if (DEV_PREVIEW) return

    let active = true
    if (!user) {
      setProfile(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    getProfile(user.id)
      .then((data) => {
        if (active) setProfile(data)
      })
      .catch(async (err) => {
        console.error(err)
        // A 401 that survived the client's refresh-and-retry means the session
        // is truly invalid — sign out so the user lands on a clean login.
        if (err.status === 401) {
          await auth.signOut()
          return
        }
        if (active) setError(err.message || 'Could not load your account.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    // Pick up plan changes made elsewhere (payment webhook, an admin) when the
    // user comes back to the tab. Checkout itself refreshes explicitly.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      getProfile(user.id)
        .then((data) => {
          if (active) setProfile(data)
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.id])

  return { profile, loading, error, refresh }
}
