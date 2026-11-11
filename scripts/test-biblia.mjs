// Testa a parte pura da aba Bíblia redesenhada (handoff-biblia-52):
// src/biblia/bibliaMath.js. Roda com: node scripts/test-biblia.mjs (ou
// `npm test`).
import { GAMIFICATION_BLOCKS, GAMIFICATION_BOOKS } from '../src/data/gamificationBlocks.js'
import { computeBibleProgress } from '../src/gamification/bibleProgressMath.js'
import {
  TESTAMENTS, blocksOfTestament, testamentOfBook, initialTestament, testamentProgress, testamentTexts,
  progressCardTexts, blockBarSegments, blockBooksCount, bookTile, readingSessionToday, continueCard,
} from '../src/biblia/bibliaMath.js'

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
const tudo = Object.fromEntries(GAMIFICATION_BOOKS.map(b => [b.nome, b.capitulos]))

// ── Testamentos ─────────────────────────────────────────────────────────
check('dois testamentos, nome em duas linhas', TESTAMENTS.map(t => [t.id, t.linhas]), [['at', ['Antigo', 'Testamento']], ['nt', ['Novo', 'Testamento']]])
check('Antigo: Lei, Históricos, Poéticos, Profetas maiores, Profetas menores', blocksOfTestament('at').map(b => b.nome), ['Lei', 'Históricos', 'Poéticos', 'Profetas maiores', 'Profetas menores'])
check('Novo: Evangelhos e Atos, Cartas de Paulo, Gerais e Apocalipse', blocksOfTestament('nt').map(b => b.nome), ['Evangelhos e Atos', 'Cartas de Paulo', 'Gerais e Apocalipse'])
check('todo bloco tem testamento', GAMIFICATION_BLOCKS.every(b => b.testamento === 'at' || b.testamento === 'nt'), true)
check('testamento de um livro', [testamentOfBook('Gênesis'), testamentOfBook('Malaquias'), testamentOfBook('Mateus'), testamentOfBook('Apocalipse'), testamentOfBook('Atlântida'), testamentOfBook(null)], ['at', 'at', 'nt', 'nt', null, null])

const exemplo = computeBibleProgress(setOf({ 'Gênesis': 40, Salmos: 6, Jonas: 4 }))
const at = testamentProgress(exemplo, 'at')
const nt = testamentProgress(exemplo, 'nt')
check('Antigo: 929 capítulos; Novo: 260', [at.total, nt.total], [929, 260])
check('B1: Antigo 50 de 929, faltam 879, 5,4%', [at.lidos, at.faltam, at.percent, at.completo], [50, 879, 5.4, false])
check('B1: textos do Antigo', testamentTexts(at), { percent: '5,4%', chapters: '50 de 929 capítulos lidos', remaining: 'faltam 879' })
check('B1: textos do Novo zerado', testamentTexts(nt), { percent: '0%', chapters: '0 de 260 capítulos lidos', remaining: 'faltam 260' })
const inteira = computeBibleProgress(setOf(tudo))
check('testamento completo: "completo" no lugar de "faltam"', [testamentTexts(testamentProgress(inteira, 'nt')).remaining, testamentTexts(testamentProgress(inteira, 'at')).percent], ['completo', '100%'])
const quaseAt = { ...tudo }; quaseAt['Malaquias'] = 3
check('falta 1 capítulo no testamento: "faltam 1"', testamentTexts(testamentProgress(computeBibleProgress(setOf(quaseAt)), 'at')).remaining, 'faltam 1')

check('testamento inicial: a escolha lembrada vence', [initialTestament('nt', 'Gênesis'), initialTestament('at', 'Mateus')], ['nt', 'at'])
check('testamento inicial no primeiro uso: o do livro em que a pessoa está', [initialTestament(null, 'Romanos'), initialTestament(undefined, 'Salmos'), initialTestament('xx', 'João')], ['nt', 'at', 'nt'])
check('testamento inicial sem nada: Antigo', initialTestament(null, null), 'at')

// ── Cartão de progresso e barra dos oito blocos ─────────────────────────
check('B1: "4,2%" · "50 de 1.189 capítulos" · "1 livro completo · 3 blocos começados"', progressCardTexts(exemplo), { percent: '4,2%', chapters: '50 de 1.189 capítulos', line: '1 livro completo · 3 blocos começados', aria: 'Sua Bíblia, 4,2% lida, 50 de 1.189 capítulos' })
const nova = computeBibleProgress(new Set())
check('conta nova: "0%" e plurais no zero', [progressCardTexts(nova).percent, progressCardTexts(nova).line], ['0%', '0 livros completos · 0 blocos começados'])
check('singulares: "1 livro completo · 1 bloco começado"', progressCardTexts(computeBibleProgress(setOf({ Jonas: 4 }))).line, '1 livro completo · 1 bloco começado')
check('plural: "2 livros completos"', progressCardTexts(computeBibleProgress(setOf({ Jonas: 4, Obadias: 1 }))).line, '2 livros completos · 1 bloco começado')
const seg = blockBarSegments(exemplo)
check('barra: oito segmentos, largura = capítulos do bloco', seg.map(s => s.flex), [187, 249, 243, 183, 67, 117, 87, 56])
check('barra: preenchimento = lidos ÷ capítulos do bloco', [seg[0].ratio, seg[1].ratio, seg[2].ratio, seg[4].ratio], [40 / 187, 0, 6 / 243, 4 / 67])
check('barra: só os blocos começados têm preenchimento', seg.map(s => s.started), [true, false, true, false, true, false, false, false])
check('conta nova: barra só nos tons', blockBarSegments(nova).some(s => s.started), false)
check('cabeçalho do bloco: "0 de 5 livros" e "1 de 12 livros"', [blockBooksCount(exemplo.porBloco[0]), blockBooksCount(exemplo.porBloco[4])], ['0 de 5 livros', '1 de 12 livros'])

// ── Pastilha do livro ───────────────────────────────────────────────────
check('não começado: "40 capítulos"', bookTile('Êxodo', exemplo.porLivro['Êxodo']), { state: 'nao', support: '40 capítulos', ratio: 0, aria: 'Êxodo, 0 de 40 capítulos' })
check('não começado, livro de um capítulo: "1 capítulo"', [bookTile('Obadias', exemplo.porLivro['Obadias']).support, bookTile('Obadias', exemplo.porLivro['Obadias']).aria], ['1 capítulo', 'Obadias, 0 de 1 capítulo'])
check('em andamento: "40 de 50", faixa de 80%', bookTile('Gênesis', exemplo.porLivro['Gênesis']), { state: 'andamento', support: '40 de 50', ratio: 0.8, aria: 'Gênesis, 40 de 50 capítulos' })
check('completo: "4 capítulos · completo"', bookTile('Jonas', exemplo.porLivro['Jonas']), { state: 'completo', support: '4 capítulos · completo', ratio: 1, aria: 'Jonas, 4 de 4 capítulos' })
check('completo de um capítulo: "1 capítulo · completo"', bookTile('Obadias', computeBibleProgress(setOf({ Obadias: 1 })).porLivro['Obadias']).support, '1 capítulo · completo')
check('milhar com ponto não se aplica a livro, mas Salmos passa de cem', bookTile('Salmos', exemplo.porLivro['Salmos']).support, '6 de 150')

// ── Sessão de hoje e cartão "continuar" ─────────────────────────────────
const todos = [true, true, true, true, true, true, true]
const nenhum = [false, false, false, false, false, false, false]
const TUE = 1
const stepDays = { prayer: todos, reading: todos, study: nenhum, reflection: todos }
const base = { routineModules: ['prayer', 'reading', 'reflection'], stepDays, todayIdx: TUE, dayEntry: {}, passage: 'Gênesis 41' }
check('sessão de hoje: o trecho do plano', readingSessionToday(base), 'Gênesis 41')
check('leitura já feita hoje: sem sessão', readingSessionToday({ ...base, dayEntry: { reading: true } }), null)
check('dia de descanso da leitura: sem sessão', readingSessionToday({ ...base, stepDays: { ...stepDays, reading: todos.map((_, i) => i !== TUE) } }), null)
check('leitura desligada no plano: sem sessão', readingSessionToday({ ...base, routineModules: ['prayer'] }), null)
check('sem plano de leitura (sem trecho): sem sessão', readingSessionToday({ ...base, passage: '' }), null)
check('oração feita mas leitura não: a sessão continua', readingSessionToday({ ...base, dayEntry: { prayer: true } }), 'Gênesis 41')

check('B1: sessão de hoje + leitura livre com versículo', continueCard({ sessionTitle: 'Gênesis 41', free: { book: 'Salmos', chapter: 23, verse: 4 } }), { label: 'SESSÃO DE HOJE · CONTA NO PLANO', sessionTitle: 'Gênesis 41', free: { passage: 'Salmos 23', verse: 4 } })
check('sem sessão: a leitura livre ocupa o cartão, com outro rótulo', continueCard({ sessionTitle: null, free: { book: 'Salmos', chapter: 23, verse: 4 } }), { label: 'CONTINUAR A LEITURA LIVRE', sessionTitle: null, free: { passage: 'Salmos 23', verse: 4 } })
check('sem leitura livre anterior: só a sessão', continueCard({ sessionTitle: 'Gênesis 41', free: null }), { label: 'SESSÃO DE HOJE · CONTA NO PLANO', sessionTitle: 'Gênesis 41', free: null })
check('sem nenhuma das duas: o cartão não aparece', continueCard({ sessionTitle: null, free: null }), null)
check('versículo desconhecido (1 ou vazio) não entra na frase', [continueCard({ sessionTitle: null, free: { book: 'Salmos', chapter: 23, verse: 1 } }).free.verse, continueCard({ sessionTitle: null, free: { book: 'Salmos', chapter: 23 } }).free.verse], [null, null])

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes da aba Bíblia (parte pura) passaram.')
