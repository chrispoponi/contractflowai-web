export function isPast(date: string | null | undefined) {
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

export function toDisplayDate(date: string | null | undefined, locale = 'en-US') {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}
