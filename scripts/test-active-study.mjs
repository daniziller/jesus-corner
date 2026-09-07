// Turno 35, Bloco 2 — testa src/studies/activeStudyMath.js (data de retorno
// do plano principal quando um estudo guiado termina). Roda com:
// node scripts/test-active-study.mjs
import { computeStudyResumeDate, resumeDateKey } from '../src/studies/activeStudyMath.js'

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

// 2026-09-07 é uma segunda-feira (índice 0). Estudo com dias seg/qua/sex
// (índices 0,2,4), 7 dias de duração total.
const monday = new Date(2026, 8, 7)
const segQuaSex = [true, false, true, false, true, false, false]

// Ativado na segunda: conta seg(não, é o dia de ativação, não conta) —
// espera-se: qua(1), sex(2), seg seguinte(3), qua(4), sex(5), seg(6), qua(7)
// = 7º dia de estudo cai numa quarta 2 semanas depois; retorna no dia seguinte.
check('ativado numa segunda, 7 dias de estudo (seg/qua/sex)', resumeDateKey(monday, segQuaSex, 7), '2026-09-24')

// Sem nenhum dia marcado: cai no dia seguinte (não trava).
check('sem dia marcado nenhum: dia seguinte', resumeDateKey(monday, [false, false, false, false, false, false, false], 5), '2026-09-08')

// totalDays 0: dia seguinte.
check('0 dias de estudo: dia seguinte', resumeDateKey(monday, segQuaSex, 0), '2026-09-08')

// 1 dia de estudo, só sexta marcada: a próxima sexta é 2026-09-11; retorna sábado.
check('1 dia de estudo, só sexta marcada', resumeDateKey(monday, [false, false, false, false, true, false, false], 1), '2026-09-12')

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de activeStudyMath passaram.')
