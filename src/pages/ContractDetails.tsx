import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/ui/use-toast'
import EditContractModal from '@/components/contracts/EditContractModal'
import UploadCounterOfferModal from '@/components/contracts/UploadCounterOfferModal'
import CancelContractModal from '@/components/contracts/CancelContractModal'
import TransactionChecklist from '@/components/contracts/TransactionChecklist'
import { Separator } from '@/components/ui/separator'
import { ExternalLink, FileText, Loader2 } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  under_contract: 'bg-blue-100 text-blue-800',
  inspection: 'bg-amber-100 text-amber-800',
  financing: 'bg-indigo-100 text-indigo-800',
  closing: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-green-100 text-green-800',
  cancelled: 'bg-rose-100 text-rose-800'
}

type Contract = Tables<'contracts'>

type TimelineRecord = Record<string, boolean>

export default function ContractDetails() {
  const { contractId } = useParams<{ contractId: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [counterOfferOpen, setCounterOfferOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const {
    data: contract,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['contract', contractId],
    enabled: Boolean(contractId && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId!)
        .eq('owner_id', user!.id)
        .single()
      if (error) throw error
      return data as Contract
    }
  })

  const { data: counterOffers = [] } = useQuery({
    queryKey: ['counterOffers', contractId],
    enabled: Boolean(contractId && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('parent_contract_id', contractId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Contract[]
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: TablesUpdate<'contracts'>) => {
      if (!contractId) return
      const { error } = await supabase
        .from('contracts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', contractId)
      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contract', contractId] }),
        queryClient.invalidateQueries({ queryKey: ['contracts', user?.id] })
      ])
      toast({ title: 'Contract updated' })
    },
    onError: (error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' })
    }
  })

  const cancelMutation = useMutation({
    mutationFn: async ({ reason, notes }: { reason: string; notes: string }) => {
      if (!contractId) return
      const timeline = (contract?.timeline as TimelineRecord | null) ?? {}
      timeline[`cancel_${Date.now()}`] = true
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'cancelled', ai_summary: `${contract?.ai_summary ?? ''}\nCancelled: ${reason} - ${notes}`, timeline })
        .eq('id', contractId)
      if (error) throw error
    },
    onSuccess: async () => {
      setCancelOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
      toast({ title: 'Contract cancelled' })
      navigate('/contracts/archived')
    },
    onError: (error) => toast({ title: 'Cancellation failed', description: error.message, variant: 'destructive' })
  })

  const handleDownload = async () => {
    if (!contract?.storage_path) return
    const { data, error } = await supabase.storage.from('contracts').createSignedUrl(contract.storage_path, 60)
    if (error || !data?.signedUrl) {
      toast({ title: 'Unable to create download link', variant: 'destructive' })
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleTimelineToggle = async (taskId: string, nextValue: boolean) => {
    const timeline = { ...(((contract?.timeline ?? {}) as TimelineRecord) ?? {}) }
    timeline[taskId] = nextValue
    await updateMutation.mutateAsync({ timeline })
  }

  const timelineItems = useMemo(() => {
    if (!contract?.timeline) return []
    return Object.entries(contract.timeline as Record<string, unknown>)
  }, [contract?.timeline])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (isError || !contract) {
    return <p className="p-8 text-center text-sm text-slate-500">Contract not found or access denied (RLS enforced).</p>
  }

  return (
    <div className="space-y-6 px-4 py-8 lg:px-8">
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-slate-900">{contract.title}</CardTitle>
            <p className="text-sm text-slate-500">{contract.property_address}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColors[contract.status] ?? 'bg-slate-100 text-slate-700'}>{contract.status.replace('_', ' ')}</Badge>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              Edit details
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCounterOfferOpen(true)}>
              Upload counter-offer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}>
              Cancel contract
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Client</p>
              <p className="text-base font-medium text-slate-900">{contract.client_name ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Closing date</p>
              <p className="text-base font-medium text-slate-900">{contract.closing_date ?? 'TBD'}</p>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!contract.storage_path}>
              <FileText className="mr-2 h-4 w-4" /> Download original
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void supabase.functions
                  .invoke('generateClientTimeline', { body: { contractId: contract.id, ownerId: user?.id } })
                  .then(() => toast({ title: 'Timeline requested' }))
                  .catch((error) => toast({ title: 'Timeline error', description: error.message, variant: 'destructive' }))
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Regenerate timeline
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <TransactionChecklist contract={contract} onToggle={handleTimelineToggle} />
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timelineItems.length === 0 && <p className="text-sm text-slate-500">No timeline events tracked yet.</p>}
            {timelineItems.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{key}</p>
                <p className="text-slate-500">{String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Counter-offers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {counterOffers.length === 0 && <p className="text-sm text-slate-500">No counter-offers uploaded.</p>}
          {counterOffers.map((offer) => (
            <div key={offer.id} className="rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{offer.title}</p>
                  <p className="text-slate-500">Uploaded {new Date(offer.created_at).toLocaleDateString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!offer.counter_offer_path) return
                    const { data, error } = await supabase.storage.from('counter_offers').createSignedUrl(offer.counter_offer_path, 60)
                    if (error || !data?.signedUrl) {
                      toast({ title: 'Unable to download counter-offer', variant: 'destructive' })
                      return
                    }
                    window.open(data.signedUrl, '_blank')
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <EditContractModal
        contract={contract}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={async (updates) => {
          setEditOpen(false)
          await updateMutation.mutateAsync(updates)
        }}
      />

      <UploadCounterOfferModal
        contractId={contract.id}
        counterOfferCount={counterOffers.length}
        open={counterOfferOpen}
        onClose={() => setCounterOfferOpen(false)}
        onUploaded={async () => {
          setCounterOfferOpen(false)
          await queryClient.invalidateQueries({ queryKey: ['counterOffers', contractId] })
        }}
      />

      <CancelContractModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancel={(reason, notes) => cancelMutation.mutate({ reason, notes })}
      />
    </div>
  )
}
