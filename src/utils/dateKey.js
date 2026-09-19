// Chave de data local (YYYY-MM-DD) pra indexar progresso por dia — não usa
// toISOString() de propósito: ela é UTC e pode "trocar de dia" antes ou
// depois da meia-noite local dependendo do fuso do usuário.
export function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Lê de volta uma "YYYY-MM-DD" (coluna `date` do Postgres, ex: starts_at de
// desafios/challenges) como MEIA-NOITE LOCAL — o par exato de dateKey()
// acima. `new Date("YYYY-MM-DD")` (sem isso) interpreta como meia-noite UTC,
// não local: pra quem está em UTC-3 (o público do app é todo BR), isso
// equivale a ~21h do dia ANTERIOR — todo cálculo de "dia N do desafio"/
// "esse desafio já acabou?" feito direto em cima de `new Date(starts_at)`
// vira e volta ~3h antes da meia-noite de verdade. Bug real, achado na
// varredura geral de 2026-09-19 (groupChallengesStore.js/HomeScreen.jsx).
export function parseLocalDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
