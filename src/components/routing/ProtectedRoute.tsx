import { Navigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return null

  if (!session) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
