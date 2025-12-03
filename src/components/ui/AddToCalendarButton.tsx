
import { useMemo, useState } from 'react'
import { Calendar, Download, ChevronDown, CheckCircle } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type CalendarEvent = {
  title: string
  date: string | Date
  description?: string | null
  location?: string | null
}

type Provider = 'google' | 'apple' | 'outlook' | 'generic' | null

type InstructionSet = {
  title: string
  steps: string[]
}

type AddToCalendarButtonProps = {
  event?: CalendarEvent
  events?: CalendarEvent[]
  className?: string
} & Pick<ButtonProps, 'size' | 'variant'>

const DEFAULT_DURATION_MS = 60 * 60 * 1000
const BULK_FILENAME = 'ContractFlowAI_All_Dates.ics'

export default function AddToCalendarButton({
  event,
  events = [],
  className = '',
  size = 'sm',
  variant = 'outline'
}: AddToCalendarButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider>(null)

  const isBulk = events.length > 0
  const singleEvent = event ?? events[0]

  const upsertInstructions = useMemo<InstructionSet>(() => getInstructions(selectedProvider, isBulk), [selectedProvider, isBulk])

  const handleGoogleCalendar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isBulk) {
      downloadICS(generateBulkICS(events), BULK_FILENAME)
      setSelectedProvider('google')
      setShowInstructions(true)
    } else if (singleEvent) {
      window.open(createGoogleCalendarURL(singleEvent), '_blank')
    }
    setIsMenuOpen(false)
  }

  const handleProviderDownload = (provider: Exclude<Provider, 'google'>) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const icsContent = isBulk ? generateBulkICS(events) : singleEvent ? generateICS(singleEvent) : ''
    const filename = isBulk ? BULK_FILENAME : singleEvent ? `${singleEvent.title.replace(/\s+/g, '_')}.ics` : 'ContractFlowAI_Event.ics'
    if (icsContent) {
      downloadICS(icsContent, filename)
    }

    setSelectedProvider(provider)
    setShowInstructions(true)
    setIsMenuOpen(false)
  }

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant={variant}
            className={`gap-2 ${className ?? ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            disabled={!isBulk && !singleEvent}
          >
            {isBulk ? <Download className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
            {isBulk ? 'SYNC Dates' : 'Add to Calendar'}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-gray-500">Choose your calendar app</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleGoogleCalendar} className="cursor-pointer py-3" disabled={!singleEvent && !isBulk}>
            <div className="flex w-full items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <span className="text-xl" aria-hidden>
                  📅
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Google Calendar</div>
                <div className="text-xs text-gray-500">{isBulk ? 'Download & import' : 'Open directly'}</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleProviderDownload('apple')} className="cursor-pointer py-3" disabled={!singleEvent && !isBulk}>
            <div className="flex w-full items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                <span className="text-xl" aria-hidden>
                  🍎
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Apple Calendar</div>
                <div className="text-xs text-gray-500">iPhone, iPad, Mac</div>
              </div>
            </div>
          </DropdownMenuItem>

  <DropdownMenuItem onClick={handleProviderDownload('outlook')} className="cursor-pointer py-3" disabled={!singleEvent && !isBulk}>
            <div className="flex w-full items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-xl" aria-hidden>
                  📧
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Outlook</div>
                <div className="text-xs text-gray-500">Microsoft 365</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleProviderDownload('generic')} className="cursor-pointer py-3" disabled={!singleEvent && !isBulk}>
            <div className="flex w-full items-center gap-3">
              <Download className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Download .ics file</div>
                <div className="text-xs text-gray-500">For any calendar app</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {upsertInstructions.title}
            </DialogTitle>
            <DialogDescription>Follow these steps to complete the import</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {upsertInstructions.steps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                  {index + 1}
                </div>
                <p className="pt-0.5 text-sm text-gray-700">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowInstructions(false)}>Got it!</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function generateICS(event: CalendarEvent) {
  const { title, date, description, location } = event
  const startDate = new Date(date)
  const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS)

  return buildICS([
    createEventBlock({
      title,
      description,
      location,
      uidSuffix: `${Date.now()}-${Math.random()}`,
      start: startDate,
      end: endDate
    })
  ])
}

function generateBulkICS(events: CalendarEvent[]) {
  const blocks = events.map((entry, idx) => {
    const startDate = new Date(entry.date)
    return createEventBlock({
      title: entry.title,
      description: entry.description,
      location: entry.location,
      uidSuffix: `${Date.now()}-${idx}`,
      start: startDate,
      end: new Date(startDate.getTime() + DEFAULT_DURATION_MS)
    })
  })
  return buildICS(blocks)
}

function buildICS(eventBlocks: string[]) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ContractFlowAI//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks,
    'END:VCALENDAR'
  ].join('\r\n')
}

function createEventBlock({
  title,
  description,
  location,
  uidSuffix,
  start,
  end
}: {
  title: string
  description?: string | null
  location?: string | null
  uidSuffix: string
  start: Date
  end: Date
}) {
  return [
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description ?? '')}`,
    `LOCATION:${escapeICS(location ?? '')}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    `UID:${uidSuffix}@contractflowai.com`,
    'END:VEVENT'
  ].join('\r\n')
}

function formatICSDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function escapeICS(input: string) {
  return input.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function createGoogleCalendarURL(event: CalendarEvent) {
  const startDate = new Date(event.date)
  const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS)
  const formatGoogleDate = (value: Date) => value.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description ?? '',
    location: event.location ?? ''
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function getInstructions(provider: Provider, isBulk: boolean): InstructionSet {
  if (provider === 'google' && isBulk) {
    return {
      title: '📅 Import to Google Calendar',
      steps: [
        'Open Google Calendar on your computer',
        'Click Settings (⚙️) in the top right',
        "Select 'Import & Export' from the left menu",
        "Click 'Select file from your computer'",
        "Choose 'ContractFlowAI_All_Dates.ics' from your Downloads",
        "Click 'Import' and your dates will appear"
      ]
    }
  }

  if (provider === 'apple') {
    return {
      title: '🍎 Import to Apple Calendar',
      steps: isBulk
        ? [
            "Find 'ContractFlowAI_All_Dates.ics' in your Downloads",
            "On iPhone/iPad: Tap the file, then tap 'Add All'",
            'On Mac: Double-click the file',
            'Choose which calendar to add events to',
            "Click 'OK' to import all dates"
          ]
        : [
            'Find the downloaded .ics file in your Downloads',
            'On iPhone/iPad: Tap the file to open',
            'On Mac: Double-click the file',
            'The event will automatically be added to your calendar'
          ]
    }
  }

  if (provider === 'outlook') {
    return {
      title: '📧 Import to Outlook',
      steps: [
        'Open Outlook on your computer',
        'Go to File → Open & Export → Import/Export',
        "Select 'Import an iCalendar (.ics) file'",
        "Click 'Browse' and find the downloaded file",
        "Click 'OK' to import",
        'Your dates will appear in Outlook Calendar'
      ]
    }
  }

  return {
    title: '📥 File Downloaded',
    steps: [
      'The .ics calendar file has been downloaded',
      'Open it with your preferred calendar app',
      'Or import it manually through your calendar settings'
    ]
  }
}
