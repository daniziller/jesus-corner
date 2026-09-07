// applicationPhraseMath.js — parte pura de applicationPhraseStore.js (sem
// I/O), separada só pra dar pra testar com `node` puro (ver
// scripts/test-application-phrase.mjs). Conta quantas frases de aplicação
// da semana atual (segunda até hoje) existem no histórico e quantas já
// foram marcadas "cumpri" — alimenta o cartão "SUA APLICAÇÃO DE ONTEM" da
// Home (34a): "{N} de {N} cumprida(s) nesta semana".
//
// `entries` é a lista de entradas do tipo 'application-phrase' já
// extraídas do histórico (ver parseNoteKey em notesStore.js), cada uma
// { date, fulfilled }. mondayKey/todayKeyStr são chaves YYYY-MM-DD (mesma
// convenção de semana de mondayOf em routine/routineStreak.js — reusada,
// não duplicada).
export function countWeekApplications(entries, mondayKey, todayKeyStr) {
  let total = 0
  let fulfilled = 0
  for (const e of entries) {
    if (!e.date || e.date < mondayKey || e.date > todayKeyStr) continue
    total++
    if (e.fulfilled) fulfilled++
  }
  return { total, fulfilled }
}
