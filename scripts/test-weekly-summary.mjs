// Bloco 13 do redesign — testa a parte pura de src/recap/weeklySummaryMath.js
// (I/O real — a leitura de user_data.weekly_summaries e o cron — verificado
// manualmente, não aqui).
// Roda com: node scripts/test-weekly-summary.mjs
import { weekRangeFor, filterByWeek, daysMetForWeek, isBlankWeek, longestDayOf, chaptersRangeLabel, weekRangeLabel } from '../src/recap/weeklySummaryMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${JSON.stringify(actual)}`)
  }
}

// Segunda 25/ago a domingo 31/ago/2025.
const monday = new Date(2025, 7, 25)

check('weekRangeFor', weekRangeFor(monday), { weekKey: '2025-08-25', startKey: '2025-08-25', endKey: '2025-08-31' })

const rows = [
  { data: '2025-08-24', v: 1 }, // sábado anterior — fora
  { data: '2025-08-25', v: 2 }, // segunda — dentro
  { data: '2025-08-31', v: 3 }, // domingo — dentro (borda)
  { data: '2025-09-01', v: 4 }, // segunda seguinte — fora
]
check('filterByWeek pega só os dois dias dentro (bordas inclusas)', filterByWeek(rows, 'data', '2025-08-25', '2025-08-31').map(r => r.v), [2, 3])

// Persona: meta de leitura batida seg/qua/sex, hoje é sexta (28/ago) — sáb/dom
// da mesma semana ainda não chegaram, não podem contar como "não cumprido"
// visualmente diferente de "ainda não chegou", mas a função só devolve met.
const dailyRoutine = {
  '2025-08-25': { reading: true }, // seg
  '2025-08-27': { reading: true }, // qua
  '2025-08-29': { reading: true }, // sex
}
const today = new Date(2025, 7, 29) // sexta
check('daysMetForWeek: seg/qua/sex batidos, sáb/dom ainda não chegaram', daysMetForWeek(dailyRoutine, monday, today), {
  days: [true, false, true, false, true, false, false],
  met: 3,
})

check('isBlankWeek: tudo zerado = semana em branco', isBlankWeek({ stepSeconds: { prayer: 0, reading: 0, reflection: 0 }, chaptersCount: 0, notesCount: 0 }), true)
check('isBlankWeek: só 1 capítulo já não é em branco', isBlankWeek({ stepSeconds: { prayer: 0, reading: 0, reflection: 0 }, chaptersCount: 1, notesCount: 0 }), false)
check('isBlankWeek: só uma nota já não é em branco', isBlankWeek({ stepSeconds: { prayer: 0, reading: 0, reflection: 0 }, chaptersCount: 0, notesCount: 1 }), false)
check('isBlankWeek: só tempo de oração já não é em branco', isBlankWeek({ stepSeconds: { prayer: 60, reading: 0, reflection: 0 }, chaptersCount: 0, notesCount: 0 }), false)

const dayTotals = { '2025-08-25': 1200, '2025-08-27': 1860, '2025-08-28': 900 }
check('longestDayOf: quarta (índice 2) é o maior', longestDayOf(dayTotals, monday), { dayIndex: 2, seconds: 1860 })
check('longestDayOf: sem nenhuma linha -> null', longestDayOf({}, monday), null)

const chapters = [{ book: 'Gênesis', capitulo: 38 }, { book: 'Gênesis', capitulo: 39 }, { book: 'Gênesis', capitulo: 41 }]
check('chaptersRangeLabel pt: um livro só, intervalo', chaptersRangeLabel(chapters, 'pt'), 'Gênesis 38 a 41')
check('chaptersRangeLabel en: um livro só, intervalo', chaptersRangeLabel(chapters, 'en'), 'Genesis 38 to 41')
check('chaptersRangeLabel: um capítulo só (sem "a")', chaptersRangeLabel([{ book: 'Rute', capitulo: 1 }], 'pt'), 'Rute 1')
check('chaptersRangeLabel: mais de um livro, lista os nomes', chaptersRangeLabel([{ book: 'Gênesis', capitulo: 1 }, { book: 'Êxodo', capitulo: 1 }], 'pt'), 'Gênesis, Êxodo')
check('chaptersRangeLabel: vazio', chaptersRangeLabel([], 'pt'), '')

check('weekRangeLabel pt: mesmo mês', weekRangeLabel('2025-08-25', '2025-08-31', 'pt'), '25 a 31 de agosto')
check('weekRangeLabel en: mesmo mês', weekRangeLabel('2025-08-25', '2025-08-31', 'en'), '25–31 August')
check('weekRangeLabel pt: vira o mês', weekRangeLabel('2025-12-29', '2026-01-04', 'pt'), '29 de dez. a 4 de jan.')

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
} else {
  console.log('\nTodos os testes de weeklySummaryMath passaram.')
}
