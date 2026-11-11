// Testes da busca da aba Bíblia (handoff-biblia-52 §6), parte pura:
// o interpretador de referências, os textos, "onde você estava", as
// buscas recentes e as passagens com nome.
// node scripts/test-busca.mjs
import { readFileSync } from 'node:fs'
import { interpretReference, booksForToken, formatReference, openReferenceLabel, referencePreview, referenceKind, wholeChapterRow, bookDisplayName } from '../src/busca/referencia.js'
import { SEARCH_HINT, TYPE_FILTERS, REFERENCE_EXAMPLES, whenPhrase, whereYouWere, addRecentSearch, passageReference, passageStart, featuredPassages, bookRow } from '../src/busca/buscaMath.js'
import { computeBibleProgress } from '../src/gamification/bibleProgressMath.js'
import { MIN_QUERY_LENGTH, VERSES_PREVIEW, VERSES_PAGE, TESTAMENT_FILTERS, queryWords, buildMatcher, matchesText, highlightSegments, searchVerses, searchBooks, searchPassages, searchThemes, themeSub, searchNotes, searchCounts, filterPills, effectiveFilter, versesLabel, seeAllVersesLabel, themeRecentSub, emptyMessage } from '../src/busca/palavra.js'
import { normalizeForSearch } from '../src/bible/searchNormalize.js'
import { THEMES } from '../src/bible/themes.js'
import { NAMED_PASSAGES } from '../src/data/passagensComNome.js'
import { VERSES_PER_CHAPTER, verseCount } from '../src/data/versiculosPorCapitulo.js'
import { GAMIFICATION_BOOKS, bookInfo } from '../src/data/gamificationBlocks.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
// As leituras de um texto, por extenso; "livros: …" quando é só o livro.
const read = (text, lang) => {
  const r = interpretReference(text, { lang })
  if (!r) return null
  return r.type === 'book' ? `livros: ${r.books.join(', ')}` : r.readings.map(x => formatReference(x, lang))
}

// ── Tabela de capítulos e versículos ────────────────────────────────────
check('tabela: 66 livros, 1.189 capítulos', [Object.keys(VERSES_PER_CHAPTER).length, Object.values(VERSES_PER_CHAPTER).reduce((t, l) => t + l.length, 0)], [66, 1189])
check('tabela: os capítulos de cada livro batem com a estrutura do app', GAMIFICATION_BOOKS.filter(b => VERSES_PER_CHAPTER[b.nome]?.length !== b.capitulos).map(b => b.nome), [])
check('tabela: João 3 tem 36, Salmos 119 tem 176, Obadias 1 tem 21', [verseCount('João', 3), verseCount('Salmos', 119), verseCount('Obadias', 1)], [36, 176, 21])
check('tabela: capítulo ou livro que não existe = 0', [verseCount('João', 22), verseCount('Atlântida', 1)], [0, 0])
// A tabela é gerada do texto: confere com o índice de busca de cada versão.
for (const folder of ['pt-nvt', 'en-nlt']) {
  const entries = JSON.parse(readFileSync(new URL(`../public/bible-text/search-index/${folder}.json`, import.meta.url), 'utf8'))
  check(`tabela: nenhum versículo de ${folder} passa do que a tabela diz`, entries.filter(e => e.verse > verseCount(e.book, e.chapter)).length, 0)
}

// ── Interpretador: os casos pedidos ─────────────────────────────────────
check('"jo 3 16" → João 3:16, e também 1 João, Jó e Joel (Jonas 3 não tem 16)', read('jo 3 16'), ['João 3:16', '1 João 3:16', 'Jó 3:16', 'Joel 3:16'])
check('"jo 3:16"', read('jo 3:16'), ['João 3:16', '1 João 3:16', 'Jó 3:16', 'Joel 3:16'])
check('"joao 3.16" → João 3:16 (e 1 João, que começa igual)', read('joao 3.16'), ['João 3:16', '1 João 3:16'])
check('"João 3" → o capítulo; 2 João e 3 João não têm capítulo 3', read('João 3'), ['João 3', '1 João 3'])
check('"1co 13", "1 co 13", "i co 13" → 1 Coríntios 13', [read('1co 13'), read('1 co 13'), read('i co 13')], [['1 Coríntios 13'], ['1 Coríntios 13'], ['1 Coríntios 13']])
check('"salmo 23" → Salmos 23', read('salmo 23'), ['Salmos 23'])
check('"sl 23 4" → Salmos 23:4', read('sl 23 4'), ['Salmos 23:4'])
check('"rm 8:28-39" → intervalo de versículos', read('rm 8:28-39'), ['Romanos 8:28-39'])
check('"mt 5-7" → intervalo de capítulos', read('mt 5-7'), ['Mateus 5–7'])
check('"jo" (só o livro) → João, 1 João, Jó, Joel, Jonas, nesta ordem', read('jo'), 'livros: João, 1 João, Jó, Joel, Jonas')
check('"jo 3 99" não existe → sem cartão', read('jo 3 99'), null)
check('"ob 1 4" (livro de um capítulo) → Obadias 1:4', read('ob 1 4'), ['Obadias 1:4'])
check('"pastor" não é referência', read('pastor'), null)

// ── Interpretador: o resto do que ele aceita ────────────────────────────
check('nome inteiro com acento, maiúscula e número', [read('1 Coríntios 13'), read('ROMANOS 8'), read('Êxodo 20')], [['1 Coríntios 13'], ['Romanos 8'], ['Êxodo 20']])
check('"salmos 23" e "Salmo 23" dão no mesmo', [read('salmos 23'), read('Salmo 23')], [['Salmos 23'], ['Salmos 23']])
check('separador: dois-pontos, ponto, vírgula ou espaço', [read('gn 1:1'), read('gn 1.1'), read('gn 1,1'), read('gn 1 1')], [['Gênesis 1:1'], ['Gênesis 1:1'], ['Gênesis 1:1'], ['Gênesis 1:1']])
check('abreviação com ponto e pontuação sobrando', [read('gn. 1:1'), read('rm 8:28.'), read('  rm   8 : 28  ')], [['Gênesis 1:1'], ['Romanos 8:28'], ['Romanos 8:28']])
check('algarismo romano: "ii pe 1 3", "iii jo 4"', [read('ii pe 1 3'), read('iii jo 4')], [['2 Pedro 1:3'], ['3 João 1:4']])
check('"Jó 3:16" com acento é Jó primeiro; sem acento, a ordem fixa', [read('Jó 3:16'), read('jó 3 16'), read('jo 3 16')[0], read('Jó')], [['Jó 3:16', 'João 3:16', '1 João 3:16', 'Joel 3:16'], ['Jó 3:16', 'João 3:16', '1 João 3:16', 'Joel 3:16'], 'João 3:16', 'livros: Jó, João, 1 João, Joel, Jonas'])
check('"isaias" não é lido como "i saias"', read('isaias 53'), ['Isaías 53'])
check('intervalo de versículos com espaço e com meia-risca', [read('jo 3 16-18')[0], read('rm 8:28–39')], ['João 3:16-18', ['Romanos 8:28-39']])
check('intervalo que passa do fim do capítulo é cortado nele', read('rm 8:28-50'), ['Romanos 8:28-39'])
check('intervalo de capítulos que passa do fim do livro é cortado nele', read('mt 27-30'), ['Mateus 27–28'])
check('livro de um capítulo: o número sozinho é o versículo', [read('ob 4'), read('judas 5-7'), read('fm 1')], [['Obadias 1:4'], ['Judas 1:5-7'], ['Filemon 1']])
check('capítulo que não existe → nada', [read('ap 23'), read('jo 0'), read('gn 51')], [null, null, null])
check('versículo que não existe → nada', [read('sl 23 7'), read('ob 1 22')], [null, null])
check('sem número do livro: os dois entram ("cor 13", "samuel 3")', [read('cor 13'), read('samuel 3')], [['1 Coríntios 13', '2 Coríntios 13'], ['1 Samuel 3', '2 Samuel 3']])
check('exato antes de prefixo; prefixo em ordem canônica', booksForToken('joao'), ['João', '1 João', '2 João', '3 João'])
check('prefixo do nome ("gen", "apoc", "tess")', [booksForToken('gene'), booksForToken('apocal'), booksForToken('tess')], [['Gênesis'], ['Apocalipse'], ['1 Tessalonicenses', '2 Tessalonicenses']])
check('uma letra só não é livro; palavra comum não é livro', [booksForToken('j'), read('amor'), read('deus'), read('fe'), read('paz 3')], [[], null, null, null, null])
check('texto com outra coisa depois dos números não é referência', [read('jo 3 16 amor'), read('3 16'), read('')], [null, null, null])
check('conta em inglês: nomes e abreviações do inglês primeiro', [read('john 3 16', 'en'), read('jn 3 16', 'en'), read('ps 23', 'en'), read('rev 22', 'en')], [['John 3:16', '1 John 3:16'], ['John 3:16'], ['Psalms 23'], ['Revelation 22']])
check('conta em português também entende o inglês', read('john 3 16'), ['João 3:16', '1 João 3:16'])
check('"jn" em português é Jonas; como Jonas 3 não tem 16, sobra João (inglês)', [read('jn 3 16'), read('jn 3 5')], [['João 3:16'], ['Jonas 3:5', 'João 3:5']])

// ── Textos do cartão "Ir direto" ────────────────────────────────────────
const jo316 = interpretReference('jo 3 16').readings[0]
const rm8 = interpretReference('rm 8:28-39').readings[0]
const jo3 = interpretReference('João 3').readings[0]
const mt57 = interpretReference('mt 5-7').readings[0]
check('leitura: campos', jo316, { book: 'João', chapter: 3, verse: 16, verseEnd: null, chapterEnd: null })
check('botão: "Abrir João 3 no versículo 16" / "Abrir João 3"', [openReferenceLabel(jo316), openReferenceLabel(jo3), openReferenceLabel(rm8), openReferenceLabel(mt57)], ['Abrir João 3 no versículo 16', 'Abrir João 3', 'Abrir Romanos 8 no versículo 28', 'Abrir Mateus 5'])
check('texto do cartão: o versículo; num intervalo, os dois primeiros e "…"; só capítulo, o primeiro', [referencePreview(jo316), referencePreview(rm8), referencePreview(jo3), referencePreview(mt57)], [{ chapter: 3, verses: [16], ellipsis: false }, { chapter: 8, verses: [28, 29], ellipsis: true }, { chapter: 3, verses: [1], ellipsis: false }, { chapter: 5, verses: [1], ellipsis: false }])
check('intervalo de dois versículos: sem "…"', referencePreview(interpretReference('gl 5 22-23').readings[0]), { chapter: 5, verses: [22, 23], ellipsis: false })
check('o que era (buscas recentes)', [referenceKind(jo316), referenceKind(rm8), referenceKind(jo3), referenceKind(mt57)], ['Versículo', 'Trecho', 'Capítulo', 'Capítulos'])
check('"O capítulo inteiro": só quando há versículo', [wholeChapterRow(jo316), wholeChapterRow(jo3), wholeChapterRow(mt57)], [{ title: 'João 3', sub: '36 versículos' }, null, null])
check('nome do livro no idioma da conta', [bookDisplayName('João', 'en'), bookDisplayName('João'), formatReference(jo316, 'en'), openReferenceLabel(jo316, 'en')], ['John', 'João', 'John 3:16', 'Abrir John 3 no versículo 16'])

// ── Textos fixos ────────────────────────────────────────────────────────
check('texto de apoio do campo', SEARCH_HINT, 'Livro, referência, palavra ou tema')
check('filtros de tipo, na ordem', TYPE_FILTERS.map(f => f.label), ['Tudo', 'Livros', 'Versículos', 'Passagens', 'Temas', 'Minhas notas'])
check('os quatro exemplos, e todos são referências que existem', [REFERENCE_EXAMPLES, REFERENCE_EXAMPLES.map(e => read(e)?.[0])], [['jo 3 16', 'Salmo 23', '1co 13', 'rm 8:28-39'], ['João 3:16', 'Salmos 23', '1 Coríntios 13', 'Romanos 8:28-39']])

// ── Onde você estava ────────────────────────────────────────────────────
const agora = new Date(2026, 10, 11, 10, 0) // quarta, 11 de novembro, 10h
const em = (dias, hora) => new Date(2026, 10, 11 - dias, hora, 0).toISOString()
check('quando: hoje, ontem, dia da semana, e data de uma semana pra trás', [whenPhrase(em(0, 7), agora), whenPhrase(em(1, 21), agora), whenPhrase(em(4, 20), agora), whenPhrase(em(6, 15), agora), whenPhrase(em(7, 9), agora), whenPhrase(em(40, 9), agora)], ['hoje de manhã', 'ontem à noite', 'sábado à noite', 'quinta-feira à tarde', 'em 4 de novembro', 'em 2 de outubro'])
check('onde você estava: a sessão de hoje e a leitura livre', whereYouWere({ sessionTitle: 'Gênesis 41', free: { book: 'Salmos', chapter: 23, verse: 4, readAt: em(4, 20) }, now: agora }), [{ key: 'session', title: 'Gênesis 41', sub: 'Sessão de hoje · conta no plano' }, { key: 'free', title: 'Salmos 23, versículo 4', sub: 'Leitura livre · sábado à noite' }])
check('sem sessão hoje: só a leitura livre; versículo 1 não é dito', whereYouWere({ sessionTitle: null, free: { book: 'Salmos', chapter: 23, verse: 1, readAt: em(0, 8) }, now: agora }), [{ key: 'free', title: 'Salmos 23', sub: 'Leitura livre · hoje de manhã' }])
check('nada: o grupo some', whereYouWere({ sessionTitle: undefined, free: null, now: agora }), [])

// ── Buscas recentes ─────────────────────────────────────────────────────
let recentes = []
for (const item of [{ text: 'ansiedade', sub: 'Tema · 21 trechos' }, { text: 'Romanos 8', sub: 'Capítulo' }, { text: 'pastor', sub: '14 versículos' }]) recentes = addRecentSearch(recentes, item)
check('recentes: da mais nova para a mais antiga', recentes.map(r => [r.text, r.sub]), [['pastor', '14 versículos'], ['Romanos 8', 'Capítulo'], ['ansiedade', 'Tema · 21 trechos']])
check('a mesma busca de novo sobe, sem repetir (acento e caixa não contam)', addRecentSearch(recentes, { text: 'ANSIEDADE ', sub: 'Tema · 21 trechos' }).map(r => r.text), ['ANSIEDADE', 'pastor', 'Romanos 8'])
let seis = []
for (const t of ['um', 'dois', 'três', 'quatro', 'cinco', 'seis']) seis = addRecentSearch(seis, { text: t, sub: '' })
check('no máximo cinco', seis.map(r => r.text), ['seis', 'cinco', 'quatro', 'três', 'dois'])
check('texto vazio não entra', [addRecentSearch(recentes, { text: '  ' }).length, addRecentSearch(null, { text: '' })], [3, []])

// ── Passagens com nome ──────────────────────────────────────────────────
const porNome = nome => NAMED_PASSAGES.find(x => x.nome === nome)
check('passagens: referência por extenso', [passageReference(porNome('O Senhor é o meu pastor')), passageReference(porNome('O sermão do monte')), passageReference(porNome('O filho pródigo')), passageReference(porNome('O amor'))], ['Salmos 23', 'Mateus 5–7', 'Lucas 15:11-32', '1 Coríntios 13'])
check('passagem que atravessa capítulos com versículo', passageReference({ livro: 'Gênesis', capInicio: 1, versInicio: 1, capFim: 2, versFim: 3 }), 'Gênesis 1:1–2:3')
check('passagem de um versículo só', passageReference({ livro: 'João', capInicio: 3, versInicio: 16, capFim: 3, versFim: 16 }), 'João 3:16')
check('onde a passagem começa', [passageStart(porNome('O filho pródigo')), passageStart(porNome('O sermão do monte'))], [{ book: 'Lucas', chapter: 15, verse: 11 }, { book: 'Mateus', chapter: 5, verse: null }])
check('mais procuradas: as quatro do quadro, nesta ordem', featuredPassages(NAMED_PASSAGES).map(x => x.nome), ['O Senhor é o meu pastor', 'O sermão do monte', 'O filho pródigo', 'O amor'])
check('lista vazia: nenhuma em destaque', featuredPassages([]), [])
// Toda passagem da lista existe: livro, capítulos e versículos.
const invalidas = NAMED_PASSAGES.filter(x => {
  const info = bookInfo(x.livro)
  if (!info || x.capInicio < 1 || x.capFim > info.capitulos || x.capFim < x.capInicio) return true
  if ((x.versInicio == null) !== (x.versFim == null)) return true
  if (x.versInicio == null) return false
  if (x.versInicio < 1 || x.versInicio > verseCount(x.livro, x.capInicio) || x.versFim > verseCount(x.livro, x.capFim)) return true
  return x.capInicio === x.capFim && x.versFim < x.versInicio
})
check('passagens: todas existem no texto', invalidas.map(x => x.nome), [])
check('passagens: nome e palavras alternativas preenchidos, sem nome repetido', [NAMED_PASSAGES.filter(x => !x.nome || !x.palavras?.length).length, new Set(NAMED_PASSAGES.map(x => x.nome)).size === NAMED_PASSAGES.length], [0, true])
const ordem = NAMED_PASSAGES.map(x => bookInfo(x.livro).posicao * 1e6 + x.capInicio * 1e3 + (x.versInicio ?? 0))
check('passagens: em ordem canônica', ordem.every((v, i) => i === 0 || v >= ordem[i - 1]), true)

// ── Livros ──────────────────────────────────────────────────────────────
const lidos = new Set(['João:1', 'João:2', 'João:3', 'Obadias:1'])
const prog = computeBibleProgress(lidos)
check('linha de livro: bloco · capítulos · lidos', [bookRow('João', prog), bookRow('1 João', prog)], [{ book: 'João', title: 'João', sub: 'Evangelhos e Atos · 21 capítulos · 3 lidos' }, { book: '1 João', title: '1 João', sub: 'Gerais e Apocalipse · 5 capítulos · 0 lidos' }])
check('linha de livro: singular nos dois ("1 capítulo · 1 lido")', bookRow('Obadias', prog).sub, 'Profetas menores · 1 capítulo · 1 lido')
check('linha de livro: nome no idioma da conta', bookRow('João', prog, 'en').title, 'John')

// ── Busca por palavra: comparação ───────────────────────────────────────
check('palavras da busca: sem acento, sem caixa, sem pontuação', [queryWords('Não temerei, MAL!'), queryWords('  bem-aventurados '), queryWords('“pastor”'), queryWords('...')], [['nao', 'temerei', 'mal'], ['bem', 'aventurados'], ['pastor'], []])
check('começa a responder com 2 caracteres', [MIN_QUERY_LENGTH, buildMatcher('p'), buildMatcher(' , '), buildMatcher('pa')?.term, buildMatcher('a b')?.term], [2, null, null, 'pa', 'a b'])
const norma = t => normalizeForSearch(t)
const trechos = (busca, texto) => highlightSegments(texto, buildMatcher(busca).ranges(norma(texto))).filter(x => x.highlighted).map(x => x.text)
check('acha com acento e caixa diferentes, e realça o texto original', trechos('SENHOR e', 'O Senhor é o meu pastor'), ['Senhor é'])
check('todas as ocorrências', trechos('pastor', 'Eu sou o bom pastor. O bom pastor sacrifica sua vida pelas ovelhas.'), ['pastor', 'pastor'])
check('ocorrência dentro de outra palavra também conta', trechos('pastor', 'Os pastores voltaram; o Pastor também.'), ['pastor', 'Pastor'])
check('pontuação do texto entre as palavras da busca não atrapalha', [trechos('medo pois', 'não terei medo, pois tu estás ao meu lado'), trechos('bem aventurados', 'Bem-aventurados os pobres'), trechos('disse haja luz', 'Então Deus disse: “Haja luz”, e houve luz.')], [['medo, pois'], ['Bem-aventurados'], ['disse: “Haja luz']])
check('pontuação na busca não atrapalha', [trechos('medo, pois', 'não terei medo pois tu estás'), trechos('"Haja luz"', 'disse: “Haja luz”, e houve')], [['medo pois'], ['Haja luz']])
check('pedaços: antes, realce, depois — e o texto inteiro volta ao juntar', [highlightSegments('O Senhor é o meu pastor; de nada', buildMatcher('pastor').ranges(norma('O Senhor é o meu pastor; de nada'))), highlightSegments('abc', []).length], [[{ text: 'O Senhor é o meu ', highlighted: false }, { text: 'pastor', highlighted: true }, { text: '; de nada', highlighted: false }], 1])
check('texto que não tem o termo', [matchesText(buildMatcher('pastor'), 'O filho pródigo'), matchesText(buildMatcher('prodigo'), 'O filho pródigo'), matchesText(buildMatcher('pastor'), null)], [false, true, false])

// ── Versículos, no texto de verdade (NVT) ───────────────────────────────
const indice = JSON.parse(readFileSync(new URL('../public/bible-text/search-index/pt-nvt.json', import.meta.url), 'utf8')).map(e => ({ ...e, norm: norma(e.text) }))
const pastor = searchVerses(buildMatcher('pastor'), indice)
const posicao = e => bookInfo(e.book).posicao * 1e6 + e.chapter * 1e3 + e.verse
check('versículos: em ordem canônica', pastor.every((e, i) => i === 0 || posicao(e) > posicao(pastor[i - 1])), true)
check('versículos: todos têm o termo, e nenhum fica de fora', [pastor.every(e => e.norm.includes('pastor')), pastor.length === indice.filter(e => e.norm.includes('pastor')).length, pastor.length > VERSES_PREVIEW], [true, true, true])
check('versículos: Salmos 23:1 está lá, com o realce no lugar', trechos('pastor', pastor.find(e => e.book === 'Salmos' && e.chapter === 23 && e.verse === 1).text), ['pastor'])
const at = searchVerses(buildMatcher('pastor'), indice, 'at')
const nt = searchVerses(buildMatcher('pastor'), indice, 'nt')
check('filtro de testamento recalcula: Antigo + Novo = tudo, e não se misturam', [at.length + nt.length === pastor.length, at.every(e => bookInfo(e.book).posicao <= 39), nt.every(e => bookInfo(e.book).posicao >= 40), at.length > 0 && nt.length > 0], [true, true, true, true])
check('expressão com pontuação no meio: "bondade e amor" acha', searchVerses(buildMatcher('nao terei medo pois'), indice).map(e => `${e.book} ${e.chapter}:${e.verse}`).includes('Salmos 23:4'), true)
check('nada encontrado', searchVerses(buildMatcher('xyzzyplugh'), indice).length, 0)
check('quatro primeiros em "Tudo", páginas de 30 em "Versículos"', [VERSES_PREVIEW, VERSES_PAGE], [4, 30])

// ── Livros ──────────────────────────────────────────────────────────────
const todos = GAMIFICATION_BOOKS.map(b => b.nome)
const livros = (texto, testamento) => searchBooks(buildMatcher(texto), interpretReference(texto)?.books ?? [], todos, prog, 'pt', testamento).map(r => r.title)
check('livros: "joão" → João, 1 João, 2 João, 3 João', livros('joão'), ['João', '1 João', '2 João', '3 João'])
check('livros: termo no meio do nome ("cânticos"), e sem repetir', [livros('canticos'), livros('reis'), livros('pastor')], [['Cântico dos Cânticos'], ['1 Reis', '2 Reis'], []])
check('livros: filtro de testamento (os do interpretador primeiro, depois os que têm o termo no nome)', [livros('jo', 'at'), livros('jo', 'nt')], [['Jó', 'Joel', 'Jonas', 'Josué'], ['João', '1 João', '2 João', '3 João']])
check('livros: a linha traz bloco, capítulos e lidos', searchBooks(buildMatcher('joão'), ['João'], todos, prog)[0], { book: 'João', title: 'João', sub: 'Evangelhos e Atos · 21 capítulos · 3 lidos' })

// ── Passagens ───────────────────────────────────────────────────────────
const passagens = (texto, testamento) => searchPassages(buildMatcher(texto), NAMED_PASSAGES, 'pt', testamento).map(r => [r.title, r.sub])
check('passagens: pelo nome e pelas palavras alternativas', passagens('pastor'), [['O Senhor é o meu pastor', 'Salmos 23 · 6 versículos'], ['O bom pastor', 'João 10:1-18']])
check('passagens: palavra alternativa ("prodigo", "natal")', [passagens('prodigo'), passagens('natal')], [[['O filho pródigo', 'Lucas 15:11-32']], [['O nascimento de Jesus', 'Lucas 2:1-20']]])
check('passagens: filtro de testamento', [passagens('pastor', 'at').map(r => r[0]), passagens('pastor', 'nt').map(r => r[0])], [['O Senhor é o meu pastor'], ['O bom pastor']])
check('passagens: vários capítulos não dizem quantos versículos', passagens('sermão do monte'), [['O sermão do monte', 'Mateus 5–7']])
check('passagens: lista vazia não dá erro', searchPassages(buildMatcher('pastor'), []), [])

// ── Temas ───────────────────────────────────────────────────────────────
const temaPastor = THEMES.find(th => th.id === 'pastor')
check('tema: "{n} trechos · do Salmo 23 a Apocalipse 7"', themeSub(temaPastor), '5 trechos · do Salmo 23 a Apocalipse 7')
check('tema: singular, e Salmos no fim ("ao Salmo")', [themeSub({ passages: [{ book: 'João', chStart: 3 }] }), themeSub({ passages: [{ book: 'Gênesis', chStart: 1 }, { book: 'Salmos', chStart: 19 }] }), themeSub({ passages: [] })], ['1 trecho · de João 3 a João 3', '2 trechos · de Gênesis 1 ao Salmo 19', '0 trechos'])
check('temas: pelo título ou por palavra-chave', [searchThemes(buildMatcher('pastor'), THEMES).map(t => [t.id, t.title, t.count]), searchThemes(buildMatcher('ovelhas'), THEMES).map(t => t.id), searchThemes(buildMatcher('xyzzy'), THEMES)], [[['pastor', 'O bom pastor', 5]], ['pastor'], []])
check('temas: com filtro de testamento, fica o que tem trecho nele', [searchThemes(buildMatcher('pastor'), THEMES, 'pt', 'at').length, searchThemes(buildMatcher('pastor'), [{ id: 'x', title: 'Pastor', passages: [{ book: 'João', chStart: 10 }] }], 'pt', 'at').length], [1, 0])
check('tema para as buscas recentes', [themeRecentSub(21), themeRecentSub(1)], ['Tema · 21 trechos', 'Tema · 1 trecho'])

// ── Notas ───────────────────────────────────────────────────────────────
const minhas = {
  highlights: [
    { id: 'a', book: 'Salmos', chapter: 23, verses: [4], text: 'O pastor não tira o vale —\nanda comigo nele.', tags: ['Consolo'] },
    { id: 'b', book: 'João', chapter: 10, verses: [11, 12, 14], text: '', tags: ['Pastor', 'Medo'] },
    { id: 'c', book: 'Salmos', chapter: 23, verses: [1], text: 'pastor (apagada)', hidden: true },
    { id: 'd', book: 'Gênesis', chapter: 1, verses: [1], text: '', tags: [] },
  ],
  notes: { 'Ezequiel:34-34': { text: 'Deus mesmo é o pastor aqui.' }, 'Gênesis:1-2': 'nota antiga, só texto: pastor', 'reflection:2026-11-01': { text: 'pastor' }, 'application:pinned': { text: 'pastor' } },
}
const notas = searchNotes(buildMatcher('pastor'), minhas)
check('notas: no texto e nas etiquetas, em ordem canônica; apagadas e sem referência ficam de fora', notas.map(n => [n.title, n.sub]), [['Gênesis 1–2', '"nota antiga, só texto: pastor"'], ['Salmos 23:4', '"O pastor não tira o vale — anda comigo nele."'], ['Ezequiel 34', '"Deus mesmo é o pastor aqui."'], ['João 10:11–12, 14', 'Pastor · Medo']])
check('notas: para onde abrir — o versículo e a nota da marcação; a nota de capítulo abre o capítulo', notas.map(n => [n.book, n.chapter, n.verse, n.noteId]), [['Gênesis', 1, null, null], ['Salmos', 23, 4, 'a'], ['Ezequiel', 34, null, null], ['João', 10, 11, 'b']])
check('notas: só pela etiqueta', searchNotes(buildMatcher('consolo'), minhas).map(n => n.title), ['Salmos 23:4'])
check('notas: filtro de testamento e conta sem notas', [searchNotes(buildMatcher('pastor'), minhas, 'pt', 'nt').map(n => n.title), searchNotes(buildMatcher('pastor'), {}), searchNotes(buildMatcher('pastor'))], [['João 10:11–12, 14'], [], []])

// ── Contagens e filtros ─────────────────────────────────────────────────
const contagem = searchCounts({ books: [], verses: new Array(14), passages: [1, 2], themes: [1], notes: [1] })
check('contagens: "Tudo" é a soma', contagem, { all: 18, books: 0, verses: 14, passages: 2, themes: 1, notes: 1 })
check('pastilhas: só os tipos com resultado, na ordem, com o número', filterPills(contagem).map(p => `${p.label} ${p.count}`), ['Tudo 18', 'Versículos 14', 'Passagens 2', 'Temas 1', 'Notas 1'])
check('pastilhas: nada encontrado → só "Tudo 0"', filterPills(searchCounts({})).map(p => `${p.label} ${p.count}`), ['Tudo 0'])
check('filtro que vale: o escolhido se tem resultado, senão "Tudo"', [effectiveFilter('verses', contagem), effectiveFilter('books', contagem), effectiveFilter('all', contagem)], ['verses', 'all', 'all'])
check('filtro de testamento: três opções fixas', TESTAMENT_FILTERS.map(f => f.label), ['Toda a Bíblia', 'Antigo Testamento', 'Novo Testamento'])

// ── Textos ──────────────────────────────────────────────────────────────
check('"Ver os 14 versículos" e milhar com ponto', [seeAllVersesLabel(14), seeAllVersesLabel(1189)], ['Ver os 14 versículos', 'Ver os 1.189 versículos'])
check('"14 versículos" / "1 versículo"', [versesLabel(14), versesLabel(1), versesLabel(2500)], ['14 versículos', '1 versículo', '2.500 versículos'])
check('nada encontrado: o termo como foi digitado e a versão', emptyMessage('  Xyzzy ', 'NVT'), { title: 'Nada com "Xyzzy" na NVT.', sub: 'A busca é no texto desta versão. Tente outra palavra, ou procure por tema.' })
check('nada encontrado só por causa do filtro de testamento', [emptyMessage('pastor', 'NVT', 'at').title, emptyMessage('pastor', 'NVT', 'nt').title], ['Nada com "pastor" no Antigo Testamento.', 'Nada com "pastor" no Novo Testamento.'])

if (failures > 0) { console.error(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes da busca (parte pura) passaram.')
