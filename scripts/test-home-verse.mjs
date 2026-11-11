// Home (34a) — testa a parte pura de src/home/homeVerseMath.js (o fetch do
// texto do capítulo, em bible-text/bibleTextStore.js, é I/O — verificado
// manualmente no navegador). Roda com: node scripts/test-home-verse.mjs
import { dailyVerseIndex } from '../src/home/homeVerseMath.js'

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

check('dailyVerseIndex sem versículos', dailyVerseIndex(0), 0)
check('dailyVerseIndex 1 versículo só, sempre 0', dailyVerseIndex(1, new Date(2026, 0, 1)), 0)
check('dailyVerseIndex 1º de janeiro (dia 1) com 10 versículos', dailyVerseIndex(10, new Date(2026, 0, 1)), 1)
check('dailyVerseIndex gira dentro do total de versículos', dailyVerseIndex(5, new Date(2026, 0, 5)), 0)

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de homeVerseMath passaram.')
