// Testa src/bible/relativeDayPeriod.js (pacote 39, 39a "sábado à noite").
// Roda com: node scripts/test-relative-day-period.mjs
import { relativeDayPeriod } from '../src/bible/relativeDayPeriod.js'

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

const now = new Date('2026-09-08T10:00:00') // terça

check('hoje de manhã', relativeDayPeriod('2026-09-08T08:30:00', 'pt', now), { day: 'today', period: 'morning' })
check('hoje à tarde', relativeDayPeriod('2026-09-08T14:00:00', 'pt', now), { day: 'today', period: 'afternoon' })
check('ontem à noite', relativeDayPeriod('2026-09-07T20:00:00', 'pt', now), { day: 'yesterday', period: 'evening' })
check('sábado à noite (3 dias atrás)', relativeDayPeriod('2026-09-05T21:00:00', 'pt', now), { day: 'sábado', period: 'evening' })
check('meio-dia exato cai em tarde', relativeDayPeriod('2026-09-08T12:00:00', 'pt', now), { day: 'today', period: 'afternoon' })
check('17h59 ainda é tarde', relativeDayPeriod('2026-09-08T17:59:00', 'pt', now), { day: 'today', period: 'afternoon' })
check('18h00 já é noite', relativeDayPeriod('2026-09-08T18:00:00', 'pt', now), { day: 'today', period: 'evening' })

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de relativeDayPeriod passaram.')
