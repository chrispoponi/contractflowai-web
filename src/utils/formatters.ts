export const formatMoney = (n: number | null) => (n ? `$${n.toLocaleString()}` : '—')
export const formatCurrency = formatMoney
