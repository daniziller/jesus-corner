// prayerRequestFormat.js — formatação pura pro 36d (pacote 36-37, Bloco
// 2). Um só "dias vira meses" serve as três legendas do quadro:
// "orando há 24 dias"/"orando há 3 meses" (dias_orados de um pedido meu),
// "orado por 61 dias"/"orado por 8 meses" (idem, já respondido) e "há 2
// dias" (tempo desde a publicação, pedido de grupo). Abaixo de 90 dias
// mostra dias; a partir daí, meses arredondados — os dois exemplos do
// quadro (61 dias, 3 meses) só fazem sentido juntos com esse corte.
const MONTH_THRESHOLD_DAYS = 90

export function daysOrMonthsSpan(days, lang) {
  const d = Math.max(0, Math.round(days))
  if (d < MONTH_THRESHOLD_DAYS) {
    return lang === 'en' ? `${d} day${d === 1 ? '' : 's'}` : `${d} dia${d === 1 ? '' : 's'}`
  }
  const months = Math.max(1, Math.round(d / 30))
  return lang === 'en' ? `${months} month${months === 1 ? '' : 's'}` : `${months} ${months === 1 ? 'mês' : 'meses'}`
}

// Dias corridos (calendário) entre `iso` e agora — usado só pro "há N
// dias" de tempo-desde-a-publicação do pedido de grupo (dias_orados é
// outra conta, feita no servidor: dias DISTINTOS com "Orei por isso").
export function calendarDaysSince(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diffMs / 86400000))
}
