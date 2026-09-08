// Testa src/prayer/prayerRequestFormat.js — "24 dias"/"3 meses" pro 36d
// (pacote 36-37, Bloco 2): abaixo de 90 dias mostra dias, a partir daí
// meses arredondados. Roda com: node scripts/test-prayer-request-format.mjs
import { daysOrMonthsSpan, calendarDaysSince } from '../src/prayer/prayerRequestFormat.js'

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

check('1 dia (singular, pt)', daysOrMonthsSpan(1, 'pt'), '1 dia')
check('24 dias (exemplo do quadro, pt)', daysOrMonthsSpan(24, 'pt'), '24 dias')
check('61 dias fica em dias, não vira meses (exemplo do quadro, pt)', daysOrMonthsSpan(61, 'pt'), '61 dias')
check('89 dias ainda em dias', daysOrMonthsSpan(89, 'pt'), '89 dias')
check('90 dias já vira meses (3 meses)', daysOrMonthsSpan(90, 'pt'), '3 meses')
check('1 mês (singular, pt)', daysOrMonthsSpan(30, 'pt'), '30 dias')
check('~1 mês vira meses quando >= 90', daysOrMonthsSpan(95, 'pt'), '3 meses')
check('~8 meses (exemplo do quadro, pt)', daysOrMonthsSpan(240, 'pt'), '8 meses')
check('0 dias', daysOrMonthsSpan(0, 'pt'), '0 dias')
check('en: 1 day singular', daysOrMonthsSpan(1, 'en'), '1 day')
check('en: 24 days', daysOrMonthsSpan(24, 'en'), '24 days')
check('en: 8 months', daysOrMonthsSpan(240, 'en'), '8 months')

const dayMs = 86400000
check('calendarDaysSince: 2 dias atrás', calendarDaysSince(new Date(Date.now() - 2 * dayMs).toISOString()), 2)
check('calendarDaysSince: agora mesmo = 0', calendarDaysSince(new Date().toISOString()), 0)

if (failures > 0) {
  console.error(`\n${failures} teste(s) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de prayerRequestFormat passaram.')
