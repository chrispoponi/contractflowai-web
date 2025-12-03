import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { supabase } from '@/lib/supabase/client'

type AuthContextValue = ReturnType<typeof useSupabaseSession> & {
  user: User | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseSession()
  const value: AuthContextValue = {
    ...auth,
    user: auth.session?.user ?? null,
    signOut: () => supabase.auth.signOut()
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
