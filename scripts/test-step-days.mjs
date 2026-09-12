// Turno 35, Bloco 1 — testa a parte pura de src/routine/stepDaysMath.js
// (getStepDays/setStepDays, em stepDaysStore.js, fazem I/O — verificados
// manualmente no navegador, não aqui). Roda com:
// node scripts/test-step-days.mjs
import { resolveStepDays, stepsScheduledForWeekday, markedWeekdayUnion, countMarkedWeekdays, isStepDayFulfilled, computeStepWeekGoal, computeWeekPillStates, stepSatisfiedDays, pendingMakeupWeekdays } from '../src/routine/stepDaysMath.js'

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

// computeWeekPillStates — as 7 pílulas de "Esta semana" (35a). "Hoje" é
// terça, ainda não cumprida (falta reflexão) -> 'today', não 'upcoming'.
// Domingo sem nada marcado -> 'rest'. Nenhum estado de "perdido" existe.
const pillStates = computeWeekPillStates(routine, resolved, active, tuesday)
check('estados da semana: seg cumprida, ter=hoje, qua–sáb por vir, dom descanso', pillStates, ['done', 'today', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'rest'])

// stepSatisfiedDays / pendingMakeupWeekdays / repor no dia de folga
// (pedido dela, 2026-09-12): "leitura" cai só segunda (índice 0) nesta
// mini-agenda; ela perdeu segunda, mas leu mesmo assim na quarta (índice
// 2, dia de folga da leitura) — segunda passa a contar como cumprida, sem
// mexer em nenhum outro dia.
const readingMondayOnly = [true, false, false, false, false, false, false]
const wednesday = new Date(2026, 8, 9) // 9 de setembro de 2026, quarta
const missedThenMadeUp = {
  '2026-09-07': {}, // segunda — leitura não feita
  '2026-09-09': { reading: true }, // quarta — dia de folga da leitura, mas leu
}
const satisfiedBeforeMakeup = stepSatisfiedDays(readingMondayOnly, missedThenMadeUp, 'reading', monday, monday)
check('sem chegar na quarta ainda, segunda continua em aberto', satisfiedBeforeMakeup, { satisfied: [false, false, false, false, false, false, false], pendingMissed: [0] })
const satisfiedAfterMakeup = stepSatisfiedDays(readingMondayOnly, missedThenMadeUp, 'reading', monday, wednesday)
check('reposição na quarta quita a segunda perdida', satisfiedAfterMakeup, { satisfied: [true, false, false, false, false, false, false], pendingMissed: [] })
check('pendingMakeupWeekdays antes da reposição aponta segunda (índice 0)', pendingMakeupWeekdays(readingMondayOnly, missedThenMadeUp, 'reading', monday), [0])
check('pendingMakeupWeekdays depois da reposição fica vazio', pendingMakeupWeekdays(readingMondayOnly, missedThenMadeUp, 'reading', wednesday), [])

// Reposição só vale DENTRO da mesma semana (pedido dela, 2026-09-12):
// mudou a semana, os dias pendentes da semana ANTERIOR zeram — mesmo que
// o dia perdido da semana passada continue sem leitura no dailyRoutine, a
// fila de pendências só olha de segunda (desta semana) até hoje.
const missedAcrossWeeks = {
  '2026-08-31': {}, // segunda da semana PASSADA — leitura perdida lá
  '2026-09-07': {}, // segunda desta semana — perdida também
}
const tuesdayThisWeek = new Date(2026, 8, 8) // 8 de setembro, terça DESTA semana
check('reposição não atravessa semana: só a segunda desta semana conta como pendente', pendingMakeupWeekdays(readingMondayOnly, missedAcrossWeeks, 'reading', tuesdayThisWeek), [0])

// A reposição também precisa aparecer em computeStepWeekGoal (métrica da
// semana) — só "reading" ativo, pra isolar o efeito (markedCount = só a
// própria agenda da leitura, 1 dia = segunda), SEM reposição ainda vs. COM
// reposição na quarta.
const resolvedMakeup = { reading: readingMondayOnly }
const activeMakeup = ['reading']
const routineNoMakeup = {
  '2026-09-07': {}, // segunda: leitura perdida
  '2026-09-09': {}, // quarta: nada ainda
}
const goalNoMakeup = computeStepWeekGoal(routineNoMakeup, resolvedMakeup, activeMakeup, wednesday)
check('sem repor: segunda não conta — 0 de 1 dia marcado', goalNoMakeup, { doneCount: 0, markedCount: 1 })
const routineWithMakeup = {
  '2026-09-07': {},
  '2026-09-09': { reading: true }, // quarta: repõe a leitura de segunda
}
const goalWithMakeup = computeStepWeekGoal(routineWithMakeup, resolvedMakeup, activeMakeup, wednesday)
check('com repor na quarta: segunda passa a contar cumprida — 1 de 1', goalWithMakeup, { doneCount: 1, markedCount: 1 })

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de stepDaysMath passaram.')
