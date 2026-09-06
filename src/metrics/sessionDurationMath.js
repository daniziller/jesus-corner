// Parte pura de sessionDurationStore.js (sem import de I/O) — separada só
// pra poder ser testada com `node` puro, sem sessão Supabase (ver
// scripts/test-session-duration.mjs). sessionDurationStore.js reexporta
// tudo daqui.
function sumBy(rows, keyFn) {
  const totals = {}
  for (const r of rows) {
    const k = keyFn(r)
    totals[k] = (totals[k] ?? 0) + r.segundos
  }
  return totals
}

// { prayer, reading, reflection } em segundos, dentro do período (todas as
// linhas se `sinceDate` for null) — base do bloco escuro "Tempo com Deus" de
// 30b e do cartão "Tempo em cada passo" de 31a.
export function totalsByStep(rows, sinceDate = null) {
  const filtered = sinceDate ? rows.filter(r => r.data >= sinceDate) : rows
  const byPasso = sumBy(filtered, r => r.passo)
  return { prayer: byPasso.prayer ?? 0, reading: byPasso.reading ?? 0, reflection: byPasso.reflection ?? 0 }
}

// Segundos por dia (chave YYYY-MM-DD) somando os 3 passos — usado pra achar
// "dia mais longo" (31a) e pra decidir se um dia contou pra "esta semana".
export function totalsByDay(rows, sinceDate = null) {
  const filtered = sinceDate ? rows.filter(r => r.data >= sinceDate) : rows
  return sumBy(filtered, r => r.data)
}

// Sessão média em segundos — só conta dias com pelo menos uma sessão, não
// divide pelos dias do período inteiro (um período de 30 dias com 10 dias
// de leitura tem "sessão média" sobre esses 10, não sobre 30).
export function averageSessionSeconds(rows, sinceDate = null) {
  const byDay = totalsByDay(rows, sinceDate)
  const days = Object.values(byDay)
  if (days.length === 0) return 0
  return Math.round(days.reduce((s, v) => s + v, 0) / days.length)
}
