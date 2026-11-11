// Testa a parte pura da aba Meu Plano (handoff-meu-plano-47, etapa 1):
// src/meuPlano/meuPlanoMath.js. Roda com: node scripts/test-meu-plano.mjs
// Casos pedidos: nada feito; um feito e um por vir; passo aberto e
// interrompido; tudo feito; dia de descanso; todos os passos desligados;
// dia de estudo; leitura + estudo no mesmo dia; um passo só; virada de
// dia; rótulo do botão; texto da direita da barra; plurais.
import { computeMeuPlano, stepsCountText, barRightText, buttonLabel, nowCardLabel, nowCardMinutes, nowCardAria, doneLine, stepDescription, stepsSentence, tomorrowCard, seuPlanoLine, studiesLine, doneTitle, isStudyOnlyDay, formatHour, resolveMinutes, weekCountSentence, studyReturnDate } from '../src/meuPlano/meuPlanoMath.js'
import { dateKey } from '../src/utils/dateKey.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) { console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`); failures++ }
  else console.log(`OK: ${label}`)
}

const minutes = { prayer: 10, reading: 15, study: 10, reflection: 5 }
const ALL = ['prayer', 'reading', 'study', 'reflection']
// Seg/Qua/Sex: estudo · Ter/Qui/Sáb: leitura · Oração e Reflexão seg–sáb
const stepDays = {
  prayer: [true, true, true, true, true, true, false],
  reading: [false, true, false, true, false, true, false],
  study: [true, false, true, false, true, false, false],
  reflection: [true, true, true, true, true, true, false],
}
const TUE = 1, MON = 0, SUN = 6
const at = (h, m) => new Date(2026, 8, 1, h, m).toISOString()

// ── nada feito (P2) ────────────────────────────────────────────────────
const p2 = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: {}, todayIdx: TUE })
check('P2: três passos, nenhum feito, oração é o agora', [p2.kind, p2.steps.map(s => `${s.key}:${s.status}`), p2.now.key], ['before', ['prayer:now', 'reading:upcoming', 'reflection:upcoming'], 'prayer'])
check('P2: barra e botão', [stepsCountText(p2.doneCount, p2.total), barRightText(p2), buttonLabel(p2), nowCardLabel(p2)], ['0 de 3 passos', '30 min no total', 'Começar meu plano', 'AGORA · PASSO 1 DE 3'])

// ── um feito e um por vir (P1) ─────────────────────────────────────────
const p1 = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: { prayer: true, prayerAt: at(6, 42) }, todayIdx: TUE })
check('P1: leitura é o agora', [p1.kind, p1.now.key, p1.doneCount], ['during', 'reading', 1])
check('P1: "1 de 3 passos" · "faltam 20 min" · "Começar a leitura"', [stepsCountText(1, 3), barRightText(p1), buttonLabel(p1), nowCardLabel(p1)], ['1 de 3 passos', 'faltam 20 min', 'Começar a leitura', 'AGORA · PASSO 2 DE 3'])
check('P1: linha da oração feita', doneLine(p1.steps[0]), 'feita às 6:42')
check('aria do cartão preto', nowCardAria(p1), 'Agora, passo 2 de 3, Leitura, 15 minutos')

// ── passo aberto e interrompido ────────────────────────────────────────
const p1i = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: { prayer: true, prayerAt: at(6, 42), readingProgress: { startedAt: at(7, 0), elapsedSeconds: 372 } }, todayIdx: TUE })
check('interrompido: continua sendo o agora, botão "Continuar a leitura"', [p1i.now.key, p1i.now.interrupted, buttonLabel(p1i)], ['reading', true, 'Continuar a leitura'])
check('interrompido: o topo do cartão mostra o que falta (15 − 6 = 9)', nowCardMinutes(p1i.now), 9)
check('interrompido sem relógio: minutos do passo', nowCardMinutes({ ...p1i.now, elapsedSeconds: 0 }), 15)
check('interrompido com relógio além do tempo: nunca abaixo de 1', nowCardMinutes({ ...p1i.now, elapsedSeconds: 3600 }), 1)
const p2i = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: { prayerProgress: { startedAt: at(6, 0), elapsedSeconds: 0 } }, todayIdx: TUE })
check('interrompido no primeiro passo: "Continuar a oração", não "Começar meu plano"', buttonLabel(p2i), 'Continuar a oração')
check('segundos vindos de fora (session_seconds) também contam', computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: { readingProgress: { startedAt: at(7, 0) } }, todayIdx: TUE, extraElapsed: { reading: 120 } }).steps[1].elapsedSeconds, 120)
check('estudo: "Continuar o estudo"', buttonLabel(computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: { prayer: true, studyProgress: { startedAt: at(7, 0) } }, todayIdx: MON })), 'Continuar o estudo')

// ── tudo feito (P3) ────────────────────────────────────────────────────
const p3 = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: { prayer: true, prayerAt: at(6, 42), reading: true, readingAt: at(7, 1), reflection: true, reflectionAt: at(7, 8) }, todayIdx: TUE })
check('P3: tudo feito, sem agora, sem botão', [p3.kind, p3.now, buttonLabel(p3), barRightText(p3)], ['done', null, null, '30 min com Deus hoje'])
check('P3: linha da leitura com trecho', doneLine(p3.steps[1], 'Gênesis 41'), 'Gênesis 41 · feita às 7:01')
check('P3: título por extenso', [doneTitle(3), doneTitle(1), doneTitle(4)], ['Você fez os três passos.', 'Você fez o passo de hoje.', 'Você fez os quatro passos.'])

check('P3: frase da semana, plural e singular', [weekCountSentence(1, 2, 6), weekCountSentence(0, 1, 1)], ['Terça já conta para a sua semana: 2 de 6 dias.', 'Segunda já conta para a sua semana: 1 de 1 dia.'])

// ── dia de descanso (P4) e todos desligados ───────────────────────────
check('P4: domingo sem nada', computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: {}, todayIdx: SUN }).kind, 'rest')
check('todos os passos desligados = descanso', computeMeuPlano({ routineModules: [], stepDays, minutes, dayEntry: {}, todayIdx: TUE }).kind, 'rest')
check('passo desligado não entra nem no total', computeMeuPlano({ routineModules: ['reading', 'reflection'], stepDays, minutes, dayEntry: {}, todayIdx: TUE }).totalMinutes, 20)

// ── dia de estudo (P5) e leitura + estudo no mesmo dia ────────────────
const p5 = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: { prayer: true, prayerAt: at(6, 40) }, todayIdx: MON })
check('P5: estudo no lugar da leitura', [p5.steps.map(s => s.key), isStudyOnlyDay(p5), buttonLabel(p5), barRightText(p5)], [['prayer', 'study', 'reflection'], true, 'Começar o estudo', 'faltam 15 min'])
const both = { ...stepDays, reading: [true, true, false, true, false, true, false] }
const p4s = computeMeuPlano({ routineModules: ALL, stepDays: both, minutes, dayEntry: {}, todayIdx: MON })
check('leitura + estudo no mesmo dia: quatro passos, leitura antes do estudo, sem pausa', [p4s.steps.map(s => s.key), isStudyOnlyDay(p4s), nowCardLabel(p4s)], [['prayer', 'reading', 'study', 'reflection'], false, 'AGORA · PASSO 1 DE 4'])

// P5: data de volta da leitura (estudo seg/qua/sex; hoje = quarta 3/9/2026, estudo de hoje pendente; faltam 6 dias → 10/9? não: qua 3, sex 5, seg 8, qua 10, sex 12, seg 15)
const wed = new Date(2026, 8, 2) // quarta
check('volta da leitura: 6 dias restantes a partir de hoje (pendente)', dateKey(studyReturnDate(wed, stepDays.study, 6, false)), '2026-09-14')
check('volta da leitura: estudo de hoje já feito não conta hoje', dateKey(studyReturnDate(wed, stepDays.study, 1, true)), '2026-09-04')
check('volta da leitura: último dia é hoje', dateKey(studyReturnDate(wed, stepDays.study, 1, false)), '2026-09-02')
check('volta da leitura: sem dias de estudo → null', studyReturnDate(wed, [false, false, false, false, false, false, false], 3, false), null)

// ── um passo só ────────────────────────────────────────────────────────
const one = computeMeuPlano({ routineModules: ['prayer'], stepDays, minutes, dayEntry: {}, todayIdx: TUE })
check('um passo só: "passo 1 de 1", "0 de 1 passo"', [nowCardLabel(one), stepsCountText(one.doneCount, one.total), one.totalMinutes], ['AGORA · PASSO 1 DE 1', '0 de 1 passo', 10])
check('"1 de 1 passo" feito', stepsCountText(1, 1), '1 de 1 passo')

// ── virada de dia ──────────────────────────────────────────────────────
const routine = { '2026-09-01': { prayer: true, reading: true, reflection: true }, '2026-09-02': {} }
const tueState = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: routine[dateKey(new Date(2026, 8, 1))], todayIdx: 1 })
const wedState = computeMeuPlano({ routineModules: ALL, stepDays, minutes, dayEntry: routine[dateKey(new Date(2026, 8, 2))], todayIdx: 2 })
check('virada de dia: terça completa, quarta recomeça com estudo', [tueState.kind, wedState.kind, wedState.steps.map(s => s.key)], ['done', 'before', ['prayer', 'study', 'reflection']])

// ── descrições, Amanhã, frases ─────────────────────────────────────────
const ctx = { prayerMethod: 'acts', reflectionMethod: 'questions', readingPassage: 'Gênesis 41', study: { title: 'Ansiedade', dayN: 2, dayTotal: 7, reference: 'Filipenses 4:4-9' }, studyToday: false }
check('descrições por vir', [stepDescription('prayer', 'upcoming', ctx), stepDescription('reading', 'upcoming', ctx), stepDescription('study', 'upcoming', ctx), stepDescription('reflection', 'upcoming', ctx)], ['ACTS · quatro etapas guiadas', 'Gênesis 41 — onde você parou', 'Ansiedade · dia 2 de 7', 'três perguntas sobre o texto'])
check('descrições do agora', [stepDescription('study', 'now', ctx), stepDescription('reflection', 'now', ctx), stepDescription('reflection', 'now', { ...ctx, reflectionMethod: 'free' }), stepDescription('reflection', 'now', { ...ctx, studyToday: true }), stepDescription('prayer', 'now', { ...ctx, prayerMethod: 'free' })], ['Ansiedade · dia 2 de 7 · Filipenses 4:4-9', 'Três perguntas sobre o texto', 'folha em branco', 'a pergunta do estudo', 'livre'])
check('frase dos passos', [stepsSentence(['prayer', 'study', 'reflection']), stepsSentence(['prayer', 'reading']), stepsSentence(['prayer']), stepsSentence([])], ['Oração, estudo e reflexão', 'Oração e leitura', 'Oração', ''])
check('Amanhã (terça → quarta, dia de estudo)', tomorrowCard({ routineModules: ALL, stepDays, minutes, todayIdx: TUE }), { label: 'AMANHÃ · QUARTA', text: 'Oração, estudo e reflexão · 25 min', weekdayIdx: 2 })
check('Amanhã é descanso → "PRÓXIMO DIA"', tomorrowCard({ routineModules: ALL, stepDays: { ...stepDays, prayer: stepDays.reading, reflection: stepDays.reading, study: [false, false, false, false, false, false, false] }, minutes, todayIdx: TUE }).label, 'PRÓXIMO DIA · QUINTA')
check('sábado → "AMANHÃ · DOMINGO" quando domingo tem algo; senão "PRÓXIMO DIA · SEGUNDA"', [tomorrowCard({ routineModules: ALL, stepDays: { ...stepDays, prayer: [true, true, true, true, true, true, true] }, minutes, todayIdx: 5 }).label, tomorrowCard({ routineModules: ALL, stepDays, minutes, todayIdx: 5 }).label], ['AMANHÃ · DOMINGO', 'PRÓXIMO DIA · SEGUNDA'])
check('nenhum dia com nada → null', tomorrowCard({ routineModules: [], stepDays, minutes, todayIdx: TUE }), null)
check('linha Seu plano', [seuPlanoLine(3, 'março de 2029'), seuPlanoLine(1, null)], ['3 leituras por semana · termina em março de 2029', '1 leitura por semana'])
check('linha Meus estudos', [studiesLine(1, 2), studiesLine(2, 1), studiesLine(0, 0)], ['1 salvo · 2 concluídos', '2 salvos · 1 concluído', '0 salvos · 0 concluídos'])
check('hora sem zero à esquerda', [formatHour(at(6, 42)), formatHour(at(19, 5))], ['6:42', '19:05'])
check('minutos com fallback do plano', resolveMinutes({ prayer: null, reading: 20, study: null, reflection: null }, { prayerMinutes: 10, readingMinutes: 15, reflectionMinutes: 8 }), { prayer: 10, reading: 20, study: 15, reflection: 8 })

if (failures > 0) { console.error(`\n${failures} verificação(ões) falharam.`); process.exit(1) }
console.log('\nTodos os testes do Meu Plano (parte pura) passaram.')
