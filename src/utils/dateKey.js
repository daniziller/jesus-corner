// Chave de data local (YYYY-MM-DD) pra indexar progresso por dia — não usa
// toISOString() de propósito: ela é UTC e pode "trocar de dia" antes ou
// depois da meia-noite local dependendo do fuso do usuário.
export function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
