// "Hoje" no fuso de Brasília (UTC-3, sem horário de verão desde 2019),
// pros números do painel. O servidor roda em UTC: o "hoje" dele virava às
// 21h de Brasília e zerava "ativos hoje", "perguntas à IA hoje" e "erros
// de pagamento hoje" no meio da noite. Mesma suposição de
// api/admin/user-detail.js (a base é quase toda do Brasil).
const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000

// { iso, dateKey }: o instante em que o dia de hoje começou em Brasília
// (ISO, UTC) e a data dele no formato das colunas `data` (aaaa-mm-dd).
export function brazilToday(nowMs = Date.now()) {
  const br = new Date(nowMs - BRAZIL_OFFSET_MS)
  const startUtc = Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate()) + BRAZIL_OFFSET_MS
  return { iso: new Date(startUtc).toISOString(), dateKey: br.toISOString().slice(0, 10) }
}
