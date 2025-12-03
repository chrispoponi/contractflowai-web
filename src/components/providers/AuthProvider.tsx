import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'

const AuthContext = createContext<ReturnType<typeof useSupabaseSession> | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseSession()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
