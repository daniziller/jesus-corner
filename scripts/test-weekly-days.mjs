// Bloco 2 do redesign — testa a parte pura de src/routine/weeklyDaysMath.js
// (getWeeklyDays/setWeeklyDays, em weeklyDaysStore.js, fazem I/O de rede —
// verificados manualmente em modo convidado no navegador, não aqui).
// Roda com: node scripts/test-weekly-days.mjs
import { DAY_KEYS, WEEKLY_DAYS_PRESETS, countTrue } from '../src/routine/weeklyDaysMath.js'

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

check('DAY_KEYS tem 7 dias, começando em Mon', DAY_KEYS, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
check('countTrue([])', countTrue([false, false, false, false, false, false, false]), 0)
check('countTrue(todos)', countTrue([true, true, true, true, true, true, true]), 7)

for (const [name, preset] of Object.entries(WEEKLY_DAYS_PRESETS)) {
  if (preset.length !== 7) { console.error(`FALHOU: preset ${name} não tem 7 posições`); failures++ }
}
check('preset threeDays == 3 dias', countTrue(WEEKLY_DAYS_PRESETS.threeDays), 3)
check('preset fourDays == 4 dias', countTrue(WEEKLY_DAYS_PRESETS.fourDays), 4)
check('preset weekdays == 5 dias', countTrue(WEEKLY_DAYS_PRESETS.weekdays), 5)
check('preset everyDay == 7 dias', countTrue(WEEKLY_DAYS_PRESETS.everyDay), 7)
// Persona do ADENDO: "4 dias marcados por semana (seg, qua, sex, dom)".
check('preset fourDays bate com a persona (seg/qua/sex/dom)', WEEKLY_DAYS_PRESETS.fourDays, [true, false, true, false, true, false, true])

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes de weeklyDaysStore (parte pura) passaram.')
