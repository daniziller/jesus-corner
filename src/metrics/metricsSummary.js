// Peças puras (sem I/O) que faltavam pra montar 30b/30c em cima do que já
// existe: sessionDurationMath.js (tempo por passo), readingProjection.js
// (capítulos/projeção) e metricsBlocks.js (progresso por bloco). Separadas
// daqui pra poder testar com `node` puro — ver
// scripts/test-metrics-summary.mjs.
import { mondayOf } from '../routine/routineStreak.js'

const DAY_MS = 24 * 60 * 60 * 1000

function isoDate(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 'all' | 'year' | '30d' | 'week' → data de corte (string YYYY-MM-DD,
// comparável direto com a coluna `data` de session_seconds/chapters_read)
// ou `null` pra "sem corte" (desde o começo). `from` é o dia de referência
// (default agora), só existe pra dar pra testar com uma data fixa. 'week'
// (pedido dela, 2026-09-12) usa a MESMA segunda-feira que o resto do app
// (mondayOf, stepDaysMath.js/HomeScreen.jsx) — "Esta semana" aqui é a
// mesma semana de lá. 'custom' não entra aqui — tem início E fim, ver
// periodRange abaixo.
export function periodSinceDate(period, from = new Date()) {
  if (period === 'week') return isoDate(mondayOf(from))
  if (period === '30d') return isoDate(new Date(from.getTime() - 29 * DAY_MS))
  if (period === 'year') return `${from.getFullYear()}-01-01`
  return null
}

// { sinceDate, untilDate } — generaliza periodSinceDate pro caso 'custom'
// (pedido dela, 2026-09-12: "filtro de data de início e fim"), onde
// existem OS DOIS limites, não só um início aberto até agora. Pros demais
// períodos, untilDate sempre null (sem teto — vai até agora), mesmo
// comportamento de sempre. customFrom/customTo (strings YYYY-MM-DD, do
// par de <input type="date">) só são usados quando period === 'custom';
// um dos dois vazio vira null (filtro só de início, ou só de fim).
export function periodRange(period, customFrom, customTo, from = new Date()) {
  if (period === 'custom') return { sinceDate: customFrom || null, untilDate: customTo || null }
  return { sinceDate: periodSinceDate(period, from), untilDate: null }
}

// Hora do dia (0–23, fuso local de quem lê o dado) que mais aparece nas
// linhas de UM passo — "horário que você mais lê" (30b). Usa `created_at`
// (timestamp real do insert), não `data` (só o dia) — é a única coluna com
// granularidade de hora em session_seconds. Como oração/reflexão gravam no
// FIM da sessão (finishPrayer/finishReflection) e leitura grava em lotes
// enquanto lê, o resultado é "hora em que você tende a estar nesse passo",
// não exatamente "hora que você começa" — aproximação aceitável pro que a
// tela pede. `null` quando não há linhas suficientes (a UI esconde a
// linha).
export function mostCommonHour(rows, passo, sinceDate = null, untilDate = null) {
  const filtered = rows.filter(r => r.passo === passo && r.created_at && (!sinceDate || r.data >= sinceDate) && (!untilDate || r.data <= untilDate))
  if (filtered.length === 0) return null
  const counts = new Array(24).fill(0)
  for (const r of filtered) counts[new Date(r.created_at).getHours()]++
  let bestHour = 0
  for (let h = 1; h < 24; h++) if (counts[h] > counts[bestHour]) bestHour = h
  return counts[bestHour] > 0 ? bestHour : null
}

// "6h–7h" — janela de 1h a partir da hora mais comum. `hour` pode ser null
// (sem dado ainda), devolve null junto.
export function hourRangeLabel(hour) {
  if (hour == null) return null
  return `${hour}h–${(hour + 1) % 24}h`
}

// Capítulos com traço em chapters_read (qualquer origem — 'sessao' ou
// 'manual', ver chapterReadLog.js) dentro do período, contados por
// created_at. Limitação real, disclosed: só conta o que foi marcado DEPOIS
// da mudança que fez sessões normais gravarem aqui também (Bloco 7) — quem
// já lia antes disso vê "30 dias"/"este ano" mais baixos que o real pros
// primeiros dias após o lançamento. "Desde o começo" nunca usa esta função
// (usa countChaptersRead de readingProjection.js, sobre completed_keys,
// sempre correto) — ver MetricsScreen.jsx.
export function chaptersReadInPeriod(chapterReadRows, sinceDate, untilDate = null) {
  if (!sinceDate && !untilDate) return chapterReadRows.length
  const cutoff = sinceDate ? new Date(sinceDate) : null
  // +1 dia pro teto incluir o dia INTEIRO de `untilDate` (created_at tem
  // hora; um "até 10/09" tem que pegar qualquer horário de 10/09, não só
  // 00h00).
  const ceiling = untilDate ? new Date(new Date(untilDate).getTime() + DAY_MS) : null
  return chapterReadRows.filter(r =>
    r.created_at && (!cutoff || new Date(r.created_at) >= cutoff) && (!ceiling || new Date(r.created_at) < ceiling)
  ).length
}

// Dias com o passo de reflexão concluído no período, a partir do mapa
// daily_routine (data → {reflection: true, ...}, ver dailyRoutineStore.js).
// Proxy honesto pra "quantas vezes você refletiu" ("34 respostas" no
// mockup) — o app não guarda uma linha por pergunta/resposta, só se o dia
// foi concluído ou não.
export function reflectionDaysInPeriod(dailyRoutine, sinceDate, untilDate = null) {
  return Object.entries(dailyRoutine || {}).filter(
    ([date, day]) => day?.reflection && (!sinceDate || date >= sinceDate) && (!untilDate || date <= untilDate)
  ).length
}

// {h, m} (m sempre com 2 dígitos) — base tanto do hero "9 h 05 min" quanto
// dos cartões compactos "2h05". A montagem do texto final (com "h"/"min"
// no idioma certo) fica na tela, via i18n — este módulo só faz a conta.
export function splitHoursMinutes(totalSeconds) {
  const totalMin = Math.round(totalSeconds / 60)
  return { h: Math.floor(totalMin / 60), m: String(totalMin % 60).padStart(2, '0') }
}
