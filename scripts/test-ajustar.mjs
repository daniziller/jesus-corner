// Testa a parte pura de "Ajustar meu plano" (handoff-meu-plano-47, A1–A4):
// src/meuPlano/ajustarMath.js. Roda com: node scripts/test-ajustar.mjs
import { buildPlan, weekMinutes, daysWithSomethingCount, weekTotalLabel, barHeight, daysLabel, stepSummary, clockSummary, canDisable, withEnabled, withMinutes, withDayToggled, withMethod, withClock, diffPlans, changesLine, reconcileDraft, weekFooter, clampMinutes, chaptersApprox, stageMinutes, perWeekLabel } from '../src/meuPlano/ajustarMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) { console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`); failures++ }
  else console.log(`OK: ${label}`)
}

const saved = buildPlan({
  routineModules: ['prayer', 'reading', 'study', 'reflection'],
  stepMinutes: { prayer: 10, reading: 15, study: 10, reflection: 5 }, plan: {},
  prayerMethod: 'acts', reflectionMethod: 'questions',
  stepDays: {
    prayer: [true, true, true, true, true, true, false],
    reading: [false, true, false, true, false, true, false],
    study: [true, false, true, false, true, false, false],
    reflection: [true, true, true, true, true, true, false],
  },
  clockPrefs: { showOnReading: true, warnAtZero: true, askToContinue: false },
})

// ── A1: minutos por dia, total, dias com algo ───────────────────────────
check('minutos de cada dia (25/30/25/30/25/30/—)', weekMinutes(saved), [25, 30, 25, 30, 25, 30, 0])
check('6 dias com algo', daysWithSomethingCount(saved), 6)
check('total "2 h 45"', weekTotalLabel(weekMinutes(saved).reduce((a, b) => a + b, 0)), '2 h 45')
check('totais: 45 min, 3 h, 2 h 05', [weekTotalLabel(45), weekTotalLabel(180), weekTotalLabel(125)], ['45 min', '3 h', '2 h 05'])
check('altura da barra: 25→30, 30→36, 35→42, 40→48, 60+→72', [barHeight(25), barHeight(30), barHeight(35), barHeight(40), barHeight(60), barHeight(90)], [30, 36, 42, 48, 72, 72])
check('estudo ligado sem estudo ativo não entra nos minutos', weekMinutes(saved, false), [15, 30, 15, 30, 15, 30, 0])
check('rodapé do cartão', [weekFooter(saved, true, 'março de 2029'), weekFooter(withEnabled(saved, 'reading', false), true, 'março de 2029')], ['2 h 45 por semana · a Bíblia termina em março de 2029', '2 h por semana'])
const nenhum = buildPlan({ routineModules: ['reading'], stepMinutes: {}, plan: {}, stepDays: { reading: [false, false, false, false, false, false, false] }, clockPrefs: {} })
check('nenhum dia marcado', [daysWithSomethingCount(nenhum), weekFooter(nenhum, true, 'x')], [0, 'Nenhum dia marcado'])

// ── escrita dos dias e resumos ─────────────────────────────────────────
check('dias: "ter, qui, sáb"', daysLabel(saved.stepDays.reading), 'ter, qui, sáb')
check('dias: "seg a sáb"', daysLabel(saved.stepDays.prayer), 'seg a sáb')
check('dias: "todos os dias"', daysLabel([true, true, true, true, true, true, true]), 'todos os dias')
check('dias: "seg a qua, sex" e "seg, ter"', [daysLabel([true, true, true, false, true, false, false]), daysLabel([true, true, false, false, false, false, false])], ['seg a qua, sex', 'seg, ter'])
check('resumos de A1', [stepSummary('prayer', saved), stepSummary('reading', saved, { readingPassage: 'Gênesis 41' }), stepSummary('study', saved, { study: { title: 'Ansiedade', dayN: 2, dayTotal: 7 } }), stepSummary('study', saved, {}), stepSummary('reflection', saved)], ['ACTS · seg a sáb', 'Gênesis 41 · ter, qui, sáb', 'Ansiedade, dia 2 de 7 · seg, qua, sex', 'Nenhum estudo em andamento', 'Com perguntas · seg a sáb'])
check('resumo desligado concorda com o passo', [stepSummary('reflection', withEnabled(saved, 'reflection', false)), stepSummary('study', withEnabled(saved, 'study', false))], ['Desligada · não entra na rotina nem no total', 'Desligado · não entra na rotina nem no total'])
check('cronômetro', [clockSummary(saved.clock), clockSummary({ showOnReading: false, warnAtZero: false, askToContinue: false }), clockSummary({ showOnReading: true, warnAtZero: true, askToContinue: true })], ['Aparece na leitura · avisa ao zerar', 'Desligado', 'Aparece na leitura · avisa ao zerar · pergunta se quero continuar'])

// ── regras ─────────────────────────────────────────────────────────────
check('último entre leitura e estudo não desliga', [canDisable(saved, 'reading'), canDisable(withEnabled(saved, 'study', false), 'reading'), canDisable(saved, 'prayer')], [true, false, true])
check('minutos de 5 a 60, de 5 em 5', [clampMinutes(0), clampMinutes(62), clampMinutes(23), withMinutes(saved, 'reading', 65).minutes.reading], [5, 60, 25, 60])
const lastDay = withDayToggled(withDayToggled(withDayToggled(saved, 'reading', 1).plan, 'reading', 3).plan, 'reading', 5)
check('desmarcar o último dia desliga o passo', [lastDay.disabled, lastDay.plan.enabled.reading], [true, false])

// ── rascunho × salvo ───────────────────────────────────────────────────
const draftA2 = withDayToggled(withMinutes(saved, 'reading', 20), 'reading', 5).plan
check('A2: 2 mudanças · leitura de 20 min, sábado sem leitura', changesLine(diffPlans(saved, draftA2)), '2 mudanças · leitura de 20 min, sábado sem leitura')
check('A2: cartão recalculado pelo rascunho (35 ter/qui, 15 sáb)', weekMinutes(draftA2), [25, 35, 25, 35, 25, 15, 0])
check('A3: 1 mudança · reflexão desligada', changesLine(diffPlans(saved, withEnabled(saved, 'reflection', false))), '1 mudança · reflexão desligada')
check('três ou mais: só a contagem', changesLine(diffPlans(saved, withMethod(withDayToggled(withMinutes(saved, 'reading', 20), 'reading', 5).plan, 'prayer', 'free'))), '3 mudanças')
check('cronômetro conta como mudança', changesLine(diffPlans(saved, withClock(saved, 'askToContinue', true))), '1 mudança · cronômetro')
check('mudança desfeita à mão → nada para salvar', diffPlans(saved, withMinutes(withMinutes(saved, 'reading', 20), 'reading', 15)).length, 0)
check('ligar: "estudo ligado", "oração ligada"', [diffPlans(withEnabled(saved, 'study', false), saved)[0].text, diffPlans(withEnabled(saved, 'prayer', false), saved)[0].text], ['estudo ligado', 'oração ligada'])
const newSaved = { ...saved, stepDays: { ...saved.stepDays, reading: [true, true, false, true, false, true, false] } }
const back = reconcileDraft(draftA2, saved, newSaved)
check('volta de 35i: dias da leitura vêm do salvo novo, minutos do rascunho ficam', [back.stepDays.reading, back.minutes.reading], [[true, true, false, true, false, true, false], 20])

// ── textos do passo aberto ─────────────────────────────────────────────
check('capítulos no ritmo', [chaptersApprox(1.4), chaptersApprox(1), chaptersApprox(2.6), chaptersApprox(0.4), chaptersApprox(0.1)], ['Cerca de um capítulo e meio no seu ritmo', 'Cerca de um capítulo no seu ritmo', 'Cerca de dois capítulos e meio no seu ritmo', 'Cerca de meio capítulo no seu ritmo', null])
check('min por etapa com vírgula', [stageMinutes(10), stageMinutes(20), stageMinutes(15)], ['2,5 min por etapa', '5 min por etapa', '3,8 min por etapa'])
check('"{n} por semana"', perWeekLabel(saved.stepDays.reading), '3 por semana')

if (failures > 0) { console.error(`\n${failures} verificação(ões) falharam.`); process.exit(1) }
console.log('\nTodos os testes do Ajustar (parte pura) passaram.')
