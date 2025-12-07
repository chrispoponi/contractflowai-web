import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSupabaseSession } from './useSupabaseSession'

export function usePostLoginRedirect() {
  const { session, isLoading } = useSupabaseSession()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLoading) return

    if (session) {
      const cameFromAuthPage = ['/login', '/signup', '/pricing'].includes(location.pathname)

      if (cameFromAuthPage) {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [session, isLoading, location.pathname, navigate])
}
