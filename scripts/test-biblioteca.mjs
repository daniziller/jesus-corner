// Testes da aba Biblioteca (handoff-biblioteca-55), parte pura: o que
// entra, as contagens por tipo e o total, os quadrados, o cartão de
// Estudos e os três mais recentes — e as provas de privacidade (a oração
// nunca entra; só o que é da pessoa).
// node scripts/test-biblioteca.mjs
import { readFileSync } from 'node:fs'
import {
  LIBRARY_TYPES, pickLibraryData, libraryItems, libraryCounts, booksOf, totalCard, whenLabel, typeTiles,
  itemReference, chaptersByDay, reflectionTitle, reflectionFirstAnswer, itemTitle, itemLine, recentItems, recentRows,
  studiesSummary, studiesCard, isEmptyLibrary, sermonHasContent, EMPTY_LIBRARY_TEXT,
} from '../src/biblioteca/bibliotecaMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')

// Uma terça, 10 de novembro de 2026 (o dia das capturas).
const agora = new Date(2026, 10, 10, 10, 0)
const ha = (dias, hora = 9) => new Date(2026, 10, 10 - dias, hora, 0).toISOString()
const dia = dias => { const d = new Date(2026, 10, 10 - dias); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const hl = (id, book, chapter, verses, dias, extra = {}) => ({ id, book, bookEn: book, chapter, verses, text: '', color: 'amarelo', createdAt: ha(dias), ...extra })
const row = {
  notes: {
    [`reflection:${dia(0)}`]: { text: 'O que a espera mostra?\nDeus não desperdiça a espera.\n\nE você?\nEu espero.', updatedAt: ha(0, 7) },
    [`reflection:${dia(40)}`]: 'Reflexão antiga, só texto (formato de antes das datas).',
    'Rute:reflection': { text: 'Fechando Rute.', updatedAt: ha(20) },
    'recap:2026-10': { text: 'Outubro foi de constância.', updatedAt: ha(9) },
    [`application:${dia(2)}`]: { text: 'Hoje eu espero sem cobrar resposta.', updatedAt: ha(2), fulfilled: true },
    [`application:${dia(50)}`]: { text: 'Confiar antes de entender.', updatedAt: ha(50) },
    'application:pinned': { text: 'Hoje eu espero sem cobrar resposta.', updatedAt: ha(2) },
    'Gênesis:39-40': { text: 'Nota da sessão de leitura.', updatedAt: ha(5) },
    'Êxodo:1-1': { text: '   ', updatedAt: ha(5) },
    'chave:que:ninguem:conhece': { text: 'não é da Biblioteca', updatedAt: ha(1) },
  },
  highlights: [
    hl('h1', 'Gênesis', 39, [21], 3),
    hl('h2', 'Gênesis', 41, [51], 4, { text: 'esquecer não é apagar' }),
    hl('h3', 'Salmos', 23, [4], 1, { kind: 'note', text: 'O vale é passagem, não endereço.', tags: ['medo'] }),
    hl('h4', 'João', 16, [33], 29, { hidden: true, text: 'apagada' }),
    hl('h5', 'João', 3, [17, 16], 60),
    hl('h6', 'João', 1, [1], 70, { kind: 'note', text: '' }),
  ],
  sermon_notes: [
    { id: 's1', date: dia(2), createdAt: ha(2, 10), updatedAt: ha(0), noteType: 'sermon', title: 'A fidelidade que não se explica', preacher: 'Pr. João Silva', church: 'Igreja Batista Central', passages: [{ book: 'Gênesis', chapter: 39, verseStart: 21, verseEnd: 21 }, { book: 'Romanos', chapter: 8, verseStart: 28, verseEnd: 28 }], body: [{ id: 'a', type: 'text', text: 'Deus é fiel mesmo quando não entendemos o caminho.' }, { id: 'b', type: 'quote', text: 'texto bíblico citado', ref: 'Gênesis 39:21' }, { id: 'c', type: 'topic', text: 'Ele vê' }], finalizedAt: ha(2) },
    { id: 's2', date: dia(30), createdAt: ha(30), noteType: 'free', title: '', preacher: '', church: '', passages: [], text: 'Uma anotação livre sem título nem pregador, só o texto corrido.', finalizedAt: null },
    { id: 's3', date: dia(1), createdAt: ha(1), noteType: 'sermon', title: ' ', preacher: '', church: '', link: '', passages: [], text: '', body: [{ id: 'x', type: 'text', text: '' }] },
  ],
  // A oração mora na mesma linha — e não pode chegar à Biblioteca.
  prayer_requests: [{ id: 'p1', text: 'PEDIDO SECRETO' }],
  prayer_stats: { totalSeconds: 9999 },
  prayer_journal: { [dia(0)]: 'ORAÇÃO SECRETA' },
  ai_studies: [{ id: 'e1', title: 'Filipenses', sessions: [{ id: 1, book: 'Filipenses', completedAt: ha(3) }, { id: 2, book: 'Filipenses' }, { id: 3, book: 'Filipenses' }, { id: 4, book: 'Filipenses' }, { id: 5, book: 'Filipenses' }, { id: 6, book: 'Filipenses' }] }, { id: 'e2', title: 'Rute', sessions: [{ id: 1, book: 'Rute', completedAt: ha(90) }] }],
  inductive_studies: [{ id: 'i1', title: 'Jonas', sessions: [] }],
  studies_completed: [],
  active_study: { studyId: 'e1' },
}
const questions = [
  { book: 'Gênesis', bookEn: 'Genesis', chapter: 41, verseStart: 1, verseEnd: 1, question: 'Por que dois anos?', answer: { outcome: 'answer', reply: 'O texto só marca o tempo.' }, createdAt: ha(12) },
  { book: 'João', chapter: 3, verseStart: 16, verseEnd: 18, question: 'E esta?', answer: { outcome: 'refused' }, createdAt: ha(80) },
]
const data = pickLibraryData(row)
const items = libraryItems({ ...data, questions })
const porChave = Object.fromEntries(items.map(i => [i.key, i]))

// ── O que entra ───────────────────────────────────────────────────────
check('da linha, só as colunas da Biblioteca', Object.keys(data), ['notes', 'highlights', 'sermonNotes', 'aiStudies', 'inductiveStudies', 'studiesCompleted', 'activeStudyId'])
check('linha vazia (conta que ainda não tem linha) não quebra', pickLibraryData(null), { notes: {}, highlights: [], sermonNotes: [], aiStudies: [], inductiveStudies: [], studiesCompleted: [], activeStudyId: null })
check('a oração não entra: nenhum item traz texto de oração', items.some(i => JSON.stringify(i).includes('SECRET')), false)
check('a oração não entra: os tipos são só os seis', [...new Set(items.map(i => i.type))].sort(), ['aplicacao', 'marcacao', 'nota', 'pergunta', 'pregacao', 'reflexao'])
check('a ordem dos seis tipos', LIBRARY_TYPES.map(t => t.name), ['Notas', 'Marcações', 'Reflexões', 'Pregações', 'Aplicações', 'Perguntas'])
check('marcação com nota é UM item, em Marcações', [porChave['marcacao:h2'].type, porChave['marcacao:h2'].note, 'nota:h2' in porChave], ['marcacao', 'esquecer não é apagar', false])
check('a nota de versículo (nasceu como nota) é Nota, não Marcação', [porChave['nota:h3'].type, 'marcacao:h3' in porChave], ['nota', false])
check('nota de versículo sem texto não é nota: fica como marcação', [porChave['marcacao:h6']?.type, 'nota:h6' in porChave], ['marcacao', false])
check('marcação apagada (escondida) não entra', 'marcacao:h4' in porChave, false)
check('os versículos saem em ordem', porChave['marcacao:h5'].verses, [16, 17])
check('a nota da sessão de leitura é Nota', [porChave['nota:Gênesis:39-40'].type, porChave['nota:Gênesis:39-40'].chapter, porChave['nota:Gênesis:39-40'].chapterEnd], ['nota', 39, 40])
check('nota só com espaços não entra', 'nota:Êxodo:1-1' in porChave, false)
check('a frase fixada no Hoje não é um item', items.some(i => i.key.includes('pinned')), false)
check('chave desconhecida não entra', items.some(i => i.text === 'não é da Biblioteca'), false)
check('reflexão de fim de livro e retrospectiva do mês são Reflexões', [porChave['reflexao:Rute:reflection'].kind, porChave['reflexao:recap:2026-10'].kind], ['livro', 'mes'])
check('reflexão antiga (só texto, sem data de atualização) vale pelo dia da chave', porChave[`reflexao:reflection:${dia(40)}`].at, `${dia(40)}T12:00:00`)
check('a frase do dia guarda se foi cumprida', [porChave[`aplicacao:application:${dia(2)}`].fulfilled, porChave[`aplicacao:application:${dia(50)}`].fulfilled], [true, false])
check('a pregação leva só as palavras da pessoa (sem o versículo citado)', porChave['pregacao:s1'].text, 'Deus é fiel mesmo quando não entendemos o caminho.\n\nEle vê')
check('anotação longa vazia não entra', 'pregacao:s3' in porChave, false)
check('anotação livre e em rascunho entra, marcada como rascunho', [porChave['pregacao:s2'].noteType, porChave['pregacao:s2'].draft, porChave['pregacao:s1'].draft], ['free', true, false])
check('tem conteúdo: só título em branco não conta', [sermonHasContent({ title: '  ', passages: [] }), sermonHasContent({ passages: [{}] }), sermonHasContent(null)], [false, true, false])
check('pergunta: a resposta só quando houve resposta', [items.find(i => i.type === 'pergunta' && i.chapter === 41).answer, items.find(i => i.type === 'pergunta' && i.chapter === 3).answer], ['O texto só marca o tempo.', ''])

// ── Contagens e total ─────────────────────────────────────────────────
const counts = libraryCounts(items)
check('contagens por tipo', counts, { nota: 2, marcacao: 4, reflexao: 4, pregacao: 2, aplicacao: 2, pergunta: 2, total: 16 })
check('o total é a soma dos seis (estudos fora)', counts.total, LIBRARY_TYPES.reduce((s, t) => s + counts[t.type], 0))
check('conta nova: tudo zero', libraryCounts(libraryItems({})), { nota: 0, marcacao: 0, reflexao: 0, pregacao: 0, aplicacao: 0, pergunta: 0, total: 0 })
check('conta nova é Biblioteca vazia', [isEmptyLibrary(libraryItems({})), isEmptyLibrary(items)], [true, false])
check('o texto do vazio é o de 4c', EMPTY_LIBRARY_TEXT.startsWith('Nada por aqui ainda. Uma reflexão sobre o capítulo de hoje, a anotação do sermão de domingo'), true)
check('livros de uma pregação: os das passagens', booksOf(porChave['pregacao:s1']), ['Gênesis', 'Romanos'])
check('livro que não existe não conta', booksOf({ type: 'nota', book: 'Livro Inventado' }), [])
check('cartão do total', totalCard(items, agora), { total: '16', label: 'anotações guardadas', sub: 'em 5 livros da Bíblia · 8 este mês' })
check('cartão do total: 1 anotação, 1 livro', totalCard(libraryItems({ highlights: [hl('x', 'Salmos', 1, [1], 1)] }), agora), { total: '1', label: 'anotação guardada', sub: 'em 1 livro da Bíblia · 1 este mês' })
check('cartão do total: conta nova', totalCard([], agora), { total: '0', label: 'anotações guardadas', sub: '' })
check('cartão do total: nada este mês nem livro some da linha', totalCard(libraryItems({ notes: { [`application:${dia(50)}`]: { text: 'x', updatedAt: ha(50) } } }), agora), { total: '1', label: 'anotação guardada', sub: '' })
check('milhar com ponto', totalCard(Array.from({ length: 1234 }, (_, i) => ({ type: 'aplicacao', key: `a${i}` })), agora).total, '1.234')

// ── Quando ────────────────────────────────────────────────────────────
check('quando: hoje, ontem, há N dias, data curta', [0, 1, 2, 6, 7, 29].map(n => whenLabel(ha(n), agora)), ['hoje', 'ontem', 'há 2 dias', 'há 6 dias', '3 nov', '12 out'])
check('quando: o dia da semana, para pregações', [0, 1, 2, 6, 7].map(n => whenLabel(ha(n), agora, { weekday: true })), ['hoje', 'ontem', 'domingo', 'quarta', '3 nov'])
check('quando: outro ano leva o ano', whenLabel(new Date(2025, 8, 1).toISOString(), agora), '1 set 2025')
check('quando: tarde da noite de ontem ainda é ontem', whenLabel(new Date(2026, 10, 9, 23, 50).toISOString(), new Date(2026, 10, 10, 0, 10)), 'ontem')
check('quando: sem data, nada', whenLabel(null, agora), '')

// ── Os quadrados ──────────────────────────────────────────────────────
const tiles = typeTiles(items, agora)
check('quadrados: nome, contagem e apoio, na ordem', tiles.map(t => `${t.name}|${t.count}|${t.support}`), [
  'Notas|2|Presas a um versículo · última ontem',
  'Marcações|4|Trechos grifados · última há 3 dias',
  'Reflexões|4|Do passo do plano · última hoje',
  'Pregações|2|Sermões, cultos e aulas · domingo',
  'Aplicações|2|Suas frases do dia',
  'Perguntas|2|O que você perguntou e guardou',
])
check('quadrados: só Marcações em areia', tiles.map(t => t.tone), ['white', 'sand', 'white', 'white', 'white', 'white'])
check('quadrados: marcador', tiles.map(t => `${t.marker}:${t.color}`), ['square:ink', 'square:sand', 'square:accent', 'square:sand', 'circle:accent', 'circle:ink'])
check('quadrados: o que cada um anuncia', tiles.map(t => t.aria), ['Notas, 2', 'Marcações, 4', 'Reflexões, 4', 'Pregações, 2', 'Aplicações, 2', 'Perguntas, 2'])
check('tipo com zero: "0" e o apoio sem o "quando"', typeTiles([], agora).map(t => `${t.count}|${t.support}`), ['0|Presas a um versículo', '0|Trechos grifados', '0|Do passo do plano', '0|Sermões, cultos e aulas', '0|Suas frases do dia', '0|O que você perguntou e guardou'])
check('as contagens dos quadrados são as mesmas de libraryCounts', tiles.map(t => Number(t.count)), LIBRARY_TYPES.map(t => counts[t.type]))

// ── Títulos e linhas ──────────────────────────────────────────────────
const lidos = chaptersByDay([{ livro: 'Gênesis', capitulo: 41, created_at: ha(0, 6) }, { livro: 'Gênesis', capitulo: 40, created_at: ha(0, 5) }, { livro: 'Salmos', capitulo: 1, created_at: ha(0, 8) }, { livro: 'Rute', capitulo: 4, created_at: ha(20) }, { capitulo: 2 }])
check('capítulos lidos por dia', Object.keys(lidos).sort(), [dia(20), dia(0)].sort())
check('referência: versículo, intervalo, capítulos da sessão, pergunta', [itemReference(porChave['nota:h3']), itemReference(porChave['marcacao:h5']), itemReference(porChave['nota:Gênesis:39-40']), itemReference(items.find(i => i.type === 'pergunta' && i.chapter === 3)), itemReference(items.find(i => i.type === 'pergunta' && i.chapter === 41))], ['Salmos 23:4', 'João 3:16–17', 'Gênesis 39–40', 'João 3:16–18', 'Gênesis 41:1'])
check('reflexão: o livro e os capítulos lidos no dia', reflectionTitle(porChave[`reflexao:reflection:${dia(0)}`], lidos), 'Gênesis 40–41')
check('reflexão: um capítulo só', reflectionTitle({ kind: 'dia', date: dia(20) }, lidos), 'Rute 4')
check('reflexão: sem leitura registrada no dia, a data', reflectionTitle(porChave[`reflexao:reflection:${dia(40)}`], lidos), 'Reflexão de 1 de outubro')
check('reflexão de fim de livro e do mês', [reflectionTitle(porChave['reflexao:Rute:reflection']), reflectionTitle(porChave['reflexao:recap:2026-10'])], ['Rute · Reflexão de fechamento', 'Outubro de 2026 · Seu mês'])
check('primeira resposta: pula a pergunta', reflectionFirstAnswer('O que a espera mostra?\nDeus não desperdiça a espera.\n\nE você?\nEu espero.'), 'Deus não desperdiça a espera.')
check('primeira resposta: folha livre é o próprio texto', reflectionFirstAnswer('Hoje percebi que a pressa é minha.\nNão de Deus.'), 'Hoje percebi que a pressa é minha. Não de Deus.')
check('título: pregação é "Pregador · Instituição"', itemTitle(porChave['pregacao:s1']), 'Pr. João Silva · Igreja Batista Central')
check('título: anotação sem pregador nem título, as primeiras palavras', itemTitle(porChave['pregacao:s2']), 'Uma anotação livre sem título nem')
check('título: só o título quando não há pregador', itemTitle({ type: 'pregacao', preacher: '', church: '', title: 'Notas da aula', text: 'x' }), 'Notas da aula')
check('título: nota e marcação, a referência', [itemTitle(porChave['nota:h3']), itemTitle(porChave['marcacao:h1'])], ['Salmos 23:4', 'Gênesis 39:21'])
check('título: aplicação é a frase; pergunta é a pergunta', [itemTitle(porChave[`aplicacao:application:${dia(2)}`]), itemTitle(items.find(i => i.type === 'pergunta' && i.chapter === 41))], ['Hoje eu espero sem cobrar resposta.', 'Por que dois anos?'])
check('linha: marcação com nota mostra a nota; sem nota, o trecho carregado', [itemLine(porChave['marcacao:h2']), itemLine(porChave['marcacao:h1']), itemLine(porChave['marcacao:h1'], { verseTexts: { 'marcacao:h1': 'O Senhor estava com José' } })], ['esquecer não é apagar', '', '"O Senhor estava com José"'])
check('linha: pregação numa linha só; pergunta, a resposta; aplicação, nada', [itemLine(porChave['pregacao:s1']), itemLine(items.find(i => i.type === 'pergunta' && i.chapter === 41)), itemLine(porChave[`aplicacao:application:${dia(2)}`])], ['Deus é fiel mesmo quando não entendemos o caminho. Ele vê', 'O texto só marca o tempo.', ''])

// ── Recentes ──────────────────────────────────────────────────────────
check('recentes: os três mais recentes, de qualquer tipo', recentItems(items).map(i => i.key), [`reflexao:reflection:${dia(0)}`, 'nota:h3', 'pregacao:s1'])
check('recentes: nunca mais de três', recentItems(items).length, 3)
check('recentes: com um item só, um', recentItems(libraryItems({ highlights: [hl('x', 'Salmos', 1, [1], 1)] })).length, 1)
check('recentes: item sem data não entra na frente dos datados', recentItems([{ key: 'a', type: 'nota', at: null }, { key: 'b', type: 'nota', at: ha(400) }]).map(i => i.key), ['b'])
check('recentes: as linhas', recentRows(items, { now: agora, readByDay: lidos }).map(r => `${r.label}|${r.color}|${r.when}|${r.title}|${r.line}`), [
  'Reflexão|accent|hoje|Gênesis 40–41|Deus não desperdiça a espera.',
  'Nota|ink|ontem|Salmos 23:4|O vale é passagem, não endereço.',
  'Pregação|sand|domingo|Pr. João Silva · Igreja Batista Central|Deus é fiel mesmo quando não entendemos o caminho. Ele vê',
])

// ── Estudos ───────────────────────────────────────────────────────────
const estudos = studiesSummary({ ai: data.aiStudies, inductive: data.inductiveStudies, completed: data.studiesCompleted, activeStudyId: data.activeStudyId })
check('estudos: quantos e o que está em andamento', estudos, { count: 3, active: { id: 'e1', title: 'Filipenses', day: 2, total: 6 } })
check('cartão: em andamento', studiesCard(estudos), { label: 'Estudos · 3', title: 'Filipenses · dia 2 de 6', progress: 2 / 6, action: 'open' })
check('cartão: sem estudo em andamento', studiesCard({ count: 3, active: null }), { label: 'Estudos · 3', title: '3 estudos guardados', progress: null, action: 'open' })
check('cartão: um estudo guardado', studiesCard({ count: 1, active: null }), { label: 'Estudos · 1', title: '1 estudo guardado', progress: null, action: 'open' })
check('cartão: sem nenhum estudo', studiesCard({ count: 0, active: null }), { label: 'Estudos', title: 'Criar um estudo', progress: null, action: 'create' })
check('estudos: o último dia não passa do total', studiesSummary({ ai: [{ id: 'e', title: 'T', sessions: [{ id: 1, book: 'Rute', completedAt: ha(1) }] }], activeStudyId: 'e' }).active, { id: 'e', title: 'T', day: 1, total: 1 })
check('estudos: formato antigo conta pelos dias marcados', studiesSummary({ catalog: [{ id: 'c', title: 'Pentateuco', sessions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }], completed: ['c:a'], activeStudyId: 'c' }), { count: 1, active: { id: 'c', title: 'Pentateuco', day: 2, total: 3 } })
check('estudos: os estudos não entram no total da Biblioteca', items.some(i => /estudo|study/.test(i.type)), false)

// ── Privacidade e desempenho, na leitura dos dados ────────────────────
const api = ler('biblioteca/bibliotecaApi.js')
const imports = [...api.matchAll(/from '([^']+)'/g)].map(m => m[1])
check('a leitura não importa nada de oração', imports.filter(i => /prayer|pedidos|oracao/i.test(i)), [])
check('a leitura não importa nada de grupo, amigo ou comunidade', imports.filter(i => /groups|friends|comunidade|activity/i.test(i)), [])
check('a leitura não consulta tabela nenhuma por conta própria (só a linha da pessoa, pela RLS)', /supabase|\.from\(|\.rpc\(/.test(api), false)
check('a linha é lida uma vez só', (api.match(/fetchRow\(\)/g) ?? []).length, 1)
check('os dados passam por pickLibraryData antes de virar item', /pickLibraryData\(row\)/.test(api) && !/row\.(prayer|notes|highlights|sermon_notes)/.test(api), true)
const tela = ler('screens/BibliotecaScreen.jsx')
check('a raiz não cria, edita nem apaga nada', /save|update|delete|hide|archive/i.test(tela.replace(/\/\/.*$/gm, '')), false)

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
