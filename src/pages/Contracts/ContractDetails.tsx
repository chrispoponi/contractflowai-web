import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/ui/use-toast'
import EditContractModal from '@/components/contracts/EditContractModal'
import UploadCounterOfferModal from '@/components/contracts/UploadCounterOfferModal'
import CancelContractModal from '@/components/contracts/CancelContractModal'
import TransactionChecklist, { ChecklistField } from '@/components/contracts/TransactionChecklist'
import ContractDeadlines from '@/components/ContractDeadlines'
import { Separator } from '@/components/ui/separator'
import { FileText, Loader2 } from 'lucide-react'
import { CalendarContract, handleCalendarDownload } from '@/utils/calendar'
import { fetchContract, listCounterOffers, updateContract as updateContractRecord } from '@/lib/supabase/queries/contracts'

const statusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  under_contract: 'bg-blue-100 text-blue-800',
  inspection: 'bg-amber-100 text-amber-800',
  financing: 'bg-indigo-100 text-indigo-800',
  closing: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-green-100 text-green-800',
  cancelled: 'bg-rose-100 text-rose-800',
  uploaded: 'bg-slate-100 text-slate-700',
  text_extracted: 'bg-blue-100 text-blue-800',
  parsed_primary: 'bg-emerald-100 text-emerald-800',
  parsed_fallback: 'bg-amber-100 text-amber-800',
  validated: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  error: 'bg-rose-200 text-rose-800'
}

type ParsedSummary = {
  executive_summary?: string
  parties?: {
    buyer?: string | null
    seller?: string | null
    agents?: string | null
  }
  deadlines?: { name: string; date: string | null }[]
  risks?: { severity?: string; description?: string }[]
}

type Contract = Tables<'contracts'>

const DEADLINE_FIELDS = [
  { label: 'Inspection', dateField: 'inspection_date', completedField: 'inspection_completed' },
  { label: 'Inspection Response', dateField: 'inspection_response_date', completedField: 'inspection_response_completed' },
  { label: 'Appraisal', dateField: 'appraisal_date', completedField: 'appraisal_completed' },
  { label: 'Loan Contingency', dateField: 'loan_contingency_date', completedField: 'loan_contingency_completed' },
  { label: 'Final Walkthrough', dateField: 'final_walkthrough_date', completedField: 'final_walkthrough_completed' },
  { label: 'Closing', dateField: 'closing_date', completedField: 'closing_completed' }
] as const

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
    queryFn: () => fetchContract(contractId!, user!.id)
  })

  const { data: counterOffers = [] } = useQuery({
    queryKey: ['counterOffers', contractId],
    enabled: Boolean(contractId && user?.id),
    queryFn: () => listCounterOffers(contractId!)
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Contract>) => {
      if (!contractId) return
      await updateContractRecord(contractId, { ...updates, updated_at: new Date().toISOString() })
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
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'cancelled', ai_summary: `${contract?.ai_summary ?? ''}\nCancelled: ${reason} - ${notes}` })
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
    if (!contract?.contract_file_url) return
    const { data, error } = await supabase.storage.from('contracts').createSignedUrl(contract.contract_file_url, 60)
    if (error || !data?.signedUrl) {
      toast({ title: 'Unable to create download link', variant: 'destructive' })
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleChecklistToggle = async (field: ChecklistField, nextValue: boolean) => {
    await updateMutation.mutateAsync({ [field]: nextValue } as Partial<Contract>)
  }

  const summaryPath = contract?.summary_path
  const metadataPath = summaryPath ? summaryPath.replace('summary.json', 'metadata.json') : null

  const { data: parsedSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['contract-summary', summaryPath],
    enabled: Boolean(summaryPath),
    queryFn: async () => {
      if (!summaryPath) return null
      const { data, error } = await supabase.storage.from('contracts').download(summaryPath)
      if (error || !data) throw error ?? new Error('Unable to download summary')
      const text = await data.text()
      return JSON.parse(text) as ParsedSummary
    }
  })

  const { data: metadata } = useQuery({
    queryKey: ['contract-summary-metadata', metadataPath],
    enabled: Boolean(metadataPath),
    queryFn: async () => {
      if (!metadataPath) return null
      const { data, error } = await supabase.storage.from('contracts').download(metadataPath)
      if (error || !data) throw error ?? new Error('Unable to download metadata')
      const text = await data.text()
      return JSON.parse(text) as Record<string, unknown>
    }
  })

  const deadlineList = useMemo(() => {
    if (!contract) return []

    return DEADLINE_FIELDS.map(({ label, dateField, completedField }) => {
      const date = contract[dateField as keyof Contract] as string | null
      const completed = Boolean(contract[completedField as keyof Contract])
      return { label, date, completed }
    })
  }, [contract])

const summaryText =
  contract?.plain_language_summary ??
  contract?.ai_summary ??
  parsedSummary?.executive_summary ??
  'No summary available.'

const displayTitle = contract?.title ?? contract?.property_address ?? `Contract ${contract?.id ?? ''}`
const displayClient = contract?.buyer_name ?? contract?.seller_name ?? 'N/A'

const calendarContract: CalendarContract | null = contract
  ? {
      id: contract.id,
      title: displayTitle,
      propertyAddress: contract.property_address ?? null,
      summary: summaryText,
      deadlines: deadlineList.map(({ label, date }) => ({ label, date }))
    }
  : null

const canDownloadCalendar = Boolean(calendarContract?.deadlines?.some((deadline) => !!deadline.date))

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
            <CardTitle className="text-2xl font-semibold text-slate-900">{displayTitle}</CardTitle>
            <p className="text-sm text-slate-500">{contract.property_address ?? 'Address not provided'}</p>
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
              <p className="text-base font-medium text-slate-900">{displayClient}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Closing date</p>
              <p className="text-base font-medium text-slate-900">{contract.closing_date ?? 'TBD'}</p>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!contract.contract_file_url}>
              <FileText className="mr-2 h-4 w-4" /> Download original
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <TransactionChecklist contract={contract} onToggle={handleChecklistToggle} />
        <Card>
          <CardHeader>
            <CardTitle>Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractDeadlines deadlines={deadlineList} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Summary</CardTitle>
          {metadata && (
            <p className="text-xs text-slate-500">
              Model: {metadata.model ?? 'n/a'} • Generated:{' '}
              {metadata.generated_at ? new Date(metadata.generated_at as string).toLocaleString() : 'n/a'} • Fallback:{' '}
              {metadata.usedFallback ? 'Yes' : 'No'}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Summary</p>
            <p className="text-base text-slate-900 whitespace-pre-wrap">{summaryText}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => calendarContract && handleCalendarDownload(calendarContract)}
              disabled={!canDownloadCalendar}
            >
              Download .ics
            </Button>
          </div>

          {summaryLoading && <p className="text-sm text-slate-500">Loading detailed summary…</p>}
          {!summaryLoading && !parsedSummary && (
            <p className="text-sm text-slate-500">No additional AI insights available yet.</p>
          )}

          {parsedSummary && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Buyer</p>
                  <p className="text-sm text-slate-900">{parsedSummary.parties?.buyer ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Seller</p>
                  <p className="text-sm text-slate-900">{parsedSummary.parties?.seller ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Agents</p>
                  <p className="text-sm text-slate-900">{parsedSummary.parties?.agents ?? '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Deadlines</p>
                <div className="mt-2 space-y-2">
                  {(parsedSummary.deadlines ?? []).length === 0 && <p className="text-sm text-slate-500">No deadlines extracted.</p>}
                  {(parsedSummary.deadlines ?? []).map((deadline, index) => (
                    <div key={`${deadline.name}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-900">{deadline.name}</span>
                      <span className="text-slate-600">{deadline.date ?? 'TBD'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Risk highlights</p>
                <div className="mt-2 space-y-2">
                  {(parsedSummary.risks ?? []).length === 0 && <p className="text-sm text-slate-500">No risk items flagged.</p>}
                  {(parsedSummary.risks ?? []).map((risk, index) => (
                    <div key={`${risk.description}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                        {risk.severity ?? 'info'}
                      </span>
                      <span className="text-slate-700">{risk.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
        userId={user!.id}
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
