import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { listUserSubscriptions, updateSubscription } from '@/lib/supabase/queries/subscriptions'

export default function AdminSubscriptions() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState('active')

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listUserSubscriptions(user!.id)
  })

  const mutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      await updateSubscription(subscriptionId, { status: selectedStatus })
    },
    onSuccess: () => {
      toast({ title: 'Subscription updated' })
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] }).catch(() => {})
    },
    onError: (error) => toast({ title: 'Update failed', description: error.message, variant: 'destructive' })
  })

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Subscription controls</CardTitle>
          <p className="text-sm text-slate-500">Supabase RLS ensures you only see your rows.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">Set status:</p>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading && <p className="text-sm text-slate-500">Loading subscriptions…</p>}
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{subscription.product}</p>
                <p className="text-xs text-slate-500">Status: {subscription.status}</p>
              </div>
              <Button size="sm" onClick={() => mutation.mutate(subscription.id)} disabled={mutation.isPending}>
                Apply status
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
