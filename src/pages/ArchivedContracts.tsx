import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Tables } from '@/lib/supabase'

export default function ArchivedContractsPage() {
  const { user } = useAuth()

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['archived-contracts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', user!.id)
        .in('status', ['closed', 'cancelled'])
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Tables<'contracts'>[]
    }
  })

  return (
    <div className="px-4 py-8 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Archived contracts</CardTitle>
          <p className="text-sm text-slate-500">Contracts filtered via RLS to include only your records.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {!isLoading && contracts.length === 0 && <p className="text-sm text-slate-500">No archived contracts yet.</p>}
          {contracts.map((contract) => (
            <Link key={contract.id} to={`/contracts/${contract.id}`} className="flex flex-col rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{contract.title}</p>
                  <p className="text-sm text-slate-500">{contract.property_address}</p>
                </div>
                <Badge>{contract.status.replace('_', ' ')}</Badge>
              </div>
              <p className="text-xs text-slate-500">Closed {contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : 'n/a'}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
