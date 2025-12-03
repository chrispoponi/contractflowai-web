import { useMemo } from 'react'
import { TrendingUp, CalendarDays, FileText, Sparkles } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import StatsOverview from '@/components/dashboard/StatsOverview'
import ContractsList from '@/components/dashboard/ContractsList'
import UpcomingDates, { type UpcomingEvent } from '@/components/dashboard/UpcomingDates'

const MAX_EVENTS = 5

type Contract = Tables<'contracts'>

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    data: contracts = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['contracts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Contract[]
    }
  })

  const timelineMutation = useMutation({
    mutationFn: async (contractId: string) => {
      await supabase.functions.invoke('generateClientTimeline', {
        body: { contractId, ownerId: user?.id }
      })
    },
    onSuccess: () => {
      toast({ title: 'Timeline requested', description: 'We will refresh automatically once ready.' })
      void refetch()
    },
    onError: (error) => {
      toast({ title: 'Timeline error', description: error.message, variant: 'destructive' })
    }
  })

  const referralSync = useMutation({
    mutationFn: async () => {
      await supabase.functions.invoke('referralSystem', {
        body: { ownerId: user?.id }
      })
    },
    onSuccess: () => {
      toast({ title: 'Referral sync queued', description: 'Check Referrals for updates.' })
    },
    onError: (error) => {
      toast({ title: 'Referral sync failed', description: error.message, variant: 'destructive' })
    }
  })

  const stats = useMemo(() => {
    if (!contracts.length) {
      return {
        active: 0,
        closingSoon: 0,
        closed: 0,
        pipeline: 0
      }
    }

    const active = contracts.filter((contract) => contract.status !== 'closed' && contract.status !== 'cancelled')
    const closingSoon = active.filter((contract) => {
      if (!contract.closing_date) return false
      const daysUntil = (new Date(contract.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return daysUntil <= 14 && daysUntil >= 0
    })
    const closed = contracts.filter((contract) => contract.status === 'closed')
    const pipeline = active.reduce((total, contract) => total + (contract.purchase_price ?? 0), 0)

    return {
      active: active.length,
      closingSoon: closingSoon.length,
      closed: closed.length,
      pipeline
    }
  }, [contracts])

  const upcomingEvents: UpcomingEvent[] = useMemo(() => {
    return contracts
      .flatMap((contract) => {
        const events: UpcomingEvent[] = []
        if (contract.inspection_date) {
          events.push({
            contractId: contract.id,
            property: contract.property_address ?? contract.title,
            date: contract.inspection_date,
            type: 'Inspection'
          })
        }
        if (contract.loan_contingency_date) {
          events.push({
            contractId: contract.id,
            property: contract.property_address ?? contract.title,
            date: contract.loan_contingency_date,
            type: 'Loan Contingency'
          })
        }
        if (contract.final_walkthrough_date) {
          events.push({
            contractId: contract.id,
            property: contract.property_address ?? contract.title,
            date: contract.final_walkthrough_date,
            type: 'Final Walkthrough'
          })
        }
        if (contract.closing_date) {
          events.push({
            contractId: contract.id,
            property: contract.property_address ?? contract.title,
            date: contract.closing_date,
            type: 'Closing'
          })
        }
        return events
      })
      .filter((event) => Boolean(event.date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, MAX_EVENTS)
  }, [contracts])

  const quickActionsDisabled = timelineMutation.isPending || referralSync.isPending

  return (
    <div className="space-y-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-slate-500">Overview</p>
        <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {user?.user_metadata?.full_name ?? user?.email}</h1>
        <p className="text-sm text-slate-500">Supabase-secured workspace with end-to-end typed access.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsOverview
          title="Active contracts"
          value={stats.active.toString()}
          icon={TrendingUp}
          color="indigo"
          isLoading={isLoading}
        />
        <StatsOverview
          title="Closing soon"
          value={stats.closingSoon.toString()}
          icon={CalendarDays}
          color="blue"
          isLoading={isLoading}
        />
        <StatsOverview
          title="Closed"
          value={stats.closed.toString()}
          icon={FileText}
          color="green"
          isLoading={isLoading}
        />
        <StatsOverview
          title="Pipeline volume"
          value={stats.pipeline ? `$${stats.pipeline.toLocaleString()}` : '$0'}
          icon={Sparkles}
          color="gold"
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-base">Supabase Edge Workflows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  disabled={quickActionsDisabled}
                  onClick={() => {
                    if (!contracts.length) {
                      toast({
                        title: 'No contracts yet',
                        description: 'Upload a contract before generating a timeline.'
                      })
                      return
                    }
                    timelineMutation.mutate(contracts[0].id)
                  }}
                >
                  {timelineMutation.isPending ? 'Generating timeline…' : 'Generate client timeline'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={quickActionsDisabled}
                  onClick={() => referralSync.mutate()}
                >
                  {referralSync.isPending ? 'Syncing referrals…' : 'Sync referral partners'}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Storage Health</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  Contracts are stored in Supabase buckets (`contracts`, `counter_offers`, `summaries`, `uploads`).
                </p>
              </CardContent>
            </Card>
          </div>

          <ContractsList contracts={contracts} isLoading={isLoading} />
        </div>
        <UpcomingDates events={upcomingEvents} isLoading={isLoading} />
      </div>
    </div>
  )
}
