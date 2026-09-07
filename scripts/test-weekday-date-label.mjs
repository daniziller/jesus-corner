// Turno 35, Bloco 2 — testa src/utils/weekdayDateLabel.js. Roda com:
// node scripts/test-weekday-date-label.mjs
import { formatWeekdayDate } from '../src/utils/weekdayDateLabel.js'

let failures = 0
function check(label, actual, expected) {
  if (actual !== expected) {
    console.error(`FALHOU: ${label} — esperado "${expected}", veio "${actual}"`)
    failures++
  } else {
    console.log(`OK: ${label} = "${actual}"`)
  }
}

// 2026-09-09 é uma quarta-feira.
check('pt: quarta, 9 de setembro', formatWeekdayDate('2026-09-09', 'pt'), 'quarta, 9 de setembro')
check('en: Wednesday, September 9', formatWeekdayDate('2026-09-09', 'en'), 'Wednesday, September 9')
check('vazio devolve vazio', formatWeekdayDate(null, 'pt'), '')
// 2026-01-01 é uma quinta-feira.
check('pt: virada de ano', formatWeekdayDate('2026-01-01', 'pt'), 'quinta, 1 de janeiro')

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de weekdayDateLabel passaram.')
