// Testa a parte pura da tela "Seu plano" (handoff-meu-plano-47, P6):
// src/meuPlano/seuPlanoMath.js. Roda com: node scripts/test-seu-plano.mjs
import { computeWeekRows, daysWithSomething, countDaysWithSomething, paceSentence, readingHeadline, readingSubline, reminderLine } from '../src/meuPlano/seuPlanoMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) { console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`); failures++ }
  else console.log(`OK: ${label}`)
}

const ALL = ['prayer', 'reading', 'study', 'reflection']
const stepDays = {
  prayer: [true, true, true, true, true, true, false],
  reading: [false, true, false, true, false, true, false],
  study: [true, false, true, false, true, false, false],
  reflection: [true, true, true, true, true, true, false],
}
const minutes = { prayer: 10, reading: 15, study: 10, reflection: 5 }
// Hoje: terça 2026-09-01. Segunda 31/08 cumprida (oração, estudo, reflexão).
const today = new Date(2026, 8, 1, 10)
const routine = { '2026-08-31': { prayer: true, study: true, reflection: true }, '2026-09-01': { prayer: true } }
const rows = computeWeekRows({ stepDays, routineModules: ALL, minutes, dailyRoutine: routine, today })

check('7 linhas, segunda a domingo, com o número do dia', [rows.length, rows.map(r => r.dayNumber), rows.map(r => r.abbr)], [7, [31, 1, 2, 3, 4, 5, 6], ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']])
check('segunda cumprida: estado done, chips feitos', [rows[0].state, rows[0].fulfilled, rows[0].chips.map(c => c.state)], ['done', true, ['done', 'done', 'done']])
check('terça (hoje): oração feita, leitura é o agora, reflexão por fazer', [rows[1].state, rows[1].isToday, rows[1].chips.map(c => `${c.key}:${c.state}`), rows[1].minutes], ['today', true, ['prayer:done', 'reading:now', 'reflection:todo'], 30])
check('quarta por vir: chips por fazer e total de minutos', [rows[2].state, rows[2].chips.map(c => c.state), rows[2].minutes], ['upcoming', ['todo', 'todo', 'todo'], 25])
check('domingo: descanso, sem chips', [rows[6].state, rows[6].chips.length, rows[6].minutes], ['rest', 0, 0])
const rowsLate = computeWeekRows({ stepDays, routineModules: ALL, minutes, dailyRoutine: { '2026-08-31': { prayer: true } }, today })
check('dia passado não cumprido: estado past, chip feito em marrom, os outros por fazer', [rowsLate[0].state, rowsLate[0].chips.map(c => c.state)], ['past', ['done', 'todo', 'todo']])
check('"6 dias com algo" e singular', [daysWithSomething(6), daysWithSomething(1), countDaysWithSomething(stepDays, ALL)], ['6 dias com algo', '1 dia com algo', 6])
check('passo desligado não conta nos dias', countDaysWithSomething(stepDays, ['reading']), 3)
check('ritmo fixo e aprendido', [paceSentence(1.4, false, 3), paceSentence(1.4, true, 3), paceSentence(1, true, 1), paceSentence(2.5, true, 2)], ['Nesse ritmo: um capítulo por dia de leitura, 3 dias por semana', 'Nesse ritmo: cerca de 1,4 capítulos por dia de leitura, 3 dias por semana', 'Nesse ritmo: cerca de 1 capítulo por dia de leitura, 1 dia por semana', 'Nesse ritmo: cerca de 2,5 capítulos por dia de leitura, 2 dias por semana'])
check('título e subtítulo da leitura', [readingHeadline('Gênesis', 41, 50), readingSubline('Pentateuco', 40, 1189)], ['Gênesis 41 de 50', 'Pentateuco · 40 de 1.189 capítulos lidos'])
check('lembrete', [reminderLine({ hour: 6, minute: 30 }), reminderLine({ hour: 19, minute: 5 }), reminderLine(null)], ['6:30 nos dias combinados', '19:05 nos dias combinados', null])

if (failures > 0) { console.error(`\n${failures} verificação(ões) falharam.`); process.exit(1) }
console.log('\nTodos os testes de Seu plano (parte pura) passaram.')
