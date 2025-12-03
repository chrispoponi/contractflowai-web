import { differenceInDays, format, isBefore } from 'date-fns'
import { Calendar, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface UpcomingEvent {
  contractId: string
  property: string
  type: string
  date: string
}

interface UpcomingDatesProps {
  events: UpcomingEvent[]
  isLoading?: boolean
  onComplete?: (event: UpcomingEvent) => Promise<void>
}

const colorMap: Record<string, string> = {
  Inspection: 'bg-blue-100 text-blue-800',
  'Inspection Response': 'bg-purple-100 text-purple-800',
  'Loan Contingency': 'bg-amber-100 text-amber-800',
  Appraisal: 'bg-green-100 text-green-800',
  'Final Walkthrough': 'bg-indigo-100 text-indigo-800',
  Closing: 'bg-rose-100 text-rose-800'
}

export default function UpcomingDates({ events, isLoading, onComplete }: UpcomingDatesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!events.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No key contract dates scheduled.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          Upcoming Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event) => {
          const daysDiff = differenceInDays(new Date(event.date), new Date())
          const overdue = isBefore(new Date(event.date), new Date())

          return (
            <div key={`${event.contractId}-${event.type}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className={colorMap[event.type] ?? 'bg-slate-200 text-slate-800'}>{event.type}</Badge>
                  <Link to={`/contracts/${event.contractId}`} className="mt-2 block text-sm font-semibold text-slate-900">
                    {event.property}
                  </Link>
                  <p className="text-xs text-slate-500">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${overdue ? 'text-rose-600' : daysDiff <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {overdue ? `${Math.abs(daysDiff)}d overdue` : daysDiff === 0 ? 'Today' : `${daysDiff}d`}
                  </p>
                  {onComplete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-slate-500 hover:text-emerald-600"
                      onClick={() => onComplete(event)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="sr-only">Mark complete</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
