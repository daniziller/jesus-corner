// Bloco 2 do redesign — testa src/metrics/sessionDurationMath.js contra a
// persona única do ADENDO-TURNOS-24-32.md: "9 h 05 no app (2 h 05 orando,
// 5 h 40 lendo, 1 h 20 refletindo)". Roda com:
// node scripts/test-session-duration.mjs
import { totalsByStep, totalsByDay, totalsForDay, averageSessionSeconds } from '../src/metrics/sessionDurationMath.js'

let failures = 0
function check(label, actual, expected) {
  if (actual !== expected) {
    console.error(`FALHOU: ${label} — esperado ${expected}, veio ${actual}`)
    failures++
  } else {
    console.log(`OK: ${label} = ${actual}`)
  }
}

const H = 3600
// Linhas fictícias somando exatamente a persona: 2h05 orando (7500s),
// 5h40 lendo (20400s), 1h20 refletindo (4800s) — total 9h05 (32700s).
const rows = [
  { data: '2026-08-25', passo: 'prayer', segundos: 25 * 60 },
  { data: '2026-08-26', passo: 'prayer', segundos: 25 * 60 },
  { data: '2026-08-28', passo: 'prayer', segundos: 30 * 60 },
  { data: '2026-08-30', passo: 'prayer', segundos: 45 * 60 },
  { data: '2026-08-25', passo: 'reading', segundos: 80 * 60 },
  { data: '2026-08-26', passo: 'reading', segundos: 80 * 60 },
  { data: '2026-08-28', passo: 'reading', segundos: 80 * 60 },
  { data: '2026-08-30', passo: 'reading', segundos: 100 * 60 },
  { data: '2026-08-25', passo: 'reflection', segundos: 20 * 60 },
  { data: '2026-08-26', passo: 'reflection', segundos: 20 * 60 },
  { data: '2026-08-28', passo: 'reflection', segundos: 20 * 60 },
  { data: '2026-08-30', passo: 'reflection', segundos: 20 * 60 },
]

const totals = totalsByStep(rows)
check('total orando == 2h05 (7500s)', totals.prayer, 2 * H + 5 * 60)
check('total lendo == 5h40 (20400s)', totals.reading, 5 * H + 40 * 60)
check('total refletindo == 1h20 (4800s)', totals.reflection, 1 * H + 20 * 60)
check('total geral == 9h05 (32700s)', totals.prayer + totals.reading + totals.reflection, 9 * H + 5 * 60)

check('sem linhas -> totalsByStep zerado', totalsByStep([]).prayer, 0)
check('sem linhas -> averageSessionSeconds == 0', averageSessionSeconds([]), 0)

const byDay = totalsByDay(rows)
check('4 dias com sessão', Object.keys(byDay).length, 4)
check('dia 25/08 (25+80+20 min)', byDay['2026-08-25'], (25 + 80 + 20) * 60)
check('dia mais longo é 30/08 (45+100+20 min)', byDay['2026-08-30'], (45 + 100 + 20) * 60)

const avg = averageSessionSeconds(rows)
const expectedAvg = Math.round(Object.values(byDay).reduce((s, v) => s + v, 0) / 4)
check('sessão média == soma dos dias / dias com sessão', avg, expectedAvg)

const day30 = totalsForDay(rows, '2026-08-30')
check('totalsForDay 30/08: orando 45min', day30.prayer, 45 * 60)
check('totalsForDay 30/08: lendo 100min', day30.reading, 100 * 60)
check('totalsForDay 30/08: refletindo 20min', day30.reflection, 20 * 60)
check('totalsForDay dia sem sessão nenhuma', totalsForDay(rows, '2026-08-27').prayer, 0)

// sinceDate filtra corretamente.
const sinceLater = totalsByStep(rows, '2026-08-28')
check('sinceDate filtra: orando só 28 e 30 (30+45 min)', sinceLater.prayer, (30 + 45) * 60)

// untilDate (pedido dela, 2026-09-12: "filtro de data de início e fim") —
// intervalo fechado dos dois lados, não só um início aberto até agora.
const rangeMiddle = totalsByStep(rows, '2026-08-26', '2026-08-28')
check('início E fim: orando só 26 e 28 (25+30 min)', rangeMiddle.prayer, (25 + 30) * 60)
const untilOnly = totalsByStep(rows, null, '2026-08-26')
check('só fim (sem início): orando 25 e 26 (25+25 min)', untilOnly.prayer, (25 + 25) * 60)

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de sessionDurationMath passaram.')
