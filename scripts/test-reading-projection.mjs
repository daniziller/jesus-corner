// Bloco 2 do redesign — testa src/plan/readingProjection.js. Roda com:
// node scripts/test-reading-projection.mjs
import { computeProjection, countChaptersRead, totalBibleChapters, formatYearsMonths, countMarkedDays } from '../src/plan/readingProjection.js'

let failures = 0
function check(label, actual, expected) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected
  if (!ok) {
    console.error(`FALHOU: ${label} — veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${JSON.stringify(actual)}`)
  }
}

check('total de capítulos da Bíblia', totalBibleChapters(), 1189)
check('capítulos lidos com set vazio', countChaptersRead(new Set()), 0)
check('dias marcados (5 de 7)', countMarkedDays([true, true, true, true, true, false, false]), 5)
check('dias marcados (4, ex. ADENDO)', countMarkedDays([true, false, true, false, true, false, true]), 4)

// Sem leitura por dia -> sem projeção.
const noProjection = computeProjection({ completedSet: new Set(), readingMinutesPerDay: 0, weeklyDays: [true, true, true, true, true, false, false] })
check('sem minutos -> chaptersRemaining null', noProjection.chaptersRemaining, null)
check('sem minutos -> finishDate null', noProjection.finishDate, null)

// Sem dias marcados -> sem projeção (mesmo com minutos definidos).
const noDays = computeProjection({ completedSet: new Set(), readingMinutesPerDay: 15, weeklyDays: [false, false, false, false, false, false, false] })
check('sem dias marcados -> chaptersRemaining null', noDays.chaptersRemaining, null)

// Bíblia inteira já lida -> 0 capítulos restantes, projeção "já terminou"
// (calendarDaysNeeded = 0, finishDate = hoje).
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from '../src/data/bibleBlocks.js'
const fullSet = new Set()
for (const block of BIBLE_BLOCKS) {
  for (const s of SESSIONS_BY_PLAN.free[block.id]) {
    if (s.type === 'reflection') continue
    for (let ch = s.chStart; ch <= s.chEnd; ch++) fullSet.add(`${s.book}:${ch}`)
  }
}
check('Bíblia inteira lida -> countChaptersRead', countChaptersRead(fullSet), 1189)
const doneProjection = computeProjection({ completedSet: fullSet, readingMinutesPerDay: 15, weeklyDays: [true, true, true, true, true, false, false] })
check('Bíblia inteira lida -> 0 capítulos restantes', doneProjection.chaptersRemaining, 0)
check('Bíblia inteira lida -> 0 meses restantes', doneProjection.monthsRemaining, 0)

// Persona do ADENDO: 50 capítulos lidos (Gênesis 40 + Êxodo 6 + Rute 4),
// 15 min de leitura, 4 dias por semana marcados (seg/qua/sex/dom) —
// confere que capítulos restantes bate com "faltam 1.139" citado em 30b.
const personaSet = new Set()
for (let ch = 1; ch <= 40; ch++) personaSet.add(`Gênesis:${ch}`)
for (let ch = 1; ch <= 6; ch++) personaSet.add(`Êxodo:${ch}`)
for (let ch = 1; ch <= 4; ch++) personaSet.add(`Rute:${ch}`)
check('persona: capítulos lidos == 50', countChaptersRead(personaSet), 50)
const personaProjection = computeProjection({
  completedSet: personaSet,
  readingMinutesPerDay: 15,
  weeklyDays: [true, false, true, false, true, false, true],
})
check('persona: capítulos restantes == 1.139', personaProjection.chaptersRemaining, 1139)
check('persona: monthsRemaining é um número positivo', personaProjection.monthsRemaining, v => typeof v === 'number' && v > 0)
check('persona: finishDate é uma Date válida', personaProjection.finishDate, v => v instanceof Date && !isNaN(v))
console.log(`  (persona: ${personaProjection.monthsRemaining} meses, termina em ${personaProjection.finishDateLabel}, ~${personaProjection.chaptersPerDay} cap/dia)`)

check('formatYearsMonths(0)', formatYearsMonths(0, 'pt'), 'menos de um mês')
check('formatYearsMonths(1)', formatYearsMonths(1, 'pt'), '1 mês')
check('formatYearsMonths(28)', formatYearsMonths(28, 'pt'), '2 anos e 4 meses')
check('formatYearsMonths(24)', formatYearsMonths(24, 'pt'), '2 anos')
check('formatYearsMonths(28) en', formatYearsMonths(28, 'en'), '2 years and 4 months')

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de readingProjection passaram.')
