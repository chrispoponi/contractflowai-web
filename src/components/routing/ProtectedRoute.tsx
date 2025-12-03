import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSupabaseSession } from '@/hooks/useSupabaseSession'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSupabaseSession()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}
