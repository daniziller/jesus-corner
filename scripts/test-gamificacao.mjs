// Testa a parte pura da gamificação (handoff-gamificacao-43-46, etapa 1):
// src/data/gamificationBlocks.js, src/data/achievements.js e
// src/gamification/*.js. Roda com: node scripts/test-gamificacao.mjs
// (ou `npm test`, que roda todos). Casos exigidos pelo PROMPT-CODE: conta
// nova, livro completo, bloco completo, releitura, capítulo desmarcado,
// troca de meta semanal, virada de semana e de fuso, limiares exatos
// (9/10, 10/10, 11/10), mais migração idempotente e formatação.
import { GAMIFICATION_BLOCKS, GAMIFICATION_BOOKS, BIBLE_CHAPTERS, bookInfo } from '../src/data/gamificationBlocks.js'
import { FAMILIES, ALL_ACHIEVEMENT_IDS, TOTAL_ACHIEVEMENTS, parseAchievementId, DEGRAU_MATERIAL } from '../src/data/achievements.js'
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from '../src/data/bibleBlocks.js'
import { computeBookChapterCounts } from '../src/utils/progress.js'
import { computeBibleProgress, closestSeal, nextUnreadChapter, nextBlockToLight } from '../src/gamification/bibleProgressMath.js'
import { goalForWeek, appendGoalHistory, computeMetWeeks, computeWeeksInGoal, computeWeekCapsules, computeWeekDayStates, computeCurrentWeekGoal } from '../src/gamification/weeksMath.js'
import { computeFamilyStates, thresholdDate, tempoStats, oracaoStats, dayKeyToIso, familyRatePerMonth, monthsToNext, bookPosition } from '../src/gamification/familiesMath.js'
import { computeEarnedAchievements, mergeAchievementStore, mergeBookSeals, markSeen, unseenIds, countEarned, pickClosest, pickCelebration, startReread, recordRereadChapter } from '../src/gamification/achievementsMath.js'
import { readingRatePerDay, projectPercentInOneYear, estimateBibleCompletion, projectBookReads, firstActivityIso } from '../src/gamification/projectionMath.js'
import { computeSlices, fillPath, markerAngle, USABLE_DEGREES, START_DEGREES, GAP_BLOCK, sectorPath } from '../src/gamification/wheelGeometry.js'
import { formatInt, formatPct, faltamPhrase, deOf, monthYearShort, dayMonthLong, formatDuration, monthYearLong } from '../src/gamification/format.js'
import { dateKey } from '../src/utils/dateKey.js'
import { familyCelebrationPhrase, blockCelebrationPhrase, closestPhrase, nextBlockFooter, thresholdLabel } from '../src/gamification/celebrationText.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    console.error(`FALHOU: ${label} — esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`)
    failures++
  } else {
    console.log(`OK: ${label}`)
  }
}

// ── Dados ──────────────────────────────────────────────────────────────
const counts = computeBookChapterCounts(SESSIONS_BY_PLAN.standard)
check('8 blocos, 66 livros, 1.189 capítulos', [GAMIFICATION_BLOCKS.length, GAMIFICATION_BOOKS.length, GAMIFICATION_BOOKS.reduce((s, b) => s + b.capitulos, 0)], [8, 66, BIBLE_CHAPTERS])
check('ordem canônica = BIBLE_BLOCKS (mesma chave de completed_keys)', GAMIFICATION_BOOKS.map(b => b.nome), BIBLE_BLOCKS.flatMap(b => b.books))
check('capítulos por livro = computeBookChapterCounts', GAMIFICATION_BOOKS.every(b => counts[b.nome] === b.capitulos), true)
check('capitulos de cada bloco = soma dos livros', GAMIFICATION_BLOCKS.every(b => b.livros.reduce((s, l) => s + l.capitulos, 0) === b.capitulos), true)
check('posições 1..66 sem buraco', GAMIFICATION_BOOKS.map(b => b.posicao), Array.from({ length: 66 }, (_, i) => i + 1))
check('siglas únicas', new Set(GAMIFICATION_BOOKS.map(b => b.sigla)).size, 66)
check('38 conquistas, ids únicos', [ALL_ACHIEVEMENT_IDS.length, new Set(ALL_ACHIEVEMENT_IDS).size, TOTAL_ACHIEVEMENTS], [38, 38, 38])
check('5 famílias × 6 degraus crescentes', FAMILIES.every(f => f.degraus.length === 6 && f.degraus.every((d, i) => i === 0 || d.limiar > f.degraus[i - 1].limiar)), true)
check('parseAchievementId', [parseAchievementId('tempo:2'), parseAchievementId('bloco:lei')], [{ familyId: 'tempo', degrau: 2 }, { blocoId: 'lei' }])
check('material dos 6 degraus', Object.keys(DEGRAU_MATERIAL).length, 6)
check('bookInfo(Jonas) bloco e posição', [bookInfo('Jonas').blocoId, bookInfo('Jonas').posicao, bookPosition('Jonas')], ['profetas-menores', 32, 32])

// ── Progresso: conta nova ──────────────────────────────────────────────
const empty = computeBibleProgress(new Set())
check('conta nova: 0 de 1.189, 0%', [empty.capitulosLidos, empty.percent, empty.livrosCompletos, empty.blocosComecados, empty.bibliaInteira], [0, 0, 0, 0, false])
check('conta nova: nenhum selo em andamento', closestSeal(empty), null)
check('conta nova: próximo bloco é a Lei', nextBlockToLight(empty).id, 'lei')

// ── Livro completo, bloco completo, capítulo desmarcado ───────────────
const keys = new Set()
const addBook = (nome) => { for (let c = 1; c <= bookInfo(nome).capitulos; c++) keys.add(`${nome}:${c}`) }
addBook('Jonas')
for (let c = 1; c <= 41; c++) keys.add(`Gênesis:${c}`)
for (let c = 1; c <= 5; c++) keys.add(`Salmos:${c}`)
keys.add('Gênesis:reflection') // chave de reflexão não é capítulo
const p = computeBibleProgress(keys)
check('exemplo do PNG: 50 de 1.189 = 4,2%', [p.capitulosLidos, p.percent], [50, 4.2])
check('Jonas completo sem chave de reflexão', [p.porLivro['Jonas'].completo, p.livrosCompletos, p.completos], [true, 1, ['Jonas']])
check('blocos começados 3 de 8', [p.blocosComecados, p.blocosCompletos], [3, 0])
check('Lei 41/187, Profetas menores 1 de 12 livros', [p.porBloco[0].lidos, p.porBloco[4].livrosCompletos], [41, 1])
check('próximo selo = Gênesis, faltam 9', [closestSeal(p).nome, closestSeal(p).faltam], ['Gênesis', 9])
check('nextUnreadChapter', [nextUnreadChapter('Gênesis', 50, keys), nextUnreadChapter('Jonas', 4, keys)], [42, null])
const blockKeys = new Set(keys)
for (const nome of ['Oseias', 'Joel', 'Amós', 'Obadias', 'Miquéias', 'Naum', 'Habacuque', 'Sofonias', 'Ageu', 'Zacarias', 'Malaquias']) { for (let c = 1; c <= bookInfo(nome).capitulos; c++) blockKeys.add(`${nome}:${c}`) }
const pb = computeBibleProgress(blockKeys)
check('bloco completo: Profetas menores', [pb.porBloco[4].completo, pb.blocosCompletos, pb.livrosCompletos], [true, 1, 12])
const unmarked = new Set(blockKeys); unmarked.delete('Jonas:3')
const pu = computeBibleProgress(unmarked)
check('capítulo desmarcado: roda e contadores recalculam', [pu.porLivro['Jonas'].completo, pu.porBloco[4].completo, pu.capitulosLidos], [false, false, pb.capitulosLidos - 1])
const all = new Set(GAMIFICATION_BOOKS.flatMap(b => Array.from({ length: b.capitulos }, (_, i) => `${b.nome}:${i + 1}`)))
const pa = computeBibleProgress(all)
check('Bíblia inteira: 100%, 66 livros, 8 blocos', [pa.percent, pa.livrosCompletos, pa.blocosCompletos, pa.bibliaInteira, nextBlockToLight(pa)], [100, 66, 8, true, null])

// ── Semanas ────────────────────────────────────────────────────────────
// Semana de referência: segunda 2026-11-02 … domingo 2026-11-08; "hoje" =
// terça 2026-11-10 (semana seguinte). Chaves locais, como dailyRoutine.
const today = new Date(2026, 10, 10, 15, 0) // terça
const R = { reading: true }
const routine = {
  '2026-10-26': R, '2026-10-27': R, '2026-10-29': R, // semana 1: 3 dias
  '2026-11-02': R, '2026-11-03': R, '2026-11-04': R, '2026-11-05': R, // semana 2: 4 dias
  '2026-11-08': R, // domingo 23:59 ainda é semana 2 → 5 dias
  '2026-11-09': R, // semana atual: segunda
  '2026-11-11': R, // amanhã (futuro) — ignorado
}
check('conta nova: 0 semanas na meta', computeWeeksInGoal({}, [], 4, today), 0)
check('meta 4 fixa: só a semana 2 bate (3 dias < 4)', computeMetWeeks(routine, [], 4, today).map(w => [w.mondayKey, w.daysMet, w.metOnKey]), [['2026-11-02', 5, '2026-11-05']])
check('virada de semana: domingo entra na semana que termina, não na seguinte', computeMetWeeks(routine, [], 5, today).map(w => w.mondayKey), ['2026-11-02'])
check('futuro não conta: semana atual 1 de 4', computeCurrentWeekGoal(routine, [], 4, today), { feitos: 1, meta: 4, batida: false })
// Troca de meta: semana 1 tinha meta 3 (bate), a partir da semana 2 a meta é 5.
const history = [{ desde: '2026-10-26', dias: 3 }, { desde: '2026-11-02', dias: 5 }]
check('goalForWeek usa a meta vigente na semana', [goalForWeek('2026-10-26', history, 7), goalForWeek('2026-11-02', history, 7), goalForWeek('2026-10-19', history, 7), goalForWeek('2026-10-19', [], 7)], [3, 5, 3, 7])
check('troca de meta não reavalia semanas passadas', computeMetWeeks(routine, history, 5, today).map(w => [w.mondayKey, w.goal]), [['2026-10-26', 3], ['2026-11-02', 5]])
check('appendGoalHistory substitui entrada da mesma segunda', appendGoalHistory([{ desde: '2026-11-09', dias: 4 }], 6, today), [{ desde: '2026-11-09', dias: 6 }])
const caps = computeWeekCapsules(routine, history, 5, '2026-10-27', today, 12)
check('12 cápsulas, atual por último com fill 1/5', [caps.length, caps[11].isCurrent, caps[11].fill, caps[11].met], [12, true, 0.2, false])
check('cápsulas: semanas 1 e 2 batidas, anteriores ao cadastro transparentes', [caps[9].met, caps[10].met, caps[8].beforeStart, caps[9].beforeStart], [true, true, true, false])
// Meta já batida esta semana: 5 de 4, cápsula cheia.
const fullWeek = { '2026-11-09': R, '2026-11-10': R, '2026-11-06': R }
check('passa da meta: 2 de 1', computeCurrentWeekGoal(fullWeek, [], 1, today), { feitos: 2, meta: 1, batida: true })
check('cápsula atual cheia ao bater a meta', computeWeekCapsules({ '2026-11-09': R }, [], 1, null, today, 12)[11].fill, 1)
const capsNova = computeWeekCapsules({}, [], 4, null, today, 12)
check('conta nova: só a cápsula atual visível', [capsNova.filter(c => c.beforeStart).length, capsNova[11].beforeStart, capsNova[11].isCurrent, capsNova[11].fill], [11, false, true, 0])
// Sete dias (PNG G3): meta Seg/Ter/Qui/Sáb; hoje terça; segunda lida.
const weeklyDays = [true, true, false, true, false, true, false]
check('sete dias da semana (G3)', computeWeekDayStates({ '2026-11-09': R }, weeklyDays, today).map(d => d.state), ['leu', 'hoje', 'fora', 'plano', 'fora', 'plano', 'descanso'])
check('dia do plano que passou sem leitura = fora (sem alerta)', computeWeekDayStates({}, weeklyDays, new Date(2026, 10, 12)).map(d => d.state)[0], 'fora')
check('hoje é sempre laranja, mesmo lido', computeWeekDayStates({ '2026-11-10': R }, weeklyDays, today)[1].state, 'hoje')

// ── Famílias e limiares exatos ─────────────────────────────────────────
const iso = (d) => new Date(2026, 9, d, 10).toISOString()
const chapterRowsFor = (set, startDay = 1) => [...set].filter(k => !k.endsWith(':reflection')).map((k, i) => {
  const [livro, cap] = k.split(':')
  return { livro, capitulo: Number(cap), origem: 'sessao', created_at: iso(startDay + i) }
})
function statsFor(set, extra = {}) {
  const progress = computeBibleProgress(set)
  return { progress, completedSet: set, chapterRows: chapterRowsFor(set), sessionRows: [], intentionRows: [], myRequestIds: new Set(), dailyRoutine: {}, goalHistory: [], weeklyGoalDays: 4, today, ...extra }
}
const nine = new Set(Array.from({ length: 9 }, (_, i) => `Gênesis:${i + 1}`))
const ten = new Set([...nine, 'Gênesis:10'])
const eleven = new Set([...ten, 'Gênesis:11'])
const famOf = (st, id) => computeFamilyStates(st).families.find(f => f.id === id)
check('Leitura 9/10: degrau 0, falta 1 capítulo', [famOf(statsFor(nine), 'leitura').degrau, famOf(statsFor(nine), 'leitura').remaining], [0, 1])
check('Leitura 10/10: degrau 1, com a data do 10º capítulo', [famOf(statsFor(ten), 'leitura').degrau, famOf(statsFor(ten), 'leitura').earned[0].earnedAt], [1, iso(10)])
check('Leitura 11/10: degrau 1, próximo é 50 (faltam 39)', [famOf(statsFor(eleven), 'leitura').degrau, famOf(statsFor(eleven), 'leitura').next.limiar, famOf(statsFor(eleven), 'leitura').remaining], [1, 50, 39])
check('progresso entre degraus: 11 de 10→50 = 1/40', famOf(statsFor(eleven), 'leitura').progress, 1 / 40)
check('capítulos sem linha datada: data desconhecida (null)', famOf(statsFor(ten, { chapterRows: [] }), 'leitura').earned[0].earnedAt, null)
check('thresholdDate com 3 sem data: k=3 null, k=4 = 1ª datada', [thresholdDate(['a', 'b'], 3, 3), thresholdDate(['a', 'b'], 3, 4), thresholdDate(['a', 'b'], 3, 9)], [null, 'a', null])
check('chave de reflexão não conta como capítulo', famOf(statsFor(new Set(['Gênesis:reflection'])), 'leitura').value, 0)

const sessions = [
  { data: '2026-10-01', passo: 'prayer', segundos: 1800, created_at: iso(1) },
  { data: '2026-10-02', passo: 'reading', segundos: 1800, created_at: iso(2) },
  { data: '2026-10-03', passo: 'reflection', segundos: 600, created_at: iso(3) },
]
const tempo = tempoStats(sessions)
check('Tempo: 70 min = 1 hora inteira; a hora fechou na 2ª sessão', [tempo.value, tempo.dateForHours(1), tempo.dateForHours(10)], [1, iso(2), null])
check('Tempo 59 min = 0 horas (limiar exato)', tempoStats(sessions.slice(0, 1).concat([{ data: '2026-10-02', passo: 'reading', segundos: 1739 }])).value, 0)

const intentions = [
  { prayer_request_id: 'meu', prayed_date: '2026-10-01' },
  ...Array.from({ length: 10 }, (_, i) => ({ prayer_request_id: `outro-${i}`, prayed_date: `2026-10-${String(i + 2).padStart(2, '0')}` })),
]
const ora = oracaoStats(intentions, new Set(['meu']))
check('Oração: pedido próprio não conta; 10 de outros → degrau 1', [ora.value, famOf(statsFor(new Set(), { intentionRows: intentions, myRequestIds: new Set(['meu']) }), 'oracao').degrau], [10, 1])
check('Oração: data do 10º "Orei"', ora.datedSorted[9], dayKeyToIso('2026-10-11'))

const jonasRows = chapterRowsFor(new Set(['Jonas:1', 'Jonas:2', 'Jonas:3', 'Jonas:4']), 20)
const stJonas = statsFor(new Set(['Jonas:1', 'Jonas:2', 'Jonas:3', 'Jonas:4']), { chapterRows: jonasRows })
const fsJonas = computeFamilyStates(stJonas)
check('Livros: Jonas completo = degrau 1 na data do último capítulo', [fsJonas.families[4].degrau, fsJonas.families[4].earned[0].earnedAt, fsJonas.completionDates['Jonas']], [1, iso(23), iso(23)])
check('Livros: livro completo com capítulo sem data = data desconhecida', computeFamilyStates(statsFor(new Set(['Jonas:1', 'Jonas:2', 'Jonas:3', 'Jonas:4']), { chapterRows: jonasRows.slice(1) })).completionDates['Jonas'], null)
const fsBlock = computeFamilyStates(statsFor(blockKeys))
check('Bloco completo: Profetas menores ganho; Lei não', [fsBlock.blocks[4].completo, !!fsBlock.blocks[4].earnedAt, fsBlock.blocks[0].completo], [true, true, false])
const fsConst = computeFamilyStates(statsFor(new Set(), { dailyRoutine: routine, goalHistory: history, weeklyGoalDays: 5 }))
check('Constância: 2 semanas na meta → degrau 1, data = dia em que a 1ª semana bateu', [fsConst.families[0].value, fsConst.families[0].degrau, fsConst.families[0].earned[0].earnedAt], [2, 1, dayKeyToIso('2026-10-29')])

// ── Conquistas ganhas, migração idempotente, parabéns ─────────────────
const earned = computeEarnedAchievements(fsBlock)
check('bloco completo gera leitura:1/2, livros:1/2/3, bloco:profetas-menores', earned.map(e => e.id).sort(), ['bloco:profetas-menores', 'leitura:1', 'leitura:2', 'livros:1', 'livros:2', 'livros:3'])
const now = '2026-11-10T18:00:00.000Z'
const m1 = mergeAchievementStore({}, earned, { now, seen: true })
check('migração retroativa: tudo gravado como visto', [m1.newIds.length, Object.values(m1.store).every(e => e.seen)], [6, true])
const m2 = mergeAchievementStore(m1.store, earned, { now: '2027-01-01T00:00:00.000Z', seen: false })
check('rodar de novo não duplica nem altera', [m2.newIds, m2.store], [[], m1.store])
check('data desconhecida → data da migração, dateKnown=false', mergeAchievementStore({}, [{ id: 'leitura:1', earnedAt: null }], { now, seen: true }).store['leitura:1'], { earnedAt: now, seen: true, dateKnown: false })
const earnedUnmarked = computeEarnedAchievements(computeFamilyStates(statsFor(unmarked)))
const m3 = mergeAchievementStore(m1.store, earnedUnmarked, { now, seen: false })
check('capítulo desmarcado: conquista já ganha fica', [countEarned(m3.store), m3.store['bloco:profetas-menores'].seen], [6, true])
const m4 = mergeAchievementStore(m1.store, computeEarnedAchievements(computeFamilyStates(statsFor(new Set([...blockKeys, ...Array.from({ length: 150 }, (_, i) => `Salmos:${i + 1}`)])))), { now, seen: false })
check('conquista nova de verdade: não vista até abrir G5', [m4.newIds, unseenIds(m4.store)], [['leitura:3'], ['leitura:3']])
check('markSeen', unseenIds(markSeen(m4.store, ['leitura:3'])), [])
const seals1 = mergeBookSeals({}, pb, fsBlock.completionDates, { now })
check('selos: 12 livros, 1 leitura cada, nunca removidos', [Object.keys(seals1.seals).length, seals1.seals['Jonas'].readings, Object.keys(mergeBookSeals(seals1.seals, pu, {}, { now }).seals).length], [12, 1, 12])
check('mergeBookSeals idempotente', mergeBookSeals(seals1.seals, pb, fsBlock.completionDates, { now }).newBooks, [])
check('parabéns: prioridade livro > bloco > maior degrau', [pickCelebration(['Jonas'], ['bloco:lei', 'leitura:3']).kind, pickCelebration([], ['leitura:3', 'bloco:lei']).kind, pickCelebration([], ['leitura:1', 'tempo:2', 'oracao:2']).id, pickCelebration([], [])], ['livro', 'bloco', 'tempo:2', null])
const closest = pickClosest(computeFamilyStates(statsFor(eleven, { sessionRows: sessions })).families)
check('a mais perto: tempo 1/10 (10%) < leitura 11/50 (22%)', [closest.familyId, closest.nome, closest.remaining], ['leitura', 'Cinquenta capítulos', 39])
check('a mais perto leva o progresso entre o degrau atual e o próximo (11 entre 10 e 50)', closest.progress, 1 / 40)
check('a mais perto: null com tudo completo', pickClosest(FAMILIES.map(f => ({ id: f.id, next: null, ratio: 1 }))), null)
// Releitura
let seals = startReread(seals1.seals, 'Jonas', { now })
check('releitura: abre rastro', seals['Jonas'].reread.chapters, [])
seals = [1, 2, 3].reduce((s, c) => recordRereadChapter(s, 'Jonas', c, 4).seals, seals)
const done = recordRereadChapter(seals, 'Jonas', 4, 4)
check('releitura: 4 capítulos fecham o rastro e sobem readings', [done.completed, done.seals['Jonas'].readings, done.seals['Jonas'].reread], [true, 2, undefined])
check('releitura: máximo 3 pontos', [1, 2, 3, 4].reduce((s, c) => recordRereadChapter(s, 'Jonas', c, 4).seals, startReread({ Jonas: { readings: 3 } }, 'Jonas', { now }))['Jonas'].readings, 3)
check('releitura não muda a roda', computeBibleProgress(blockKeys).capitulosLidos, pb.capitulosLidos)

// ── Ritmo, estimativas, projeção ───────────────────────────────────────
const recentRows = Array.from({ length: 30 }, (_, i) => ({ livro: 'Gênesis', capitulo: i + 1, created_at: new Date(2026, 10, 10 - i).toISOString() }))
const stRate = statsFor(new Set(recentRows.map(r => `Gênesis:${r.capitulo}`)), { chapterRows: recentRows })
check('ritmo 8 semanas: 30 capítulos em 56 dias ≈ 16,1/mês', Math.round(familyRatePerMonth('leitura', stRate, computeFamilyStates(stRate)) * 10) / 10, 16.1)
check('monthsToNext: 20 que faltam a 16/mês = 1,25 meses; ritmo 0 → null; > 36 meses → null', [monthsToNext(20, 16), monthsToNext(20, 0), monthsToNext(1000, 10)], [1.25, null, null])
check('readingRatePerDay: menos de 14 dias de uso → null', readingRatePerDay(recentRows, new Date(2026, 10, 1).toISOString(), today), null)
const rate = readingRatePerDay(recentRows, new Date(2026, 8, 1).toISOString(), today)
check('readingRatePerDay: 30 capítulos / 60 dias = 0,5', rate, 0.5)
check('readingRatePerDay: zero leitura no período → null', readingRatePerDay([], new Date(2026, 8, 1).toISOString(), today), null)
check('em um ano a 0,5/dia: 30 + 182,5 = 212,5 → 17,9%', projectPercentInOneYear(30, 0.5), 17.9)
check('Bíblia inteira a 0,5/dia: 2.318 dias depois', dateKey(estimateBibleCompletion(30, 0.5, today)), dateKey(new Date(2026, 10, 10 + 2318)))
check('Bíblia inteira já lida → sem data', estimateBibleCompletion(1189, 0.5, today), null)
check('projectBookReads avança na ordem canônica', projectBookReads({ 'Gênesis': { lidos: 48 } }, GAMIFICATION_BOOKS, 10 / 365)['Êxodo'], 8)

check('firstActivityIso: o mais antigo entre as 3 fontes', firstActivityIso([{ created_at: '2026-03-10T10:00:00Z' }], [{ created_at: '2026-02-01T10:00:00Z' }], { '2026-02-15': R }), '2026-02-01T10:00:00.000Z')
check('firstActivityIso: nada → null', firstActivityIso([], [], {}), null)

// ── Geometria da roda (HANDOFF §2) ─────────────────────────────────────
check('ângulo útil 292,2° e início 1,7°', [Math.round(USABLE_DEGREES * 10) / 10, START_DEGREES], [292.2, 1.7])
const sl = computeSlices('livros')
const sc = computeSlices('capitulos')
check('66 fatias nos dois modos', [sl.length, sc.length], [66, 66])
check('modo livros: todas as fatias iguais (292,2/66)', sl.every(x => Math.abs((x.a1 - x.a0) - USABLE_DEGREES / 66) < 1e-9), true)
check('modo capítulos: Salmos é a maior, Obadias a menor', [sc.reduce((m, x) => (x.a1 - x.a0 > m.a1 - m.a0 ? x : m)).nome, sc.reduce((m, x) => (x.a1 - x.a0 < m.a1 - m.a0 ? x : m)).nome], ['Salmos', 'Obadias'])
check('a última fatia termina 1,7° antes do topo (fecha os 360°)', Math.round((sl[65].a1 + GAP_BLOCK / 2) * 1000) / 1000, 360)
check('folga de bloco entre Deuteronômio e Josué = 3,4°; entre livros 0,7°', [Math.round((sl[5].a0 - sl[4].a1) * 10) / 10, Math.round((sl[1].a0 - sl[0].a1) * 10) / 10], [3.4, 0.7])
check('setor abaixo de 0,04° não é desenhado', sectorPath(0, 0.03, 80, 136), '')
check('fill livros: 25 de 50 vai até r = 108', fillPath(sl[0], 25, 'livros').includes('A108 108'), true)
check('fill capítulos: metade da largura', Math.round((sc[0].a0 + (sc[0].a1 - sc[0].a0) / 2) * 1000) / 1000, Math.round(markerAngle(sc[0], 25, 'capitulos') * 1000) / 1000)
check('marcador livros: meio da fatia', markerAngle(sl[0], 10, 'livros'), (sl[0].a0 + sl[0].a1) / 2)
check('trilho inteiro existe pra todo livro', sl.every(x => x.trail.length > 0) && sc.every(x => x.trail.length > 0), true)

// ── Frases das conquistas (G4/G5) ──────────────────────────────────────
check('frase tempo com desde', familyCelebrationPhrase('tempo', { nome: 'Diego', value: 10, sinceMonth: 'março' }), 'Parabéns, Diego. Desde março, somando oração, leitura e reflexão, foram 10 horas inteiras.')
check('frase sem mês conhecido começa com maiúscula', familyCelebrationPhrase('leitura', { nome: 'Ana', value: 10, sinceMonth: null }), 'Parabéns, Ana. Você marcou 10 capítulos como lidos.')
check('frase constância no singular', familyCelebrationPhrase('constancia', { nome: 'Ana', value: 1, sinceMonth: 'maio' }), 'Parabéns, Ana. Desde maio, você cumpriu o seu plano em 1 semana — sem precisar que fossem seguidas.')
check('frase de bloco', blockCelebrationPhrase('profetas-menores', { nome: 'Diego', ultimoLivro: 'Malaquias' }), 'Parabéns, Diego. Com Malaquias, você completou todos os 12 livros de Profetas menores.')
check('a mais perto: plural e singular', [closestPhrase({ nome: 'Meio ano', remaining: 8, unidade: 'semanas na meta', unidadeSingular: 'semana na meta' }), closestPhrase({ nome: 'Dez capítulos', remaining: 1, unidade: 'capítulos', unidadeSingular: 'capítulo' })], ['Meio ano — faltam 8 semanas na meta', 'Dez capítulos — falta 1 capítulo'])
check('rodapé dos blocos: um livro faltando', nextBlockFooter({ livrosCompletos: 1, totalLivros: 66 }, { id: 'lei', livrosFaltantes: ['Deuteronômio'] }), 'Livros completos: 1 de 66 · a Lei acende quando você terminar Deuteronômio')
check('rodapé dos blocos: vários faltando', nextBlockFooter({ livrosCompletos: 1, totalLivros: 66 }, { id: 'cartas-paulo', livrosFaltantes: ['Romanos', 'Tito'] }), 'Livros completos: 1 de 66 · faltam 2 livros para as Cartas de Paulo acenderem')
check('rodapé dos blocos: tudo aceso', nextBlockFooter({ livrosCompletos: 66, totalLivros: 66 }, null), 'Livros completos: 66 de 66 · todos os blocos acesos')
check('limiar da escada: tempo em horas, leitura com milhar', [thresholdLabel('tempo', 10), thresholdLabel('leitura', 1189)], ['10 h', '1.189'])

// ── Formatação pt-BR ───────────────────────────────────────────────────
check('1.189 com ponto de milhar', formatInt(1189), '1.189')
check('4,2% e 0% e 100%', [formatPct(4.2), formatPct(0), formatPct(100)], ['4,2%', '0%', '100%'])
check('falta 1 capítulo / faltam 9 capítulos', [faltamPhrase(1, 'capítulo', 'capítulos'), faltamPhrase(9, 'capítulo', 'capítulos')], ['falta 1 capítulo', 'faltam 9 capítulos'])
check('50 de 1.189', deOf(50, 1189), '50 de 1.189')
check('mar/25', monthYearShort(new Date(2025, 2, 15).toISOString()), 'mar/25')
check('28 de agosto', dayMonthLong(new Date(2025, 7, 28, 12).toISOString()), '28 de agosto')
check('março de 2029', monthYearLong(new Date(2029, 2, 1)), 'março de 2029')
check('52 min / 1 h 05 / 2 h', [formatDuration(3120), formatDuration(3900), formatDuration(7200)], ['52 min', '1 h 05', '2 h'])

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTodos os testes da gamificação (parte pura) passaram.')
