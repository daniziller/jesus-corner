// Resumo semanal (31a/31b/31c, Bloco 13) — só leitura do lado do cliente.
// Quem escreve é o cron (api/send-weekly-digest.js, service role); o app
// só lê o histórico já pronto pra alimentar as três telas e o seletor
// "Semanas ▾". Mesmo padrão fino de monthlyRecapStore.js sobre
// fetchRow/user_data.
import { fetchRow, updateRow } from '../backend/userDataStore'

// Mais recente primeiro (já é a ordem gravada pelo cron).
export async function getWeeklySummaries() {
  const row = await fetchRow()
  return Array.isArray(row?.weekly_summaries) ? row.weekly_summaries : []
}

// "Sua semana está pronta" (cartão do Início, segunda-feira) — mostra uma
// vez só por semana, mesmo padrão de markRecapShown em monthlyRecapStore.js
// (__shown guardado dentro do próprio array via uma marca no item, não uma
// segunda lista, pra não precisar de outra migração).
export async function markWeeklySummarySeen(weekKey) {
  const summaries = await getWeeklySummaries()
  const next = summaries.map(s => s.weekKey === weekKey ? { ...s, seen: true } : s)
  await updateRow({ weekly_summaries: next })
  return next
}
