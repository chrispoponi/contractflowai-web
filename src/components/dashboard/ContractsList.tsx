import { Link } from 'react-router-dom'
import { MapPinned, DollarSign, CalendarDays } from 'lucide-react'
import type { Tables } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const statusMap: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-800',
  under_contract: 'bg-blue-100 text-blue-800',
  inspection: 'bg-purple-100 text-purple-800',
  financing: 'bg-amber-100 text-amber-800',
  closing: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-green-100 text-green-800',
  cancelled: 'bg-rose-100 text-rose-800'
}

type Contract = Tables<'contracts'>

interface ContractsListProps {
  contracts: Contract[]
  isLoading?: boolean
}

export default function ContractsList({ contracts, isLoading }: ContractsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!contracts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No contracts yet. Start by uploading one.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Contracts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contracts.slice(0, 5).map((contract) => (
          <Link
            key={contract.id}
            to={`/contracts/${contract.id}`}
            className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-500 hover:bg-white"
          >
            <div>
              <div className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-indigo-600" />
                <p className="font-semibold text-slate-900">{contract.property_address ?? contract.title}</p>
              </div>
              <p className="text-sm text-slate-500">{contract.client_name ?? 'Client pending'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                {contract.purchase_price ? `$${contract.purchase_price.toLocaleString()}` : 'TBD'}
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                {contract.closing_date ? new Date(contract.closing_date).toLocaleDateString() : 'No date'}
              </div>
              <Badge className={statusMap[contract.status] ?? 'bg-slate-200 text-slate-800'}>
                {contract.status.replace('_', ' ')}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
