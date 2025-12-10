export type CalendarDeadline = {
  label: string
  date: string | null | undefined
}

export type CalendarContract = {
  id: string
  title?: string | null
  propertyAddress?: string | null
  summary?: string | null
  deadlines?: CalendarDeadline[]
}

const ICS_LINE_BREAK = '\r\n'

const DEFAULT_TITLE = 'Contract Event'

function normalizeDate(dateInput: string | null | undefined): string | null {
  if (!dateInput) {
    return null
  }

  const isoCandidate = dateInput.trim()
  const iso = isoCandidate.length <= 10 ? `${isoCandidate}T00:00:00Z` : isoCandidate
  const parsed = new Date(iso)
  if (isNaN(parsed.getTime())) {
    return null
  }

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')

  return `${year}${month}${day}`
}

function escapeText(value?: string | null): string {
  if (!value) return ''
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function getTimestamp(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  const seconds = String(now.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

export function handleCalendarDownload(contract: CalendarContract) {
  const deadlines = (contract.deadlines ?? []).filter((entry) => !!entry.date)

  if (!deadlines.length) {
    console.warn('No deadlines available to export for this contract.')
    return
  }

  const title = contract.title?.trim() || contract.propertyAddress || DEFAULT_TITLE
  const timestamp = getTimestamp()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ContractFlowAI//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  deadlines.forEach((deadline, index) => {
    const normalizedDate = normalizeDate(deadline.date ?? null)
    if (!normalizedDate) {
      return
    }

    const eventTitle = `${deadline.label} - ${title}`.trim()
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${contract.id}-${index}@contractflowai`)
    lines.push(`DTSTAMP:${timestamp}`)
    lines.push(`DTSTART;VALUE=DATE:${normalizedDate}`)
    lines.push(`SUMMARY:${escapeText(eventTitle)}`)
    if (contract.summary) {
      lines.push(`DESCRIPTION:${escapeText(contract.summary)}`)
    }
    if (contract.propertyAddress) {
      lines.push(`LOCATION:${escapeText(contract.propertyAddress)}`)
    }
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join(ICS_LINE_BREAK)], {
    type: 'text/calendar;charset=utf-8'
  })
  const filenameBase =
    contract.title?.trim()?.replace(/\s+/g, '_') ||
    contract.propertyAddress?.trim()?.replace(/\s+/g, '_') ||
    'ContractFlowAI'
  const filename = `${filenameBase || 'contract'}_deadlines.ics`
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 0)
}
