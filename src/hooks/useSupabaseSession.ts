import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const USER_CACHE_KEY = 'contractflowai:user'

type SessionState = {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

export function useSupabaseSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    const cached = sessionStorage.getItem(USER_CACHE_KEY)
    if (!cached) return null
    try {
      const parsed = JSON.parse(cached)
      return parsed
    } catch {
      sessionStorage.removeItem(USER_CACHE_KEY)
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const persistUser = useCallback((nextUser: User | null) => {
    if (typeof window === 'undefined') return
    if (nextUser) {
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(nextUser))
    } else {
      sessionStorage.removeItem(USER_CACHE_KEY)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    setLoading(true)
    const { data, error: authError } = await supabase.auth.getSession()
    if (authError) {
      setError(authError.message)
      setSession(null)
      setUser(null)
      persistUser(null)
      setLoading(false)
      return
    }

    setSession(data.session)
    setUser(data.session?.user ?? null)
    persistUser(data.session?.user ?? null)
    setError(null)
    setLoading(false)
  }, [persistUser])

  useEffect(() => {
    refreshUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      persistUser(nextSession?.user ?? null)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [persistUser, refreshUser])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    persistUser(null)
  }, [persistUser])

  return useMemo(
    () => ({ session, user, loading, error, refreshUser, signOut }),
    [error, loading, refreshUser, session, signOut, user]
  )
}
