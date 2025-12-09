export function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  const parsed = Date.parse(dateStr)
  if (Number.isNaN(parsed)) return '—'
  return new Date(parsed).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
