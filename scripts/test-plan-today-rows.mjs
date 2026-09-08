// Atualização 35a/35b (atualizacao-35-meu-plano/) — testa a parte pura de
// src/routine/planTodayRows.js reproduzindo os dois quadros de referência
// exatamente (mesma conta de exemplo: Oração feita, Leitura "agora" em
// 35a; Estudo "agora" no lugar da Leitura em 35b). Roda com:
// node scripts/test-plan-today-rows.mjs
import { STEP_ORDER, orderStepsWithOff, statusFor, metaKindFor, featuredStepsFor } from '../src/routine/planTodayRows.js'

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

// --- 35a: terça, dia de leitura, sem estudo ativo ---------------------
// Oração feita, Leitura é a vez, Reflexão a fazer, Estudo não é hoje.
const todaysSteps35a = ['prayer', 'reading', 'reflection']
const todayRoutine35a = { prayer: true }
const currentKey35a = 'reading'

const { orderedKeys: ordered35a, offSteps: off35a } = orderStepsWithOff(todaysSteps35a)
check('35a: ordem final (Oração, Leitura, Reflexão, Estudo no fim)', ordered35a, ['prayer', 'reading', 'reflection', 'study'])
check('35a: só Estudo fica de fora', off35a, ['study'])

for (const [key, expectedStatus] of [['prayer', 'done'], ['reading', 'now'], ['reflection', 'pending'], ['study', 'off']]) {
  check(`35a: status de ${key}`, statusFor(key, { offSteps: off35a, todayRoutine: todayRoutine35a, currentKey: currentKey35a }), expectedStatus)
}

const ctx35a = { activeStudyId: null, pausedStudyHasBook: false, hasNoPlan: false, reflectionMethod: 'questions' }
check('35a: meta de Oração feita usa horário (gênero feminino)', metaKindFor('prayer', 'done', ctx35a), 'prayerDone')
check('35a: meta de Leitura "agora" usa "onde você parou"', metaKindFor('reading', 'now', ctx35a), 'readingResume')
check('35a: meta de Reflexão "a fazer" descreve o método (perguntas)', metaKindFor('reflection', 'pending', ctx35a), 'reflectionQuestions')
check('35a: meta de Estudo "fora de hoje" é o motivo genérico', metaKindFor('study', 'off', ctx35a), 'notToday')

// --- 35b: mesma terça, com um Estudo de IA ativo -----------------------
// Estudo substitui a Leitura (regra de substituição); Leitura pausada some
// pro fim com a data de retorno; Reflexão passa a citar o estudo.
const todaysSteps35b = ['prayer', 'study', 'reflection'] // já com a substituição aplicada, como em RoutineScreen.jsx
const todayRoutine35b = { prayer: true }
const currentKey35b = 'study'

const { orderedKeys: ordered35b, offSteps: off35b } = orderStepsWithOff(todaysSteps35b)
check('35b: ordem final (Oração, Estudo, Reflexão, Leitura no fim)', ordered35b, ['prayer', 'study', 'reflection', 'reading'])
check('35b: só Leitura fica de fora (substituída)', off35b, ['reading'])

for (const [key, expectedStatus] of [['prayer', 'done'], ['study', 'now'], ['reflection', 'pending'], ['reading', 'off']]) {
  check(`35b: status de ${key}`, statusFor(key, { offSteps: off35b, todayRoutine: todayRoutine35b, currentKey: currentKey35b }), expectedStatus)
}

const ctx35b = { activeStudyId: 'ansiedade-1', pausedStudyHasBook: true, hasNoPlan: false, reflectionMethod: 'questions' }
check('35b: meta de Estudo "agora" mostra progresso (título · dia N de M)', metaKindFor('study', 'now', ctx35b), 'studyProgress')
check('35b: meta de Reflexão "a fazer" com estudo ativo vira "pergunta do estudo"', metaKindFor('reflection', 'pending', ctx35b), 'studyQuestion')
check('35b: meta de Leitura pausada mostra data de retorno (não o motivo genérico)', metaKindFor('reading', 'off', ctx35b), 'pausedUntil')

// Leitura sem o livro pausado carregado ainda (efeito assíncrono não
// resolveu) cai no motivo genérico em vez de quebrar.
check('35b: Leitura "fora de hoje" sem pausedStudy carregado ainda usa o motivo genérico', metaKindFor('reading', 'off', { ...ctx35b, pausedStudyHasBook: false }), 'notToday')

// --- Casos sem exemplo no quadro — encadeamento como reserva -----------
const ctxNoStudy = { activeStudyId: null, pausedStudyHasBook: false, hasNoPlan: false, reflectionMethod: 'free' }
check('Oração "a fazer" descreve o método (sem exemplo no quadro)', metaKindFor('prayer', 'pending', ctxNoStudy), 'prayerMethod')
check('Estudo "a fazer" sem estudo ativo cai no encadeamento (sem exemplo no quadro)', metaKindFor('study', 'pending', ctxNoStudy), 'chainAfter')
check('Reflexão "a fazer" com método livre descreve o método livre', metaKindFor('reflection', 'pending', ctxNoStudy), 'reflectionFree')
check('Leitura "a fazer" sem plano de leitura mostra o aviso de "sem plano"', metaKindFor('reading', 'pending', { ...ctxNoStudy, hasNoPlan: true }), 'noPlanReading')

check('STEP_ORDER continua Oração→Leitura→Estudo→Reflexão', STEP_ORDER, ['prayer', 'reading', 'study', 'reflection'])

// --- featuredStepsFor (card resumido da Home, 2026-09-08) --------------
check('35a: card da Home destaca só Leitura', featuredStepsFor(todaysSteps35a), ['reading'])
check('35b: card da Home destaca só Estudo (substituiu a Leitura)', featuredStepsFor(todaysSteps35b), ['study'])
check('Leitura E Estudo no mesmo dia (modelo independente) → os dois no card', featuredStepsFor(['prayer', 'reading', 'study', 'reflection']), ['reading', 'study'])
check('nem Leitura nem Estudo hoje → cai pro par Oração/Reflexão', featuredStepsFor(['prayer', 'reflection']), ['prayer', 'reflection'])
check('só Oração hoje (Reflexão desligada) → só Oração', featuredStepsFor(['prayer']), ['prayer'])
check('nenhum passo hoje → nada destacado (card mostra "Dia off")', featuredStepsFor([]), [])

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de planTodayRows passaram.')
