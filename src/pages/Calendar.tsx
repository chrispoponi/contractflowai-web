import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarCheck2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import type { Tables } from '@/lib/supabase'

interface CalendarEvent {
  date: string
  label: string
  contractId: string
  address: string
}

type Contract = Tables<'contracts'>

export default function CalendarPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['calendar-contracts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user!.id)
      if (error) throw error
      return data as Contract[]
    }
  })

  const events: CalendarEvent[] = useMemo(() => {
    return contracts.flatMap((contract) => {
      const eventList: CalendarEvent[] = []
      if (contract.closing_date) {
        eventList.push({
          contractId: contract.id,
          address: contract.property_address ?? contract.title,
          date: contract.closing_date,
          label: 'Closing'
        })
      }
      if (contract.inspection_date) {
        eventList.push({
          contractId: contract.id,
          address: contract.property_address ?? contract.title,
          date: contract.inspection_date,
          label: 'Inspection'
        })
      }
      if (contract.final_walkthrough_date) {
        eventList.push({
          contractId: contract.id,
          address: contract.property_address ?? contract.title,
          date: contract.final_walkthrough_date,
          label: 'Walkthrough'
        })
      }
      return eventList
    })
  }, [contracts])

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return events
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      )
    })
  }, [events, selectedDate])

  const selectedDates = events.map((event) => new Date(event.date))

  return (
    <div className="grid gap-6 px-4 py-8 lg:grid-cols-2 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-indigo-600" />
            Contract Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarComponent
            mode="multiple"
            selected={selectedDates}
            onDayClick={(date) => setSelectedDate(date)}
            modifiers={{
              closing: events.filter((event) => event.label === 'Closing').map((event) => new Date(event.date))
            }}
            className="rounded-2xl border"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <p className="text-sm text-slate-500">
            {selectedDate ? format(selectedDate, 'PPP') : 'All upcoming dates'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedEvents.length === 0 && <p className="text-sm text-slate-500">No events on this date.</p>}
          {selectedEvents.map((event) => (
            <div key={`${event.contractId}-${event.label}-${event.date}`} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{event.label}</p>
              <p className="text-base font-semibold text-slate-900">{event.address}</p>
              <p className="text-sm text-slate-500">{format(new Date(event.date), 'MMM d, yyyy')}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
