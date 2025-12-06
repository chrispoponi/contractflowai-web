import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { MapPin, DollarSign, Calendar, Archive, XCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ContractsAPI } from '@/lib/supabase/queries/contracts'
import { formatCurrency } from '@/utils/formatters'
import type { Tables } from '@/lib/supabase'

type ContractRow = Tables<'contracts'>

export default function ArchivedContractsPage() {
  const { user } = useAuth()

  const { data: allContracts = [], isLoading } = useQuery({
    queryKey: ['archived-contracts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => ContractsAPI.listByUser(user!.id)
  })

  const archivedContracts = useMemo(
    () =>
      allContracts
        .filter((contract) => isArchived(contract))
        .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? '').getTime() - new Date(a.updated_at ?? a.created_at ?? '').getTime()),
    [allContracts]
  )
  const closedContracts = useMemo(
    () => archivedContracts.filter((contract) => contract.closing_completed || contract.status === 'closed'),
    [archivedContracts]
  )
  const cancelledContracts = useMemo(
    () => archivedContracts.filter((contract) => contract.status === 'cancelled'),
    [archivedContracts]
  )

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">📦 Archived Contracts</h1>
          <p className="text-gray-600">View completed and cancelled contracts</p>
        </header>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All ({archivedContracts.length})</TabsTrigger>
            <TabsTrigger value="closed">
              <Archive className="mr-2 h-4 w-4" />
              Closed ({closedContracts.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelled ({cancelledContracts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ArchiveSection
              title="All Archived Contracts"
              icon={<Archive className="h-5 w-5 text-gray-600" />}
              count={archivedContracts.length}
              contracts={archivedContracts}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="closed">
            <ArchiveSection
              title="Closed Contracts"
              icon={<Archive className="h-5 w-5 text-green-600" />}
              count={closedContracts.length}
              contracts={closedContracts}
              isLoading={isLoading}
              accent="green"
              subtitle="Successfully closed deals"
            />
          </TabsContent>

          <TabsContent value="cancelled">
            <ArchiveSection
              title="Cancelled Contracts"
              icon={<XCircle className="h-5 w-5 text-red-600" />}
              count={cancelledContracts.length}
              contracts={cancelledContracts}
              isLoading={isLoading}
              accent="red"
              subtitle="Deals that did not close"
              emptyIcon={<XCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function isArchived(contract: ContractRow) {
  return Boolean(contract.closing_completed) || contract.status === 'closed' || contract.status === 'cancelled'
}

type ArchiveSectionProps = {
  title: string
  icon: ReactNode
  subtitle?: string
  count: number
  contracts: ContractRow[]
  isLoading: boolean
  accent?: 'green' | 'red'
  emptyIcon?: ReactNode
}

function ArchiveSection({
  title,
  icon,
  subtitle,
  count,
  contracts,
  isLoading,
  accent,
  emptyIcon
}: ArchiveSectionProps) {
  const cardAccentClasses =
    accent === 'green'
      ? 'border-l-4 border-green-500'
      : accent === 'red'
        ? 'border-l-4 border-red-500'
        : ''
  const headerAccentClasses =
    accent === 'green'
      ? 'bg-green-50'
      : accent === 'red'
        ? 'bg-red-50'
        : 'bg-gray-50'
  const defaultEmptyIcon = accent === 'red' ? <XCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" /> : <Archive className="mx-auto mb-4 h-12 w-12 text-gray-400" />

  return (
    <Card className={`shadow-lg ${cardAccentClasses}`}>
      <CardHeader className={`border-b ${headerAccentClasses}`}>
        <CardTitle className="flex items-center gap-2 text-xl">
          {icon}
          {title} ({count})
        </CardTitle>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-32 w-full" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="py-12 text-center">
            {emptyIcon ?? defaultEmptyIcon}
            <p className="text-gray-500">No contracts found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type ContractCardProps = {
  contract: ContractRow
}

function ContractCard({ contract }: ContractCardProps) {
  const isCancelled = contract.status === 'cancelled'
  const statusBadgeClass = isCancelled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
  const hasPrice = typeof contract.purchase_price === 'number' && !Number.isNaN(contract.purchase_price)
  const price = hasPrice ? formatCurrency(contract.purchase_price ?? 0) : '—'

  return (
    <Link
      to={`/contracts/${contract.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 opacity-75 transition duration-300 hover:border-green-500 hover:opacity-100"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex flex-1 items-start gap-3">
          <MapPin className={`mt-1 h-5 w-5 ${isCancelled ? 'text-red-600' : 'text-green-600'}`} />
          <div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">{contract.property_address ?? contract.title}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusBadgeClass}>{isCancelled ? 'Cancelled' : 'Closed'}</Badge>
              {contract.is_counter_offer ? (
                <Badge className="bg-purple-100 text-purple-800">Counter Offer #{contract.counter_offer_number ?? 1}</Badge>
              ) : null}
              {contract.cancellation_reason ? (
                <Badge variant="outline" className="text-xs capitalize">
                  {contract.cancellation_reason.replace(/_/g, ' ')}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <DollarSign className={`h-4 w-4 ${isCancelled ? 'text-red-600' : 'text-green-600'}`} />
          <span className="text-gray-600">Price:</span>
          <span className="font-semibold">{price}</span>
        </div>
        {isCancelled && contract.cancellation_date ? (
          <TimelineDetail label="Cancelled" color="text-red-600" dateValue={contract.cancellation_date} />
        ) : contract.closing_date ? (
          <TimelineDetail label="Closed" color="text-green-600" dateValue={contract.closing_date} />
        ) : null}
      </div>
    </Link>
  )
}

type TimelineDetailProps = {
  label: string
  dateValue: string | null
  color: string
}

function TimelineDetail({ label, dateValue, color }: TimelineDetailProps) {
  if (!dateValue) return null

  return (
    <div className="flex items-center gap-2">
      <Calendar className={`h-4 w-4 ${color}`} />
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold">{format(new Date(dateValue), 'MMM d, yyyy')}</span>
    </div>
  )
}
