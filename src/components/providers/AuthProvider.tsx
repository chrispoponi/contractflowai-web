import { createContext, useContext } from 'react'
import { useSupabaseSession } from '../../hooks/useSupabaseSession'

const AuthContext = createContext(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSupabaseSession()

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
