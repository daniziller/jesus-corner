// Bloco 7 do redesign — testa src/metrics/metricsSummary.js (peças puras
// que faltavam pra montar 30b/30c em cima de sessionDurationMath.js/
// readingProjection.js/metricsBlocks.js). Roda com:
// node scripts/test-metrics-summary.mjs
import { periodSinceDate, periodRange, mostCommonHour, hourRangeLabel, chaptersReadInPeriod, reflectionDaysInPeriod, splitHoursMinutes } from '../src/metrics/metricsSummary.js'

let failures = 0
function check(label, actual, expected) {
  const same = JSON.stringify(actual) === JSON.stringify(expected)
  if (!same) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${JSON.stringify(actual)}`)
  }
}

// periodSinceDate — referência fixa: 30/08/2026 (sábado).
const from = new Date(2026, 7, 30) // mês 0-indexado: agosto = 7
check('periodSinceDate 30d', periodSinceDate('30d', from), '2026-08-01')
check('periodSinceDate year', periodSinceDate('year', from), '2026-01-01')
check('periodSinceDate all', periodSinceDate('all', from), null)
// 'week' (pedido dela, 2026-09-12) — 30/08/2026 é domingo, então a
// segunda daquela semana é 24/08/2026 (mesma convenção de mondayOf,
// routineStreak.js).
check('periodSinceDate week (referência num domingo) = segunda daquela semana', periodSinceDate('week', from), '2026-08-24')

// periodRange — generaliza pra 'custom' (início E fim, não só início).
check('periodRange week ainda sem teto (untilDate null)', periodRange('week', null, null, from), { sinceDate: '2026-08-24', untilDate: null })
check('periodRange custom usa os dois limites informados', periodRange('custom', '2026-08-10', '2026-08-20', from), { sinceDate: '2026-08-10', untilDate: '2026-08-20' })
check('periodRange custom com só um limite preenchido', periodRange('custom', '2026-08-10', '', from), { sinceDate: '2026-08-10', untilDate: null })

// mostCommonHour / hourRangeLabel — 3 leituras às 6h, 1 às 20h -> 6h vence.
// `localHour` monta o Date em hora LOCAL de quem roda o teste (não UTC) e
// serializa com toISOString() — o mesmo round-trip que mostCommonHour faz
// ao ler created_at (new Date(...).getHours(), também local) devolve a
// hora certa em QUALQUER fuso horário, sem hardcodar UTC.
const localHour = (y, m, d, h, min) => new Date(y, m, d, h, min).toISOString()
const sessionRows = [
  { passo: 'reading', data: '2026-08-25', created_at: localHour(2026, 7, 25, 6, 10) },
  { passo: 'reading', data: '2026-08-26', created_at: localHour(2026, 7, 26, 6, 40) },
  { passo: 'reading', data: '2026-08-27', created_at: localHour(2026, 7, 27, 6, 5) },
  { passo: 'reading', data: '2026-08-28', created_at: localHour(2026, 7, 28, 20, 0) },
  { passo: 'prayer', data: '2026-08-28', created_at: localHour(2026, 7, 28, 7, 0) },
]
const hour = mostCommonHour(sessionRows, 'reading')
check('mostCommonHour (reading) = hora local 6', hour, 6)
check('hourRangeLabel(6)', hourRangeLabel(hour), '6h–7h')
check('mostCommonHour sem linhas -> null', mostCommonHour([], 'reading'), null)
check('mostCommonHour passo sem linha -> null', mostCommonHour(sessionRows, 'reflection'), null)
check('hourRangeLabel(null) -> null', hourRangeLabel(null), null)
check('hourRangeLabel(23) vira 0h (meia-noite)', hourRangeLabel(23), '23h–0h')

// mostCommonHour respeita sinceDate (via `data`, não created_at).
const sinceLater = mostCommonHour(sessionRows, 'reading', '2026-08-28')
check('mostCommonHour com sinceDate só pega 28/08 -> hora 20', sinceLater, 20)

// chaptersReadInPeriod — sem sinceDate conta tudo; com sinceDate filtra por
// created_at >= cutoff.
const chapterRows = [
  { livro: 'Gênesis', capitulo: 1, created_at: '2026-08-01T10:00:00.000Z' },
  { livro: 'Gênesis', capitulo: 2, created_at: '2026-08-20T10:00:00.000Z' },
  { livro: 'Gênesis', capitulo: 3, created_at: '2026-08-29T10:00:00.000Z' },
]
check('chaptersReadInPeriod sem corte = 3', chaptersReadInPeriod(chapterRows, null), 3)
check('chaptersReadInPeriod desde 2026-08-20 = 2', chaptersReadInPeriod(chapterRows, '2026-08-20'), 2)
check('chaptersReadInPeriod sem linhas = 0', chaptersReadInPeriod([], '2026-08-01'), 0)
// untilDate (pedido dela, 2026-09-12) — intervalo fechado dos dois lados;
// 20/08 inclusive na ponta de cima (o dia inteiro, não só 00h00).
check('chaptersReadInPeriod com início E fim: só o do meio (20/08)', chaptersReadInPeriod(chapterRows, '2026-08-02', '2026-08-28'), 1)
check('chaptersReadInPeriod até 20/08 inclusive (o próprio dia conta)', chaptersReadInPeriod(chapterRows, null, '2026-08-20'), 2)

// reflectionDaysInPeriod — a partir do mapa daily_routine.
const dailyRoutine = {
  '2026-08-01': { reflection: true },
  '2026-08-15': { reflection: true },
  '2026-08-29': { prayer: true }, // sem reflection -> não conta
  '2026-08-30': { reflection: true },
}
check('reflectionDaysInPeriod sem corte = 3', reflectionDaysInPeriod(dailyRoutine, null), 3)
check('reflectionDaysInPeriod desde 2026-08-15 = 2', reflectionDaysInPeriod(dailyRoutine, '2026-08-15'), 2)
check('reflectionDaysInPeriod mapa vazio = 0', reflectionDaysInPeriod({}, null), 0)
check('reflectionDaysInPeriod undefined = 0', reflectionDaysInPeriod(undefined, null), 0)
check('reflectionDaysInPeriod com início E fim: só 15/08 (01 e 30 ficam de fora)', reflectionDaysInPeriod(dailyRoutine, '2026-08-10', '2026-08-20'), 1)

// splitHoursMinutes — 9h05 (32700s) e casos de borda (0s, <1min).
check('splitHoursMinutes 32700s = 9h05', splitHoursMinutes(9 * 3600 + 5 * 60), { h: 9, m: '05' })
check('splitHoursMinutes 0s = 0h00', splitHoursMinutes(0), { h: 0, m: '00' })
check('splitHoursMinutes 90s arredonda pra 0h02 (90s = 1.5min)', splitHoursMinutes(90), { h: 0, m: '02' })

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de metricsSummary passaram.')
