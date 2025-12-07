import { useMemo, useState } from 'react'
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
import { Link } from 'react-router-dom'
import { ColorLegend } from '@/components/calendar/ColorLegend'
import { SyncDatesMenu } from '@/components/calendar/SyncDatesMenu'

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

const colorMap: Record<
  DateTypeKey,
  { chip: string; border: string; text: string; dot: string }
> = {
  Inspection: { chip: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', dot: 'bg-sky-500' },
  'Inspection Response': { chip: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-800', dot: 'bg-fuchsia-500' },
  'Loan Contingency': { chip: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
  Appraisal: { chip: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  'Final Walkthrough': { chip: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  Closing: { chip: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', dot: 'bg-rose-500' }
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { toast } = useToast()
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-xl border border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-900">Calendar available after signup</CardTitle>
            <p className="text-sm text-slate-500">
              Upload your first contract to unlock timeline tracking, calendar sync, and client updates.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild>
              <Link to="/pricing">Start free trial</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Log in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Contract Calendar</h1>
              <p className="text-sm text-slate-500">
                {user?.organization_role === 'team_lead'
                  ? 'All team contracts and timelines'
                  : 'Deadlines from every active transaction'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => {
                  setSendResults(null)
                  setShowSendModal(true)
                }}
                disabled={emailableContracts.length === 0}
                className="bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
              >
                <Send className="mr-2 h-4 w-4" />
                Email Timelines ({emailableContracts.length})
              </Button>
              <SyncDatesMenu />
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
          </div>

          <ColorLegend />
        </div>

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
                  <Badge className={`border ${colorMap[event.type].border} ${colorMap[event.type].chip} ${colorMap[event.type].text}`}>
                    {event.type}
                  </Badge>
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

        <EmailTimelinesDialog
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

type EmailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contracts: Contract[]
  selected: Set<string>
  toggle: (id: string) => void
  isSending: boolean
  onSend: () => void
  sendResults: {
    success: { name: string; email: string }[]
    failed: { name: string; email?: string; reason: string }[]
  } | null
}

function EmailTimelinesDialog({
  open,
  onOpenChange,
  contracts,
  selected,
  toggle,
  isSending,
  onSend,
  sendResults
}: EmailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email client timelines</DialogTitle>
          <DialogDescription>Select contracts with client email addresses to send an updated timeline.</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {contracts.length === 0 && <p className="text-sm text-slate-500">No eligible contracts yet.</p>}
          {contracts.map((contract) => {
            const clientEmail =
              contract.representing_side === 'buyer' ? contract.buyer_email : contract.seller_email ?? undefined

            return (
              <label
                key={contract.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-600"
              >
                <Checkbox checked={selected.has(contract.id)} onCheckedChange={() => toggle(contract.id)} />
                <span>
                  <strong className="block text-slate-900">{contract.property_address ?? contract.title}</strong>
                  {clientEmail ? (
                    <span className="text-xs text-slate-500">{clientEmail}</span>
                  ) : (
                    <span className="text-xs text-amber-600">No client email</span>
                  )}
                </span>
              </label>
            )
          })}
        </div>

        {sendResults && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            {sendResults.success.length > 0 && (
              <p className="text-emerald-600">Sent {sendResults.success.length} timeline(s) successfully.</p>
            )}
            {sendResults.failed.length > 0 && (
              <p className="text-rose-600">
                {sendResults.failed.length} timeline(s) failed. Please confirm the client emails and try again.
              </p>
            )}
          </div>
        )}

        <Button onClick={onSend} disabled={selected.size === 0 || isSending} className="w-full">
          {isSending ? 'Sending...' : selected.size > 0 ? `Send ${selected.size} timeline(s)` : 'Select contracts'}
        </Button>
      </DialogContent>
    </Dialog>
  )
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
                <div
                  key={`${event.contractId}-${event.type}-${event.date}`}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${colorMap[event.type].chip} ${colorMap[event.type].border}`}
                >
                  <span className={`h-2 w-2 rounded-full ${colorMap[event.type].dot}`}></span>
                  <span className={`flex-1 truncate text-xs ${colorMap[event.type].text}`}>{event.type}</span>
                </div>
              ))}
              {events.length > 3 && <p className="text-xs text-slate-400">+{events.length - 3} more</p>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
