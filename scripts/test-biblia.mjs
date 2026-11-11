// Testa a parte pura da aba Bíblia redesenhada (handoff-biblia-52):
// src/biblia/bibliaMath.js. Roda com: node scripts/test-biblia.mjs (ou
// `npm test`).
import { GAMIFICATION_BLOCKS, GAMIFICATION_BOOKS } from '../src/data/gamificationBlocks.js'
import { computeBibleProgress } from '../src/gamification/bibleProgressMath.js'
import {
  TESTAMENTS, blocksOfTestament, testamentOfBook, initialTestament, testamentProgress, testamentTexts,
  progressCardTexts, blockBarSegments, blockBooksCount, bookTile, readingSessionToday, continueCard,
  bookHeaderSub, bookSealLine, firstChapterIso, countBookMarks, bookNumbers, chapterCells, chapterCellAria, chapterLegend,
  bookFooterButton, bookActions,
} from '../src/biblia/bibliaMath.js'
import { buildChapterOriginMap } from '../src/bible/chapterOrigin.js'

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

// ── B2: o livro ─────────────────────────────────────────────────────────
check('cabeçalho: "Lei · livro 1 de 66"', [bookHeaderSub('Gênesis'), bookHeaderSub('Jonas'), bookHeaderSub('Apocalipse')], ['Lei · livro 1 de 66', 'Profetas menores · livro 32 de 66', 'Gerais e Apocalipse · livro 66 de 66'])
const gen40 = exemplo.porLivro['Gênesis']
check('B2: "Faltam 10 capítulos para o selo"', bookSealLine(gen40, null), 'Faltam 10 capítulos para o selo')
check('singular: "Falta 1 capítulo para o selo"', bookSealLine(computeBibleProgress(setOf({ 'Gênesis': 49 })).porLivro['Gênesis'], null), 'Falta 1 capítulo para o selo')
check('nada lido: "{n} capítulos para o selo" (e "1 capítulo")', [bookSealLine(exemplo.porLivro['Êxodo'], null), bookSealLine(exemplo.porLivro['Obadias'], null)], ['40 capítulos para o selo', '1 capítulo para o selo'])
check('completo: "Selo ganho em 14 de setembro"', bookSealLine(exemplo.porLivro['Jonas'], { completedAt: '2026-09-14T12:00:00', dateKnown: true }), 'Selo ganho em 14 de setembro')
check('completo sem data conhecida (ou ainda sem linha gravada): "Selo ganho"', [bookSealLine(exemplo.porLivro['Jonas'], { completedAt: '2026-09-14T12:00:00', dateKnown: false }), bookSealLine(exemplo.porLivro['Jonas'], null)], ['Selo ganho', 'Selo ganho'])

const hojeB2 = new Date(2026, 8, 24, 10, 0)
const linhas = [{ livro: 'Gênesis', capitulo: 1, created_at: new Date(2026, 8, 1, 7, 0).toISOString() }, { livro: 'Gênesis', capitulo: 2, created_at: new Date(2026, 8, 3, 7, 0).toISOString() }, { livro: 'Salmos', capitulo: 1, created_at: new Date(2026, 7, 1, 7, 0).toISOString() }, { livro: 'Gênesis', capitulo: 9, created_at: null }]
check('primeiro capítulo do livro = registro mais antigo dele', firstChapterIso('Gênesis', linhas), linhas[0].created_at)
check('livro sem registro datado: sem data', [firstChapterIso('Jonas', linhas), firstChapterIso('Gênesis', [])], [null, null])
const sessoes = [{ livro: 'Gênesis', passo: 'reading', segundos: 6 * 3600 + 10 * 60 }, { livro: 'Salmos', passo: 'reading', segundos: 600 }, { livro: null, passo: 'reading', segundos: 999 }]
const notas = { 'Gênesis:1-2': { text: 'a' }, 'Gênesis:3-3': { text: 'b' }, 'Salmos:23-23': { text: 'c' }, 'application:pinned': { text: 'x' } }
const marcas = [{ book: 'Gênesis', chapter: 1, verses: [1] }, { book: 'Gênesis', chapter: 2, verses: [3], hidden: true }, { book: 'Salmos', chapter: 23, verses: [4] }]
check('marcações do livro (as escondidas não contam)', [countBookMarks('Gênesis', marcas), countBookMarks('Jonas', marcas)], [1, 0])
check('B2: três números — "6 h 10" · "23 dias" · notas + marcações', bookNumbers({ nome: 'Gênesis', sessionRows: sessoes, chapterRows: linhas, notes: notas, highlights: marcas, today: hojeB2 }), [{ key: 'time', value: '6 h 10', caption: 'de leitura' }, { key: 'days', value: '23 dias', caption: 'desde o primeiro' }, { key: 'notes', value: '3', caption: 'notas e marcações' }])
check('sem tempo registrado: o número do tempo some', bookNumbers({ nome: 'Gênesis', sessionRows: [], chapterRows: linhas, notes: {}, highlights: [], today: hojeB2 }).map(n => n.key), ['days', 'notes'])
check('sem data do primeiro capítulo: os dias somem', bookNumbers({ nome: 'Jonas', sessionRows: sessoes, chapterRows: linhas, notes: {}, highlights: [], today: hojeB2 }).map(n => [n.key, n.value]), [['notes', '0']])
check('primeiro capítulo hoje ou ontem: "1 dia"', [bookNumbers({ nome: 'Gênesis', sessionRows: [], chapterRows: [{ livro: 'Gênesis', capitulo: 1, created_at: hojeB2.toISOString() }], notes: {}, highlights: [], today: hojeB2 })[0].value, bookNumbers({ nome: 'Gênesis', sessionRows: [], chapterRows: [{ livro: 'Gênesis', capitulo: 1, created_at: new Date(2026, 8, 23, 22, 0).toISOString() }], notes: {}, highlights: [], today: hojeB2 })[0].value], ['1 dia', '1 dia'])
check('tempo abaixo de uma hora: "52 min"', bookNumbers({ nome: 'Salmos', sessionRows: [{ livro: 'Salmos', passo: 'reading', segundos: 52 * 60 }], chapterRows: [], notes: {}, highlights: [], today: hojeB2 })[0].value, '52 min')

// Grade: Gênesis 1–38 no app, 39 e 40 à mão, 41 é o próximo.
const gen = setOf({ 'Gênesis': 40 })
const origem = buildChapterOriginMap([{ livro: 'Gênesis', capitulo: 39, origem: 'manual' }, { livro: 'Gênesis', capitulo: 40, origem: 'manual' }, { livro: 'Gênesis', capitulo: 1, origem: 'sessao' }])
const casas = chapterCells('Gênesis', 50, gen, origem)
check('grade: 50 casas', casas.length, 50)
check('grade: estados — app, à mão, próximo, não lido', [casas[0].state, casas[37].state, casas[38].state, casas[39].state, casas[40].state, casas[41].state, casas[49].state], ['app', 'app', 'manual', 'manual', 'next', 'none', 'none'])
check('grade: um "próximo" só, o primeiro não lido', casas.filter(c => c.state === 'next').map(c => c.ch), [41])
const comBuraco = new Set(gen); comBuraco.delete('Gênesis:5')
check('próximo é o primeiro não lido, mesmo no meio', chapterCells('Gênesis', 50, comBuraco, origem).filter(c => c.state === 'next').map(c => c.ch), [5])
check('capítulo sem registro de origem conta como lido no app', chapterCells('Gênesis', 50, gen, new Map())[38].state, 'app')
check('legenda: só os estados presentes, na ordem', [chapterLegend(casas).map(l => l.label), chapterLegend(chapterCells('Êxodo', 40, gen, origem)).map(l => l.label), chapterLegend(chapterCells('Jonas', 4, setOf({ Jonas: 4 }), new Map())).map(l => l.label)], [['lido no app', 'marcado à mão', 'próximo'], ['próximo'], ['lido no app']])
check('rótulo da casa pra leitor de tela', [chapterCellAria(casas[0]), chapterCellAria(casas[38]), chapterCellAria(casas[40]), chapterCellAria(casas[49])], ['Capítulo 1, lido no app', 'Capítulo 39, marcado à mão', 'Capítulo 41, próximo', 'Capítulo 50, não lido'])

check('rodapé: "Abrir Gênesis 41"', bookFooterButton('Gênesis', gen40, gen), { label: 'Abrir Gênesis 41', chapter: 41 })
check('rodapé, livro não começado: "Começar Êxodo"', bookFooterButton('Êxodo', exemplo.porLivro['Êxodo'], gen), { label: 'Começar Êxodo', chapter: 1 })
check('rodapé, livro completo: "Ler Jonas de novo" abre o capítulo 1', bookFooterButton('Jonas', exemplo.porLivro['Jonas'], setOf({ Jonas: 4 })), { label: 'Ler Jonas de novo', chapter: 1 })
check('rodapé: o próximo é o primeiro não lido, não o último + 1', bookFooterButton('Gênesis', computeBibleProgress(comBuraco).porLivro['Gênesis'], comBuraco).label, 'Abrir Gênesis 5')
check('ações: marcar o livro inteiro e começar o plano aqui', bookActions('Gênesis', gen40).map(a => [a.key, a.title, a.sub]), [['mark', 'Marcar o livro inteiro como lido', 'Para quem já leu Gênesis antes do app'], ['plan', 'Começar meu plano aqui', 'Faz de Gênesis o ponto de partida']])
check('ações, livro completo: a primeira vira "Desmarcar o livro"', [bookActions('Jonas', exemplo.porLivro['Jonas'])[0].key, bookActions('Jonas', exemplo.porLivro['Jonas'])[0].title, bookActions('Jonas', exemplo.porLivro['Jonas'])[0].sub, bookActions('Obadias', computeBibleProgress(setOf({ Obadias: 1 })).porLivro['Obadias'])[0].sub], ['unmark', 'Desmarcar o livro', 'Os 4 capítulos voltam a não lidos', 'O capítulo volta a não lido'])

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes da aba Bíblia (parte pura) passaram.')
