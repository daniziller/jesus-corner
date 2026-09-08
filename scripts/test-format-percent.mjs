// Testa src/bible/formatPercent.js (pacote 39). Roda com:
// node scripts/test-format-percent.mjs
import { formatPercent } from '../src/bible/formatPercent.js'

let failures = 0
function check(label, actual, expected) {
  const ok = actual === expected
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado "${expected}", veio "${actual}"`)
    failures++
  } else {
    console.log(`OK: ${label} = "${actual}"`)
  }
}

check('5.4 vira 5,4 (pt)', formatPercent(5.4, 'pt'), '5,4')
check('0 fica sem decimal (pt)', formatPercent(0, 'pt'), '0')
check('100 fica sem decimal (pt)', formatPercent(100, 'pt'), '100')
check('4.2 vira 4,2 (pt)', formatPercent(4.2, 'pt'), '4,2')
check('80 fica sem decimal (pt)', formatPercent(80, 'pt'), '80')
check('5.4 fica com ponto (en)', formatPercent(5.4, 'en'), '5.4')
check('0 fica sem decimal (en)', formatPercent(0, 'en'), '0')

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de formatPercent passaram.')
