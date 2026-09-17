// prayerRequestFormat.js — formatação pura de tempo pros pedidos de oração
// (pacote handoff-oracao-pedidos). Duas contas diferentes usam o mesmo
// corte dias→meses:
//   - dias_orados (contagem do servidor: dias distintos em que a pessoa
//     marcou "Orei por isso" NAQUELE pedido, inclusive no próprio —
//     "orando há N dias"/"orado por N dias" em PD1/PD4);
//   - tempo desde a publicação (calendário puro — "há 2 h"/"há 3 dias",
//     tempo desde created_at, usado no pedido de outra pessoa em PD1/PD3).
// Regra 4 do handoff: "até 24 h em horas, depois em dias, a partir de ~60
// dias em meses."
const MONTH_THRESHOLD_DAYS = 60

// "24 dias" / "3 meses" — recebe um número de dias já pronto (dias_orados
// do servidor), nunca uma data.
export function daysOrMonthsSpan(days, lang) {
  const d = Math.max(0, Math.round(days))
  if (d < MONTH_THRESHOLD_DAYS) {
    return lang === 'en' ? `${d} day${d === 1 ? '' : 's'}` : `${d} dia${d === 1 ? '' : 's'}`
  }
  const months = Math.max(1, Math.round(d / 30))
  return lang === 'en' ? `${months} month${months === 1 ? '' : 's'}` : `${months} ${months === 1 ? 'mês' : 'meses'}`
}

// Dias corridos (calendário) entre `iso` e agora — só usado por quem ainda
// precisa do número cru (ex: comparações). Prefira relativeTimeSpan abaixo
// pra exibir na tela — ele já cobre horas.
export function calendarDaysSince(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diffMs / 86400000))
}

// "2 h" / "3 dias" / "8 meses" — tempo desde uma DATA (não um número
// pronto), pra "há {span}" (tempo desde a publicação de um pedido de
// outra pessoa). Nunca mostra "0 h": um pedido postado agora mesmo já
// mostra "1 h", como o resto do app faz em textos de "há pouco".
export function relativeTimeSpan(iso, lang) {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 24) return `${Math.max(1, hours)} h`
  const days = Math.floor(diffMs / 86400000)
  if (days < MONTH_THRESHOLD_DAYS) {
    return lang === 'en' ? `${days} day${days === 1 ? '' : 's'}` : `${days} dia${days === 1 ? '' : 's'}`
  }
  const months = Math.max(1, Math.round(days / 30))
  return lang === 'en' ? `${months} month${months === 1 ? '' : 's'}` : `${months} ${months === 1 ? 'mês' : 'meses'}`
}
