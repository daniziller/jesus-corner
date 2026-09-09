// Atualização 35a/35b (atualizacao-35-meu-plano/), revisado no pacote
// handoff-app-completo (trilhas independentes: Leitura e Estudo têm dias
// próprios, sem substituição nem pausa) — testa a parte pura de
// src/routine/planTodayRows.js reproduzindo os quadros de referência (35a:
// Oração feita, Leitura "agora", sem Estudo hoje; 35b: mesma terça, mas
// COM Estudo ativo também caindo hoje — os dois passos coexistem, Leitura
// primeiro). Roda com: node scripts/test-plan-today-rows.mjs
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
// Oração feita, Leitura é a vez, Reflexão a fazer, Estudo LIGADO no toggle
// mas não é dia dele hoje (dia de folga, não desligado — ver PNG 35a:
// "Estudo · Hoje não é dia de estudo").
const todaysSteps35a = ['prayer', 'reading', 'reflection']
const activeSteps35a = ['prayer', 'reading', 'study', 'reflection']
const todayRoutine35a = { prayer: true }
const currentKey35a = 'reading'

const { orderedKeys: ordered35a, offSteps: off35a } = orderStepsWithOff(todaysSteps35a, activeSteps35a)
check('35a: ordem final (Oração, Leitura, Reflexão, Estudo no fim)', ordered35a, ['prayer', 'reading', 'reflection', 'study'])
check('35a: só Estudo fica de fora (dia de folga, toggle ligado)', off35a, ['study'])

for (const [key, expectedStatus] of [['prayer', 'done'], ['reading', 'now'], ['reflection', 'pending'], ['study', 'off']]) {
  check(`35a: status de ${key}`, statusFor(key, { offSteps: off35a, todayRoutine: todayRoutine35a, currentKey: currentKey35a }), expectedStatus)
}

const ctx35a = { activeStudyId: null, hasNoPlan: false, reflectionMethod: 'questions' }
check('35a: meta de Oração feita usa horário (gênero feminino)', metaKindFor('prayer', 'done', ctx35a), 'prayerDone')
check('35a: meta de Leitura "agora" usa "onde você parou"', metaKindFor('reading', 'now', ctx35a), 'readingResume')
check('35a: meta de Reflexão "a fazer" descreve o método (perguntas)', metaKindFor('reflection', 'pending', ctx35a), 'reflectionQuestions')
check('35a: meta de Estudo "fora de hoje" é o motivo genérico', metaKindFor('study', 'off', ctx35a), 'notToday')

// --- 35b: mesma terça, com um Estudo de IA ativo E dia de Leitura ------
// Trilhas independentes (handoff-app-completo): Leitura e Estudo caem no
// mesmo dia sem se substituir, Leitura primeiro na ordem (STEP_ORDER).
const todaysSteps35b = ['prayer', 'reading', 'study', 'reflection']
const activeSteps35b = ['prayer', 'reading', 'study', 'reflection']
const todayRoutine35b = { prayer: true, reading: true }
const currentKey35b = 'study'

const { orderedKeys: ordered35b, offSteps: off35b } = orderStepsWithOff(todaysSteps35b, activeSteps35b)
check('35b: ordem final (Oração, Leitura, Estudo, Reflexão — nada de fora)', ordered35b, ['prayer', 'reading', 'study', 'reflection'])
check('35b: nenhum passo fica de fora', off35b, [])

// --- Achado dela (2026-09-09): toggle desligado ≠ dia de folga ---------
// Estudo com o TOGGLE desligado (nem em activeSteps) não aparece na lista
// de jeito nenhum — nem esmaecido no fim. Só Oração/Leitura/Reflexão.
const activeStepsToggleOff = ['prayer', 'reading', 'reflection'] // Estudo desligado
const { orderedKeys: orderedToggleOff, offSteps: offToggleOff } = orderStepsWithOff(['prayer', 'reading', 'reflection'], activeStepsToggleOff)
check('Toggle de Estudo desligado: some da lista de vez, não fica esmaecido', orderedToggleOff, ['prayer', 'reading', 'reflection'])
check('Toggle de Estudo desligado: não conta como "de fora hoje"', offToggleOff, [])

for (const [key, expectedStatus] of [['prayer', 'done'], ['reading', 'done'], ['study', 'now'], ['reflection', 'pending']]) {
  check(`35b: status de ${key}`, statusFor(key, { offSteps: off35b, todayRoutine: todayRoutine35b, currentKey: currentKey35b }), expectedStatus)
}

const ctx35b = { activeStudyId: 'ansiedade-1', hasNoPlan: false, reflectionMethod: 'questions' }
check('35b: meta de Estudo "agora" mostra progresso (título · dia N de M)', metaKindFor('study', 'now', ctx35b), 'studyProgress')
check('35b: meta de Reflexão "a fazer" com estudo ativo vira "pergunta do estudo"', metaKindFor('reflection', 'pending', ctx35b), 'studyQuestion')

// --- Casos sem exemplo no quadro — encadeamento como reserva -----------
const ctxNoStudy = { activeStudyId: null, hasNoPlan: false, reflectionMethod: 'free' }
check('Oração "a fazer" descreve o método (sem exemplo no quadro)', metaKindFor('prayer', 'pending', ctxNoStudy), 'prayerMethod')
check('Estudo "a fazer" sem estudo ativo cai no encadeamento (sem exemplo no quadro)', metaKindFor('study', 'pending', ctxNoStudy), 'chainAfter')
check('Reflexão "a fazer" com método livre descreve o método livre', metaKindFor('reflection', 'pending', ctxNoStudy), 'reflectionFree')
check('Leitura "a fazer" sem plano de leitura mostra o aviso de "sem plano"', metaKindFor('reading', 'pending', { ...ctxNoStudy, hasNoPlan: true }), 'noPlanReading')

check('STEP_ORDER continua Oração→Leitura→Estudo→Reflexão', STEP_ORDER, ['prayer', 'reading', 'study', 'reflection'])

// --- featuredStepsFor (card resumido da Home, 2026-09-08) --------------
check('35a: card da Home destaca só Leitura', featuredStepsFor(todaysSteps35a), ['reading'])
check('35b: card da Home destaca Leitura e Estudo (os dois caem hoje)', featuredStepsFor(todaysSteps35b), ['reading', 'study'])
check('Leitura E Estudo no mesmo dia (modelo independente) → os dois no card', featuredStepsFor(['prayer', 'reading', 'study', 'reflection']), ['reading', 'study'])
check('nem Leitura nem Estudo hoje → cai pro par Oração/Reflexão', featuredStepsFor(['prayer', 'reflection']), ['prayer', 'reflection'])
check('só Oração hoje (Reflexão desligada) → só Oração', featuredStepsFor(['prayer']), ['prayer'])
check('nenhum passo hoje → nada destacado (card mostra "Dia off")', featuredStepsFor([]), [])

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de planTodayRows passaram.')
