import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth
} from 'date-fns'
import {
  Calendar as CalendarIcon,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import AddToCalendarButton from '@/components/ui/AddToCalendarButton'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

interface Contract extends Tables<'contracts'> {
  _using_original_dates?: boolean
}

type DateTypeKey = 'Inspection' | 'Inspection Response' | 'Loan Contingency' | 'Appraisal' | 'Final Walkthrough' | 'Closing'

type ContractEvent = {
  date: string
  type: DateTypeKey
  color: keyof typeof colorMap
  contractId: string
  address: string
  completed: boolean
  isFromCounterOffer?: boolean
  counterOfferNumber?: number | null
  usingOriginalDates?: boolean
}

const colorMap = {
  Inspection: 'bg-blue-500',
  'Inspection Response': 'bg-purple-500',
  'Loan Contingency': 'bg-orange-500',
  Appraisal: 'bg-green-500',
  'Final Walkthrough': 'bg-indigo-500',
  Closing: 'bg-red-500'
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set())
  const [showSendModal, setShowSendModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendResults, setSendResults] = useState<null | {
    success: { name: string; email: string }[]
    failed: { name: string; email?: string; reason: string }[]
  }>(null)

  const { data: contracts = [], isLoading, refetch } = useQuery({
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

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const activeContracts = useMemo(() => buildActiveContracts(contracts), [contracts])
  const events = useMemo(() => buildEvents(activeContracts), [activeContracts])

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ContractEvent[]>()
    events.forEach((event) => {
      const key = new Date(event.date).toDateString()
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(event)
    })
    return map
  }, [events])

  const selectedEvents = selectedDate ? eventsByDay.get(selectedDate.toDateString()) ?? [] : events

  const emailableContracts = useMemo(() => buildEmailableContracts(activeContracts), [activeContracts])

  const toggleContract = (contractId: string) => {
    setSelectedContracts((prev) => {
      const next = new Set(prev)
      next.has(contractId) ? next.delete(contractId) : next.add(contractId)
      return next
    })
  }

  const handleSend = async () => {
    if (selectedContracts.size === 0) return
    setIsSending(true)
    const successes: { name: string; email: string }[] = []
    const failures: { name: string; email?: string; reason: string }[] = []

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .in('id', Array.from(selectedContracts))
      .eq('user_id', user?.id ?? '')

    if (error) {
      toast({ title: 'Error loading contracts', variant: 'destructive' })
      setIsSending(false)
      return
    }

    for (const contract of data) {
      const clientEmail = contract.representing_side === 'buyer' ? contract.buyer_email : contract.seller_email
      const clientName = contract.representing_side === 'buyer' ? contract.buyer_name : contract.seller_name

      if (!clientEmail) {
        failures.push({ name: clientName ?? contract.property_address ?? 'Client', reason: 'Missing email address' })
        continue
      }

      try {
        const { error: sendError } = await supabase.functions.invoke('generateClientTimeline', {
          body: {
            contractId: contract.id,
            sendToClient: true
          }
        })

        if (sendError) throw sendError
        successes.push({ name: clientName ?? contract.property_address ?? 'Client', email: clientEmail })
      } catch (err: any) {
        failures.push({
          name: clientName ?? contract.property_address ?? 'Client',
          email: clientEmail,
          reason: err?.message ?? 'Unknown error'
        })
      }
    }

    setSendResults({ success: successes, failed: failures })
    setIsSending(false)
    setSelectedContracts(new Set())
    refetch()
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-indigo-600">Operations Center</p>
            <h1 className="mt-2 text-4xl font-bold text-slate-900">Contract Calendar</h1>
            <p className="text-sm text-slate-500">
              {user?.organization_role === 'team_lead' ? 'All team contracts and timelines' : 'Deadlines from every active transaction'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setSendResults(null)
                setShowSendModal(true)
              }}
              disabled={emailableContracts.length === 0}
              className="bg-green-600 text-white shadow-lg hover:bg-green-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Email Timelines ({emailableContracts.length})
            </Button>
            <AddToCalendarButton
              events={events.map((event) => ({
                title: `${event.type} - ${event.address}`,
                date: new Date(event.date),
                description: event.address,
                location: event.address
              }))}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
            />
          </div>
        </header>

        <ColorLegend />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarGrid
                days={monthDays}
                isLoading={isLoading}
                eventsByDay={eventsByDay}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <CalendarCheck2 className="h-5 w-5 text-indigo-600" /> Schedule
              </CardTitle>
              <p className="text-sm text-slate-500">
                {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Upcoming milestones'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedEvents.length === 0 && <p className="text-sm text-slate-500">No events on this date.</p>}
              {selectedEvents.map((event) => (
                <div key={`${event.contractId}-${event.type}-${event.date}`} className="rounded-xl border border-slate-200 p-4">
                  <Badge className={`${colorMap[event.type]} text-white`}>{event.type}</Badge>
                  <p className="mt-2 text-base font-semibold text-slate-900">{event.address}</p>
                  <p className="text-sm text-slate-500">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                  <div className="mt-3 text-xs text-slate-500">
                    {event.usingOriginalDates
                      ? 'Using original contract dates'
                      : event.isFromCounterOffer
                      ? `Counter offer #${event.counterOfferNumber ?? ''}`
                      : 'Original contract'}
                  </div>
                  <div className="mt-3">
                    <AddToCalendarButton
                      event={{
                        title: `${event.type} - ${event.address}`,
                        date: new Date(event.date),
                        description: event.address,
                        location: event.address
                      }}
                      variant="outline"
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <SendTimelinesDialog
          open={showSendModal}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedContracts(new Set())
              setSendResults(null)
            }
            setShowSendModal(open)
          }}
          contracts={emailableContracts}
          selected={selectedContracts}
          toggle={toggleContract}
          isSending={isSending}
          onSend={handleSend}
          sendResults={sendResults}
        />
      </div>
    </div>
  )
}

function buildActiveContracts(contracts: Contract[]) {
  const groups = new Map<string, Contract[]>()
  contracts.forEach((contract) => {
    const key = contract.is_counter_offer && contract.original_contract_id ? contract.original_contract_id : contract.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(contract)
  })

  const active: Contract[] = []
  for (const group of groups.values()) {
    const latestCounter = group
      .filter((c) => c.is_counter_offer && c.all_parties_signed)
      .sort((a, b) => (b.counter_offer_number ?? 0) - (a.counter_offer_number ?? 0))[0]
    const original = group.find((c) => !c.is_counter_offer)

    if (latestCounter) {
      if (missingDates(latestCounter) && original) {
        active.push({ ...latestCounter, ...copyDates(original), _using_original_dates: true })
      } else {
        active.push(latestCounter)
      }
    } else if (original) {
      active.push(original)
    }
  }
  return active
}

function copyDates(original: Contract) {
  return {
    closing_date: original.closing_date,
    inspection_date: original.inspection_date,
    inspection_response_date: original.inspection_response_date,
    loan_contingency_date: original.loan_contingency_date,
    appraisal_date: original.appraisal_date,
    final_walkthrough_date: original.final_walkthrough_date
  }
}

function missingDates(contract: Contract) {
  return !(
    contract.closing_date ||
    contract.inspection_date ||
    contract.inspection_response_date ||
    contract.loan_contingency_date ||
    contract.appraisal_date ||
    contract.final_walkthrough_date
  )
}

function buildEvents(contracts: Contract[]): ContractEvent[] {
  const dateTypes: { key: DateTypeKey; field: keyof Contract; color: keyof typeof colorMap; completedField?: keyof Contract }[] = [
    { key: 'Inspection', field: 'inspection_date', color: 'Inspection', completedField: 'inspection_completed' as keyof Contract },
    { key: 'Inspection Response', field: 'inspection_response_date', color: 'Inspection Response', completedField: 'inspection_response_completed' as keyof Contract },
    { key: 'Loan Contingency', field: 'loan_contingency_date', color: 'Loan Contingency', completedField: 'loan_contingency_completed' as keyof Contract },
    { key: 'Appraisal', field: 'appraisal_date', color: 'Appraisal', completedField: 'appraisal_completed' as keyof Contract },
    { key: 'Final Walkthrough', field: 'final_walkthrough_date', color: 'Final Walkthrough', completedField: 'final_walkthrough_completed' as keyof Contract },
    { key: 'Closing', field: 'closing_date', color: 'Closing' }
  ]

  const events: ContractEvent[] = []
  contracts.forEach((contract) => {
    dateTypes.forEach(({ key, field, color, completedField }) => {
      const value = contract[field as keyof Contract]
      if (!value) return

      events.push({
        contractId: contract.id,
        address: contract.property_address ?? contract.title ?? 'Contract',
        date: value as string,
        type: key,
        color,
        completed: Boolean(completedField ? contract[completedField] : false),
        isFromCounterOffer: contract.is_counter_offer,
        counterOfferNumber: contract.counter_offer_number,
        usingOriginalDates: contract._using_original_dates
      })
    })
  })

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function buildEmailableContracts(contracts: Contract[]) {
  return contracts.filter((contract) => {
    if (contract.status === 'cancelled' || contract.status === 'superseded') return false
    const email = contract.representing_side === 'buyer' ? contract.buyer_email : contract.seller_email
    return Boolean(email)
  })
}

function CalendarGrid({
  days,
  eventsByDay,
  currentMonth,
  selectedDate,
  onSelectDate,
  isLoading
}: {
  days: Date[]
  eventsByDay: Map<string, ContractEvent[]>
  currentMonth: Date
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading contracts…
      </div>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-3">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          {day}
        </div>
      ))}

      {days.map((day) => {
        const key = day.toDateString()
        const events = eventsByDay.get(key) ?? []
        const isToday = isSameDay(day, new Date())
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

        return (
          <button
            key={key}
            onClick={() => onSelectDate(day)}
            className={`min-h-[110px] rounded-2xl border p-3 text-left transition-all ${
              isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'
            } ${!isSameMonth(day, currentMonth) ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-900'}`}
          >
            <div className={`flex items-center justify-between text-sm ${isToday ? 'font-semibold text-indigo-600' : ''}`}>
              <span>{format(day, 'd')}</span>
              {events.length > 0 && <span className="text-xs text-slate-400">{events.length}</span>}
            </div>
            <div className="mt-2 space-y-1">
              {events.slice(0, 3).map((event) => (