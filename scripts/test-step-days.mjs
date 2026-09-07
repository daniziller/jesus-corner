// Turno 35, Bloco 1 — testa a parte pura de src/routine/stepDaysMath.js
// (getStepDays/setStepDays, em stepDaysStore.js, fazem I/O — verificados
// manualmente no navegador, não aqui). Roda com:
// node scripts/test-step-days.mjs
import { resolveStepDays, stepsScheduledForWeekday, markedWeekdayUnion, countMarkedWeekdays, isStepDayFulfilled, computeStepWeekGoal } from '../src/routine/stepDaysMath.js'

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

const WEEKDAYS = [true, true, true, true, true, false, false] // seg-sex
const TER_QUI_SAB = [false, true, false, true, false, true, false]
const SEG_QUA_SEX = [true, false, true, false, true, false, false]

// resolveStepDays — passo ausente cai no fallback (weekly_days de sempre).
check('resolveStepDays sem nada salvo usa fallback pros 4 passos', resolveStepDays(null, WEEKDAYS), {
  prayer: WEEKDAYS, reading: WEEKDAYS, study: WEEKDAYS, reflection: WEEKDAYS,
})
check('resolveStepDays com só leitura configurada mantém os outros no fallback', resolveStepDays({ reading: TER_QUI_SAB }, WEEKDAYS), {
  prayer: WEEKDAYS, reading: TER_QUI_SAB, study: WEEKDAYS, reflection: WEEKDAYS,
})
check('resolveStepDays sem fallback válido usa seg-sex', resolveStepDays(null, null), {
  prayer: WEEKDAYS, reading: WEEKDAYS, study: WEEKDAYS, reflection: WEEKDAYS,
})

// stepsScheduledForWeekday / markedWeekdayUnion — leitura e estudo em dias
// diferentes (persona do HANDOFF: ter/qui/sáb leitura, seg/qua/sex estudo).
const resolved = { prayer: WEEKDAYS, reading: TER_QUI_SAB, study: SEG_QUA_SEX, reflection: TER_QUI_SAB }
const active = ['prayer', 'reading', 'study', 'reflection']
check('terça (índice 1) tem oração, leitura e reflexão — não estudo', stepsScheduledForWeekday(resolved, active, 1).sort(), ['prayer', 'reading', 'reflection'].sort())
check('segunda (índice 0) tem oração e estudo — não leitura nem reflexão', stepsScheduledForWeekday(resolved, active, 0).sort(), ['prayer', 'study'].sort())
check('domingo (índice 6) não tem nada marcado', stepsScheduledForWeekday(resolved, active, 6), [])
check('união de dias marcados: seg a sáb (só domingo de fora)', markedWeekdayUnion(resolved, active), [true, true, true, true, true, true, false])
check('6 dias com algo marcado', countMarkedWeekdays(resolved, active), 6)

// isStepDayFulfilled
check('dia sem nada agendado nunca é cumprido', isStepDayFulfilled({ prayer: true }, []), false)
check('dia cumprido: todos os passos agendados feitos', isStepDayFulfilled({ prayer: true, study: true }, ['prayer', 'study']), true)
check('dia não cumprido: falta um passo agendado', isStepDayFulfilled({ prayer: true }, ['prayer', 'study']), false)

// computeStepWeekGoal — mesma conta que precisa bater em 3 lugares (grade
// 35a, pílula 35c, cartão "Esta semana").
const dailyRoutine = {
  '2026-09-07': { prayer: true, reading: true, reflection: true }, // segunda... espera, 2026-09-07 é segunda? ver abaixo
}
// Usa datas fixas conhecidas: 2026-09-07 é segunda-feira (mesma referência
// de mondayOf/routineStreak.js já usada no resto do app).
const monday = new Date(2026, 8, 7) // 7 de setembro de 2026, segunda
const tuesday = new Date(2026, 8, 8)
const routine = {
  '2026-09-07': { prayer: true, study: true }, // segunda cumprida (só oração+estudo agendados)
  '2026-09-08': { prayer: true, reading: true }, // terça — falta reflexão, não cumprida
}
const goalMonday = computeStepWeekGoal(routine, resolved, active, monday)
check('segunda sozinha: 1 dia cumprido de 6 marcados', goalMonday, { doneCount: 1, markedCount: 6 })
const goalTuesday = computeStepWeekGoal(routine, resolved, active, tuesday)
check('até terça: ainda 1 cumprido (terça não fechou reflexão)', goalTuesday, { doneCount: 1, markedCount: 6 })

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de stepDaysMath passaram.')
