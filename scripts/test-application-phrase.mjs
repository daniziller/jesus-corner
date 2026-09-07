// Home (34a) — testa a parte pura de src/reflection/applicationPhraseMath.js
// (getWeekApplicationStatus/getPinnedApplicationEntry, em
// applicationPhraseStore.js, fazem I/O de rede — verificados manualmente
// no navegador). Roda com: node scripts/test-application-phrase.mjs
import { countWeekApplications } from '../src/reflection/applicationPhraseMath.js'

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

// Semana de segunda 2026-08-31 até domingo (hoje = terça 2026-09-01).
const monday = '2026-08-31'
const today = '2026-09-01'

check('sem entradas', countWeekApplications([], monday, today), { total: 0, fulfilled: 0 })

check(
  '1 entrada dentro da semana, cumprida',
  countWeekApplications([{ date: '2026-08-31', fulfilled: true }], monday, today),
  { total: 1, fulfilled: 1 },
)

check(
  '1 entrada dentro da semana, não cumprida',
  countWeekApplications([{ date: '2026-09-01', fulfilled: false }], monday, today),
  { total: 1, fulfilled: 0 },
)

check(
  'entrada de semana passada não conta',
  countWeekApplications([{ date: '2026-08-24', fulfilled: true }], monday, today),
  { total: 0, fulfilled: 0 },
)

check(
  'entrada no futuro (depois de hoje) não conta',
  countWeekApplications([{ date: '2026-09-05', fulfilled: true }], monday, today),
  { total: 0, fulfilled: 0 },
)

check(
  'mistura de dentro/fora da semana, algumas cumpridas',
  countWeekApplications([
    { date: '2026-08-24', fulfilled: true }, // semana passada
    { date: '2026-08-31', fulfilled: true }, // segunda desta semana
    { date: '2026-09-01', fulfilled: false }, // hoje
  ], monday, today),
  { total: 2, fulfilled: 1 },
)

check('entrada sem date é ignorada', countWeekApplications([{ fulfilled: true }], monday, today), { total: 0, fulfilled: 0 })

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de applicationPhraseMath passaram.')
