import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { listReferrals, attachReferral as attachReferralRecord } from '@/lib/supabase/queries/referrals'
import { toDisplayDate } from '@/utils/dates'

export default function Referrals() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [source, setSource] = useState('')
  const [contractId, setContractId] = useState('')

  const {
    data: referralsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['referrals', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listReferrals(user!.id)
  })

  const referrals = Array.isArray(referralsData) ? referralsData : []

  const attachReferral = useMutation({
    mutationFn: async () => {
      if (!contractId || !source.trim()) throw new Error('Contract and source required')
      await attachReferralRecord(contractId, { referral_source: source })
    },
    onSuccess: () => {
      toast({ title: 'Referral saved' })
      setSource('')
      setContractId('')
      queryClient.invalidateQueries({ queryKey: ['referrals', user?.id] }).catch(() => {})
    },
    onError: (error) => toast({ title: 'Unable to save', description: error.message, variant: 'destructive' })
  })

  const syncPartners = useMutation({
    mutationFn: async () => {
      await supabase.functions.invoke('referralSystem', { body: { userId: user?.id } })
    },
    onSuccess: () => toast({ title: 'Referral sync queued' }),
    onError: (error) => toast({ title: 'Sync failed', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="space-y-6 px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Attach referral source</CardTitle>
          <p className="text-sm text-slate-500">Stored in Supabase with typed inserts.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Contract ID" value={contractId} onChange={(event) => setContractId(event.target.value)} />
          <Input placeholder="Referral partner (e.g., lender)" value={source} onChange={(event) => setSource(event.target.value)} />
          <Button onClick={() => attachReferral.mutate()} disabled={attachReferral.isPending}>
            {attachReferral.isPending ? 'Saving…' : 'Save referral'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referral partners</CardTitle>
          <Button variant="outline" size="sm" onClick={() => syncPartners.mutate()} disabled={syncPartners.isPending}>
            Sync Supabase Edge function
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-red-600">Unable to load referrals: {error.message}</p>}
          {isLoading && <p className="text-sm text-slate-500">Loading referrals…</p>}
          {!isLoading && referrals.length === 0 && (
            <p className="text-sm text-slate-500">No referrals recorded yet.</p>
          )}
          {!isLoading &&
            referrals.map((referral) => (
              <div key={referral.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold text-slate-900">{referral.referral_source ?? 'Referral source pending'}</p>
                <p className="text-slate-500">{referral.property_address ?? 'Contract'}</p>
                <p className="text-xs text-slate-400">
                  Added {referral.created_at ? toDisplayDate(referral.created_at) : 'recently'}
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
