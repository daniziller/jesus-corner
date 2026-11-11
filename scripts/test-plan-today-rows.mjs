// Ordem canônica dos passos (src/routine/planTodayRows.js) — usada pelo
// guiado (App.jsx), pela Home, pelo mãos-livres e pelo Meu Plano. As
// funções da lista "Seu plano de hoje" de 35a/35b saíram com aquela tela
// (handoff-meu-plano-47, HANDOFF §11). Roda com: node scripts/test-plan-today-rows.mjs
import { STEP_ORDER } from '../src/routine/planTodayRows.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'ERRO'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}

check('STEP_ORDER continua Oração→Leitura→Estudo→Reflexão', STEP_ORDER, ['prayer', 'reading', 'study', 'reflection'])

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes de planTodayRows passaram.')
