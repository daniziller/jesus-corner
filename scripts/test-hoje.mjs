// Testa a parte pura do Hoje (handoff-hoje-50): src/hoje/hojeMath.js e as
// extensões que o Hoje pediu às funções da gamificação (recentSeals,
// footerBook). Roda com: node scripts/test-hoje.mjs (ou `npm test`).
import { GAMIFICATION_BOOKS } from '../src/data/gamificationBlocks.js'
import { computeBibleProgress, footerBook } from '../src/gamification/bibleProgressMath.js'
import { recentSeals } from '../src/gamification/sealDetails.js'
import { chaptersLine, bibleBookLine, bibleFinishedIso, bibleCardAria, weeksAria, daysAria, sealsAria, dayDotKind } from '../src/hoje/hojeMath.js'

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

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes do Hoje (parte pura) passaram.')
