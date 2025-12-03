import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { Spinner } from '@/components/ui/spinner'

export default function Home() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (user) {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/landing', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  )
}
