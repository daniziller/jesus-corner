const CURRENCY_CODE = { brl: 'BRL', usd: 'USD' }

export function formatAmount(cents, currency) {
  const value = cents / 100
  return new Intl.NumberFormat(currency === 'brl' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency: CURRENCY_CODE[currency] ?? 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}
