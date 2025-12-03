export function formatCurrency(value?: number | null, locale = 'en-US', currency = 'USD') {
  if (value == null) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export function formatStatus(status?: string | null) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ')
}
