import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import UploadCounterOfferModal from '@/components/contracts/UploadCounterOfferModal'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Spinner } from '@/components/ui/spinner'

export default function UploadCounterOffer() {
  const { contractId } = useParams<{ contractId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [counterOfferCount, setCounterOfferCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contractId) return
    let isMounted = true
    const fetchCount = async () => {
      const { error, count } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('parent_contract_id', contractId)
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }
      if (!isMounted) return
      setCounterOfferCount(count ?? 0)
      setLoading(false)
    }
    fetchCount()
    return () => {
      isMounted = false
    }
  }, [contractId])

  if (!session?.user || !contractId) {
    navigate('/dashboard', { replace: true })
    return null
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <UploadCounterOfferModal
      contractId={contractId}
      counterOfferCount={counterOfferCount}
      userId={session.user.id}
      open
      onClose={() => navigate(-1)}
      onUploaded={() => setCounterOfferCount((prev) => prev + 1)}
    />
  )
}
