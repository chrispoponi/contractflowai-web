import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSupabaseSession } from './useSupabaseSession'

export function usePostLoginRedirect() {
  const { session, isLoading } = useSupabaseSession()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLoading) return
    if (!session) return

    const from = (location.state as any)?.from as string | undefined
    if (from && typeof from === 'string') {
      navigate(from, { replace: true })
      return
    }

    const authRoutes = ['/', '/login', '/signup', '/pricing']
    if (authRoutes.includes(location.pathname)) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, isLoading, location.pathname, location.state, navigate])
}
