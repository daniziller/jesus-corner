// Testa a parte pura do Hoje (handoff-hoje-50): src/hoje/hojeMath.js e as
// extensões que o Hoje pediu às funções da gamificação (recentSeals,
// footerBook). Roda com: node scripts/test-hoje.mjs (ou `npm test`).
import { GAMIFICATION_BOOKS } from '../src/data/gamificationBlocks.js'
import { computeBibleProgress, footerBook } from '../src/gamification/bibleProgressMath.js'
import { recentSeals } from '../src/gamification/sealDetails.js'
import { computeMeuPlano, stepShortDetail, tomorrowCard } from '../src/meuPlano/meuPlanoMath.js'
import {
  chaptersLine, bibleBookLine, bibleFinishedIso, bibleCardAria, weeksAria, daysAria, sealsAria, dayDotKind,
  buildPlanCard, planCardKind, nextAchievement,
} from '../src/hoje/hojeMath.js'
import { FAMILIES } from '../src/data/achievements.js'
import { pickClosest } from '../src/gamification/achievementsMath.js'
import { familyState } from '../src/gamification/familiesMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}

function setOf(spec) {
  const set = new Set()
  for (const [nome, n] of Object.entries(spec)) for (let c = 1; c <= n; c++) set.add(`${nome}:${c}`) // chave de completed_keys
  return set
}

// ── Cartão da Bíblia ────────────────────────────────────────────────────
const exemplo = computeBibleProgress(setOf({ 'Gênesis': 41, Salmos: 5, Jonas: 4 }))
check('capítulos: "50 de 1.189 capítulos"', chaptersLine(exemplo), '50 de 1.189 capítulos')
check('livro atual: "Gênesis 41 de 50 · faltam 9 para o selo"', bibleBookLine(exemplo, 'Gênesis', null), 'Gênesis 41 de 50 · faltam 9 para o selo')
check('rótulo do cartão', bibleCardAria(exemplo), 'Sua Bíblia, 4,2% lida, 50 de 1.189 capítulos')

const falta1 = computeBibleProgress(setOf({ 'Gênesis': 49 }))
check('singular: "falta 1 para o selo"', bibleBookLine(falta1, 'Gênesis', null), 'Gênesis 49 de 50 · falta 1 para o selo')

const nova = computeBibleProgress(new Set())
check('conta nova: "Comece por onde quiser"', bibleBookLine(nova, 'Gênesis', null), 'Comece por onde quiser')
check('conta nova: "0 de 1.189 capítulos"', chaptersLine(nova), '0 de 1.189 capítulos')

// livro atual já completo → o selo mais perto (Salmos 5/150 vs Rute 3/4 → Rute)
const semAtual = computeBibleProgress(setOf({ Jonas: 4, Salmos: 5, Rute: 3 }))
check('livro atual completo cai no selo mais perto', [footerBook(semAtual, 'Jonas'), bibleBookLine(semAtual, 'Jonas', null)], ['Rute', 'Rute 3 de 4 · falta 1 para o selo'])
// nada em andamento, livro atual com zero lido → o próprio livro atual
const soCompletos = computeBibleProgress(setOf({ Jonas: 4 }))
check('nada em andamento: mostra o livro atual do plano', bibleBookLine(soCompletos, 'Êxodo', null), 'Êxodo 0 de 40 · faltam 40 para o selo')

const tudo = {}
for (const b of GAMIFICATION_BOOKS) tudo[b.nome] = b.capitulos
const inteira = computeBibleProgress(setOf(tudo))
check('Bíblia inteira: "Terminada em setembro de 2026"', bibleBookLine(inteira, null, '2026-09-14T12:00:00Z'), 'Terminada em setembro de 2026')
check('Bíblia inteira sem a data ainda: vazio, nada inventado', bibleBookLine(inteira, null, null), '')
check('data de término = capítulo lido mais recente', bibleFinishedIso([{ created_at: '2026-01-02T10:00:00Z' }, { created_at: '2026-09-14T12:00:00Z' }, { created_at: null }, null]), '2026-09-14T12:00:00Z')
check('sem linhas: sem data', bibleFinishedIso([]), null)

// ── Três quadrados ──────────────────────────────────────────────────────
check('semanas: plural', weeksAria(18), '18 semanas na meta')
check('semanas: singular', weeksAria(1), '1 semana na meta')
check('semanas: zero', weeksAria(0), '0 semanas na meta')
check('dias: "1 de 4 dias na meta esta semana"', daysAria(1, 4), '1 de 4 dias na meta esta semana')
check('dias: meta de um dia', daysAria(0, 1), '0 de 1 dia na meta esta semana')
check('selos: singular', sealsAria(1, 66), '1 selo de 66 livros')
check('selos: plural e zero', [sealsAria(3, 66), sealsAria(0, 66)], ['3 selos de 66 livros', '0 selos de 66 livros'])

check('pontos: quatro estados a partir dos cinco do contador', ['leu', 'hoje', 'plano', 'fora', 'descanso'].map(dayDotKind), ['done', 'today', 'upcoming', 'off', 'off'])

// ── Selos mais recentes ─────────────────────────────────────────────────
const seals = {
  Jonas: { completedAt: '2026-03-01T10:00:00Z' },
  Rute: { completedAt: '2026-06-01T10:00:00Z' },
  Obadias: { completedAt: '2026-01-01T10:00:00Z' },
  Judas: { completedAt: '2026-08-01T10:00:00Z' },
}
check('três mais recentes, o mais novo primeiro', recentSeals(['Rute', 'Obadias', 'Jonas', 'Judas'], seals), ['Judas', 'Rute', 'Jonas'])
check('um selo só', recentSeals(['Jonas'], seals), ['Jonas'])
check('nenhum selo', recentSeals([], seals), [])
check('livro completo ainda sem linha gravada entra como o mais novo', recentSeals(['Jonas', 'Filemom'], seals), ['Filemom', 'Jonas'])
check('linha gravada de livro que deixou de estar completo não aparece', recentSeals(['Jonas'], seals), ['Jonas'])
check('empate de data: ordem de entrada', recentSeals(['Rute', 'Jonas'], { Rute: { completedAt: 'x' }, Jonas: { completedAt: 'x' } }), ['Rute', 'Jonas'])

// ── Cartão do plano (HANDOFF §4) ────────────────────────────────────────
const ALL = ['prayer', 'reading', 'study', 'reflection']
const TRES = ['prayer', 'reading', 'reflection']
const todos = [true, true, true, true, true, true, true]
const nenhum = [false, false, false, false, false, false, false]
const stepDays = { prayer: todos, reading: todos, study: nenhum, reflection: todos }
const minutes = { prayer: 10, reading: 15, study: 10, reflection: 8 }
const TUE = 1
const at = (h, m) => new Date(2026, 8, 2, h, m).toISOString()
const ctx = { prayerMethod: 'acts', reflectionMethod: 'questions', readingPassage: 'Gênesis 42', readingDonePassage: 'Gênesis 42', study: null }
function card(dayEntry, opts = {}) {
  const sd = opts.stepDays ?? stepDays
  const mods = opts.routineModules ?? TRES
  const state = computeMeuPlano({ routineModules: mods, stepDays: sd, minutes: opts.minutes ?? minutes, dayEntry, todayIdx: TUE })
  const next = tomorrowCard({ routineModules: mods, stepDays: sd, minutes, todayIdx: TUE })
  return buildPlanCard({ loadError: false, stepDays: sd, routineModules: mods, state, ctx: opts.ctx ?? ctx, nextWeekdayIdx: next?.weekdayIdx ?? null })
}

const nada = card({})
check('nada feito: estado, título e direita', [nada.kind, nada.title, nada.right], ['before', 'Gênesis 42', ['3 passos', '33 min']])
check('nada feito: botão laranja "Começar meu plano"', nada.button, { label: 'Começar meu plano', primary: true, arrow: true, action: 'start' })
check('nada feito: três linhas abertas, minutos à direita', nada.steps.map(s => [s.name, s.detail, s.done, s.right]), [['Oração', 'ACTS', false, '10 min'], ['Leitura', 'Gênesis 42', false, '15 min'], ['Reflexão', 'com perguntas', false, '8 min']])

const meio = card({ prayer: true, prayerAt: at(6, 42) })
check('no meio (H1): "1 de 3 passos" / "faltam 23 min"', [meio.kind, meio.right], ['during', ['1 de 3 passos', 'faltam 23 min']])
check('no meio: "Continuar meu plano"', [meio.button.label, meio.button.primary, meio.button.action], ['Continuar meu plano', true, 'start'])
check('no meio: oração "feita", as outras a fazer', meio.steps.map(s => [s.done, s.right]), [[true, 'feita'], [false, '15 min'], [false, '8 min']])
check('cada passo anuncia nome, minutos e feito/a fazer', meio.steps.map(s => s.aria), ['Oração, 10 minutos, feita', 'Leitura, 15 minutos, a fazer', 'Reflexão, 8 minutos, a fazer'])

const interrompido = card({ prayer: true, prayerAt: at(6, 42), readingProgress: { startedAt: at(7, 0), elapsedSeconds: 372 } })
check('passo interrompido: igual ao meio, o passo continua aberto', [interrompido.kind, interrompido.right, interrompido.steps[1].done, interrompido.button.label], ['during', ['1 de 3 passos', 'faltam 23 min'], false, 'Continuar meu plano'])
const interrompidoNoPrimeiro = card({ prayerProgress: { startedAt: at(6, 40), elapsedSeconds: 120 } })
check('interrompido no primeiro passo: "0 de 3 passos" e "Continuar meu plano"', [interrompidoNoPrimeiro.kind, interrompidoNoPrimeiro.right[0], interrompidoNoPrimeiro.button.label], ['during', '0 de 3 passos', 'Continuar meu plano'])

const tudo3 = card({ prayer: true, reading: true, reflection: true })
check('tudo feito: "Plano completo" / soma, todos feitos', [tudo3.kind, tudo3.right, tudo3.steps.every(s => s.done)], ['done', ['Plano completo', '33 min'], true])
check('tudo feito: botão secundário "Ver meu plano", sem seta', tudo3.button, { label: 'Ver meu plano', primary: false, arrow: false, action: 'plan' })

const semHoje = todos.map((_, i) => i !== TUE)
const descanso = card({}, { stepDays: { prayer: semHoje, reading: semHoje, study: nenhum, reflection: semHoje } })
check('descanso: título, sem direita, sem lista, "Volta quarta."', [descanso.kind, descanso.title, descanso.right, descanso.steps, descanso.line], ['rest', 'Hoje é descanso', null, [], 'Volta quarta.'])
check('descanso: botão secundário "Quero ler hoje mesmo assim"', [descanso.button.label, descanso.button.primary, descanso.button.action], ['Quero ler hoje mesmo assim', false, 'read'])
const soSabado = [false, false, false, false, false, true, false]
check('descanso: o próximo dia com algo, não só amanhã', card({}, { stepDays: { prayer: soSabado, reading: soSabado, study: nenhum, reflection: soSabado } }).line, 'Volta sábado.')

const semPlano = card({}, { stepDays: { prayer: nenhum, reading: nenhum, study: nenhum, reflection: nenhum } })
check('sem plano: nenhum dia marcado → "Monte seu plano" e "Criar meu plano" laranja → Ajustar', [semPlano.kind, semPlano.title, semPlano.button.label, semPlano.button.primary, semPlano.button.action, semPlano.right, semPlano.steps], ['noPlan', 'Monte seu plano', 'Criar meu plano', true, 'adjust', null, []])
check('sem plano: dia marcado só em passo desligado também é sem plano', card({}, { routineModules: ['prayer'], stepDays: { prayer: nenhum, reading: todos, study: nenhum, reflection: nenhum } }).kind, 'noPlan')

const um = card({}, { routineModules: ['prayer'] })
check('um passo só: "1 passo" / "10 min", título = nome do passo', [um.kind, um.right, um.title], ['before', ['1 passo', '10 min'], 'Oração'])
check('um passo só, interrompido: "0 de 1 passo"', card({ prayerProgress: { startedAt: at(6, 40), elapsedSeconds: 60 } }, { routineModules: ['prayer'] }).right[0], '0 de 1 passo')
const umMin = card({ prayer: true, reading: true }, { minutes: { prayer: 10, reading: 15, study: 10, reflection: 1 } })
check('singular: "falta 1 min" e "1 minuto"', [umMin.right[1], umMin.steps[2].aria], ['falta 1 min', 'Reflexão, 1 minuto, a fazer'])

const estudo = { title: 'Ansiedade', dayN: 2, dayTotal: 7 }
const diaDeEstudo = card({}, { routineModules: ALL, stepDays: { prayer: todos, reading: nenhum, study: todos, reflection: todos }, ctx: { ...ctx, study: estudo } })
check('dia de estudo: título é o nome do estudo; detalhe "{nome}, dia {n}"; "feito" no masculino', [diaDeEstudo.title, diaDeEstudo.steps[1].detail, card({ prayer: true, study: true }, { routineModules: ALL, stepDays: { prayer: todos, reading: nenhum, study: todos, reflection: todos }, ctx: { ...ctx, study: estudo } }).steps[1].right], ['Ansiedade', 'Ansiedade, dia 2', 'feito'])
const quatro = card({}, { routineModules: ALL, stepDays: { prayer: todos, reading: todos, study: todos, reflection: todos }, ctx: { ...ctx, study: estudo } })
check('quatro passos (leitura e estudo no mesmo dia): título é a leitura', [quatro.title, quatro.steps.map(s => s.key), quatro.right], ['Gênesis 42', ALL, ['4 passos', '43 min']])
check('passo fora do dia não entra na lista', card({}, { routineModules: ALL }).steps.map(s => s.key), TRES)

const livre = { prayerMethod: 'free', reflectionMethod: 'free', readingPassage: '', readingDonePassage: '', study: null }
check('modos livres e leitura sem trecho: detalhes e título', [card({}, { ctx: livre }).steps.map(s => s.detail), card({}, { ctx: livre }).title], [['livre', '', 'livre'], 'Leitura'])
check('leitura feita: título e detalhe mostram o que foi lido', (() => { const c = card({ prayer: true, reading: true }, { ctx: { ...ctx, readingPassage: 'Gênesis 43', readingDonePassage: 'Gênesis 42' } }); return [c.title, c.steps[1].detail] })(), ['Gênesis 42', 'Gênesis 42'])
check('detalhe curto direto', [stepShortDetail('prayer', ctx), stepShortDetail('reading', ctx), stepShortDetail('study', ctx), stepShortDetail('reflection', ctx)], ['ACTS', 'Gênesis 42', '', 'com perguntas'])

check('carregando: dias do plano ainda não chegaram', buildPlanCard({ loadError: false, stepDays: null, routineModules: TRES, state: null, ctx, nextWeekdayIdx: null }), { kind: 'loading' })
const erro = buildPlanCard({ loadError: true, stepDays: null, routineModules: TRES, state: null, ctx, nextWeekdayIdx: null })
check('erro ao carregar: título, dica e "Tentar novamente" secundário', [erro.kind, erro.title, erro.line, erro.button.label, erro.button.primary, erro.button.action, erro.steps], ['error', 'Não foi possível carregar seu plano', 'Verifique sua conexão e tente de novo.', 'Tentar novamente', false, 'retry', []])
check('erro tem precedência sobre o resto', planCardKind({ loadError: true, stepDays, routineModules: TRES, state: {} }), 'error')

// ── Próxima conquista (HANDOFF §5) ──────────────────────────────────────
const fam = id => FAMILIES.find(f => f.id === id)
const estados = valores => FAMILIES.map(f => familyState(f, valores[f.id] ?? 0, () => null))
// 9 h de 10: a mais perto é "Dez horas", falta 1 h, barra entre 1 h e 10 h.
const h1 = nextAchievement(pickClosest(estados({ constancia: 18, leitura: 50, tempo: 9, oracao: 3, livros: 1 })))
check('H1: tempo 9/10 é a mais perto — nome, "falta 1 h", degrau 2', [h1.familyId, h1.nome, h1.remaining, h1.degrau], ['tempo', fam('tempo').degraus[1].nome, 'falta 1 h', 2])
check('H1: barra = progresso entre o degrau atual e o próximo (8 de 9)', h1.progress, 8 / 9)
check('H1: rótulo pra leitor de tela', h1.aria, `Próxima conquista: ${fam('tempo').degraus[1].nome}, falta 1 h`)
check('horas no plural: "faltam 3 h"', nextAchievement(pickClosest(estados({ tempo: 7 }))).remaining, 'faltam 3 h')
check('semanas: unidade curta, plural e singular', [nextAchievement(pickClosest(estados({ constancia: 18 }))).remaining, nextAchievement(pickClosest(estados({ constancia: 3 }))).remaining], ['faltam 8 semanas', 'falta 1 semana'])
check('capítulos: "falta 1 capítulo" e milhar com ponto', [nextAchievement(pickClosest(estados({ leitura: 49 }))).remaining, nextAchievement({ familyId: 'leitura', degrau: 6, nome: 'A Bíblia inteira', remaining: 1089, progress: 0 }).remaining], ['falta 1 capítulo', 'faltam 1.089 capítulos'])
check('pedidos e livros', [nextAchievement(pickClosest(estados({ oracao: 9 }))).remaining, nextAchievement(pickClosest(estados({ livros: 4 }))).remaining], ['falta 1 pedido', 'falta 1 livro'])
const novaConta = nextAchievement(pickClosest(estados({})))
check('conta nova: a primeira família, no menor limiar, barra vazia', [novaConta.familyId, novaConta.degrau, novaConta.remaining, novaConta.progress], ['constancia', 1, 'falta 1 semana', 0])
check('tudo conquistado (38 de 38): sem cartão', nextAchievement(pickClosest(estados({ constancia: 104, leitura: 1189, tempo: 250, oracao: 1000, livros: 66 }))), null)

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes do Hoje (parte pura) passaram.')
