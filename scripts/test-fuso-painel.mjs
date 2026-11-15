// "Hoje" do painel no fuso de Brasília (api/_lib/brazilDay.js).
import { brazilToday } from '../api/_lib/brazilDay.js'

let failures = 0
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${name}${ok ? '' : ` — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`}`)
}

check('20h em Brasília ainda é o mesmo dia', brazilToday(Date.parse('2026-11-15T23:00:00Z')), { iso: '2026-11-15T03:00:00.000Z', dateKey: '2026-11-15' })
check('21h30 em Brasília (00h30 UTC do dia seguinte) continua hoje', brazilToday(Date.parse('2026-11-16T00:30:00Z')), { iso: '2026-11-15T03:00:00.000Z', dateKey: '2026-11-15' })
check('meia-noite em Brasília vira o dia', brazilToday(Date.parse('2026-11-16T03:00:00Z')), { iso: '2026-11-16T03:00:00.000Z', dateKey: '2026-11-16' })
check('virada de mês', brazilToday(Date.parse('2026-12-01T02:59:00Z')), { iso: '2026-11-30T03:00:00.000Z', dateKey: '2026-11-30' })

if (failures) { console.log(`\n${failures} falha(s).`); process.exit(1) }
console.log('\nO "hoje" do painel segue o fuso de Brasília.')
