import { format } from 'date-fns'

export const formatDate = (d: string | Date | null) => {
  if (!d) return '—'
  return format(new Date(d), 'MMM d, yyyy')
}

export const toDisplayDate = formatDate
