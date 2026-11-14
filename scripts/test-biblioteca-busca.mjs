// Testes da busca da Biblioteca (handoff-biblioteca-55 §6), parte pura:
// os tipos de "Buscar em", os seletores de refinar e o que cada folha
// oferece, a combinação tipo + livro + período + pregador, as etiquetas e
// as buscas recentes.
// node scripts/test-biblioteca-busca.mjs
import { readFileSync } from 'node:fs'
import { libraryItems, libraryCounts, withReadings, chaptersByDay, studyItems, booksOf } from '../src/biblioteca/bibliotecaMath.js'
import {
  SEARCH_TYPES, searchTypeLabel, NO_REFINE, isRefined, PERIODS, periodRange, periodLabel, normalizePeriod, refineItems,
  bookOptions, preacherOptions, refineSelectors, tagCloud, TAG_CLOUD, typeNoun, recentSub, rememberLibrarySearch,
} from '../src/biblioteca/buscaDaBiblioteca.js'
import {
  stemWord, parseLibraryQuery, matchText, itemRefs, matchesReference, matchItem, excerptSegments, fullSegments, resultRow,
  isSearching, searchLibrary, withoutFilters, foundCounts, GROUP_PREVIEW, ownReflectionText,
} from '../src/biblioteca/resultadosDaBusca.js'
import { PAGE_SIZE } from '../src/biblioteca/tiposMath.js'
import { normalizeForSearch } from '../src/bible/searchNormalize.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')

// Uma terça, 10 de novembro de 2026.
const agora = new Date(2026, 10, 10, 10, 0)
const ha = (dias, hora = 9) => new Date(2026, 10, 10 - dias, hora, 0).toISOString()
const dia = dias => { const d = new Date(2026, 10, 10 - dias); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const hl = (id, book, chapter, verses, dias, extra = {}) => ({ id, book, bookEn: book, chapter, verses, text: '', createdAt: ha(dias), ...extra })
const pregacao = (id, dias, preacher, passages = [], extra = {}) => ({ id, date: dia(dias), createdAt: ha(dias, 10), noteType: 'sermon', title: `Anotação ${id}`, preacher, church: '', passages, text: 'texto', finalizedAt: ha(dias), ...extra })

const items = libraryItems({
  highlights: [
    hl('m1', 'Gênesis', 39, [21], 1, { tags: ['espera'] }),
    hl('m2', 'Gênesis', 41, [51], 3, { text: 'nota', tags: ['espera', 'família'] }),
    hl('m3', 'Salmos', 23, [4], 9, { tags: ['Espera'] }),
    hl('n1', 'João', 16, [33], 40, { kind: 'note', text: 'nota de versículo', tags: ['família', 'família', ' '] }),
    hl('n2', 'Gênesis', 1, [1], 400, { kind: 'note', text: 'do ano passado', tags: ['espera'] }),
  ],
  notes: {
    [`reflection:${dia(0)}`]: { text: 'Reflexão de hoje.', updatedAt: ha(0, 7) },
    [`application:${dia(8)}`]: { text: 'Frase.', updatedAt: ha(8) },
    'Rute:reflection': { text: 'Fim de Rute.', updatedAt: ha(2) },
  },
  sermonNotes: [
    pregacao('s1', 2, 'Pr. João Silva', [{ book: 'Gênesis', chapter: 39, verseStart: 21, verseEnd: 21 }, { book: 'Romanos', chapter: 8, verseStart: 28, verseEnd: 28 }], { tags: ['espera'] }),
    pregacao('s2', 30, 'pr. joão silva'),
    pregacao('s3', 50, 'Tim Keller', [{ book: 'Salmos', chapter: 13, verseStart: null }]),
    pregacao('s4', 60, ''),
  ],
  questions: [{ book: 'Gênesis', chapter: 41, verseStart: 1, verseEnd: 1, question: 'Por quê?', answer: { outcome: 'answer', reply: 'r' }, createdAt: ha(12) }],
})
const ids = list => list.map(i => i.id ?? i.noteKey ?? i.key)

// ── Buscar em ─────────────────────────────────────────────────────────
check('os tipos de "Buscar em", na ordem', SEARCH_TYPES.map(t => t.label), ['Tudo', 'Notas', 'Marcações', 'Reflexões', 'Pregações', 'Aplicações', 'Perguntas', 'Estudos'])
check('rótulo de um tipo (desconhecido cai em Tudo)', [searchTypeLabel('pregacao'), searchTypeLabel('estudo'), searchTypeLabel('x')], ['Pregações', 'Estudos', 'Tudo'])

// ── Período ───────────────────────────────────────────────────────────
check('as opções de período', PERIODS.map(p => p.label), ['Sempre', 'Esta semana', 'Este mês', 'Este ano', 'De… até…'])
check('sempre: sem intervalo', periodRange({ key: 'always' }, agora), null)
check('esta semana: de segunda até hoje', periodRange({ key: 'week' }, agora), { from: '2026-11-09', to: '2026-11-10' })
check('esta semana, num domingo: a semana que começou na segunda', periodRange({ key: 'week' }, new Date(2026, 10, 8, 10)), { from: '2026-11-02', to: '2026-11-08' })
check('este mês e este ano', [periodRange({ key: 'month' }, agora), periodRange({ key: 'year' }, agora)], [{ from: '2026-11-01', to: '2026-11-10' }, { from: '2026-01-01', to: '2026-11-10' }])
check('de… até…: as duas datas, uma só, e trocadas', [periodRange({ key: 'custom', from: '2026-11-03', to: '2026-11-10' }), periodRange({ key: 'custom', from: '2026-11-03' }), periodRange({ key: 'custom', from: '2026-11-10', to: '2026-11-03' })], [{ from: '2026-11-03', to: '2026-11-10' }, { from: '2026-11-03', to: null }, { from: '2026-11-03', to: '2026-11-10' }])
check('de… até… sem data nenhuma é "Sempre"', [periodRange({ key: 'custom', from: '', to: '' }), normalizePeriod({ key: 'custom', from: '', to: '' }), periodLabel({ key: 'custom' })], [null, { key: 'always' }, 'Sempre'])
check('o que o seletor de período mostra', [{ key: 'always' }, { key: 'month' }, { key: 'custom', from: '2026-11-03', to: '2026-11-10' }, { key: 'custom', from: '2026-11-03' }, { key: 'custom', to: '2026-11-10' }].map(periodLabel), ['Sempre', 'Este mês', '3 nov – 10 nov', 'desde 3 nov', 'até 10 nov'])

// ── Combinação tipo + livro + período + pregador ──────────────────────
check('sem refinar, tudo', refineItems(items, {}, agora).length, items.length)
check('nada refinado / algo refinado', [isRefined(NO_REFINE), isRefined({ ...NO_REFINE, book: 'Gênesis' }), isRefined({ ...NO_REFINE, period: { key: 'week' } }), isRefined({ ...NO_REFINE, preacher: 'x' })], [false, true, true, true])
check('por tipo', ids(refineItems(items, { type: 'marcacao' }, agora)), ['m1', 'm2', 'm3'])
check('por livro: o que está ligado ao livro (a pregação, por uma passagem; a pergunta, pelo versículo)', refineItems(items, { book: 'Gênesis' }, agora).map(i => i.type).sort(), ['marcacao', 'marcacao', 'nota', 'pergunta', 'pregacao'])
check('por livro: Romanos só vem pela passagem da pregação', ids(refineItems(items, { book: 'Romanos' }, agora)), ['s1'])
check('por livro: fim de livro conta para o livro', ids(refineItems(items, { book: 'Rute' }, agora)), ['Rute:reflection'])
check('por período: esta semana', ids(refineItems(items, { period: { key: 'week' } }, agora)).sort(), ['m1', `reflection:${dia(0)}`].sort())
check('por período: este ano deixa de fora o ano passado', refineItems(items, { period: { key: 'year' } }, agora).some(i => i.id === 'n2'), false)
check('por período: de… até…', ids(refineItems(items, { period: { key: 'custom', from: dia(9), to: dia(2) } }, agora)).sort(), ['m2', 'm3', 's1', `application:${dia(8)}`, 'Rute:reflection'].sort())
check('por pregador: só as pregações dele (o mesmo nome em outra caixa conta)', ids(refineItems(items, { preacher: 'Pr. João Silva' }, agora)), ['s1', 's2'])
check('tipo + livro', ids(refineItems(items, { type: 'marcacao', book: 'Gênesis' }, agora)), ['m1', 'm2'])
check('tipo + livro + período', ids(refineItems(items, { type: 'marcacao', book: 'Gênesis', period: { key: 'week' } }, agora)), ['m1'])
check('livro + pregador + período', ids(refineItems(items, { book: 'Gênesis', preacher: 'Pr. João Silva', period: { key: 'month' } }, agora)), ['s1'])
check('combinação sem nada', refineItems(items, { type: 'nota', preacher: 'Tim Keller' }, agora), [])
check('refinar nunca traz item de fora', refineItems(items, { book: 'Gênesis' }, agora).every(i => items.includes(i)), true)

// ── As folhas ─────────────────────────────────────────────────────────
const livros = bookOptions(items)
check('folha de livro: só os livros em que há algo, por bloco, na ordem da Bíblia', livros.map(b => `${b.name}: ${b.books.map(x => `${x.label} ${x.count}`).join(', ')}`), ['Lei: Gênesis 5', 'Históricos: Rute 1', 'Poéticos: Salmos 2', 'Evangelhos e Atos: João 1', 'Cartas de Paulo: Romanos 1'])
check('folha de livro: as contagens batem com o filtro de livro', livros.flatMap(b => b.books).every(x => Number(x.count) === refineItems(items, { book: x.book }, agora).length), true)
check('folha de livro vazia para conta nova', bookOptions([]), [])
const pregadores = preacherOptions(items)
check('folha de pregador: do que tem mais para o que tem menos', pregadores.map(p => `${p.label} ${p.count}`), ['Pr. João Silva 2', 'Tim Keller 1'])
check('folha de pregador: as contagens batem com o filtro de pregador', pregadores.every(p => Number(p.count) === refineItems(items, { preacher: p.label }, agora).length), true)
check('seletores no padrão', refineSelectors(NO_REFINE, items).map(s => `${s.label}=${s.value}|${s.applied}|${s.aria}`), ['Livro=Qualquer|false|Livro: Qualquer', 'Período=Sempre|false|Período: Sempre', 'Pregador=Qualquer|false|Pregador: Qualquer'])
check('seletor com valor fica aplicado e anuncia o valor', refineSelectors({ book: 'Gênesis', period: { key: 'month' }, preacher: 'Tim Keller' }, items).map(s => `${s.aria}|${s.applied}`), ['Livro: Gênesis|true', 'Período: Este mês|true', 'Pregador: Tim Keller|true'])
check('sem pregações, o seletor de pregador não existe', refineSelectors(NO_REFINE, items.filter(i => i.type !== 'pregacao')).map(s => s.key), ['book', 'period'])
check('de… até… vazio não conta como aplicado', refineSelectors({ ...NO_REFINE, period: { key: 'custom' } }, items)[1].applied, false)

// ── Etiquetas ─────────────────────────────────────────────────────────
check('etiquetas: as mais usadas, com contagem (repetida no mesmo item conta uma vez; vazia não conta)', tagCloud(items).map(t => `${t.label} ${t.count}`), ['# espera 4', '# família 2', '# Espera 1'])
check('etiquetas: no máximo oito', [TAG_CLOUD, tagCloud(Array.from({ length: 12 }, (_, i) => ({ tags: [`t${i}`] }))).length], [8, 8])
check('etiquetas: sem nenhuma, lista vazia (o grupo não aparece)', tagCloud(items.map(i => ({ ...i, tags: [] }))), [])

// ── Buscas recentes ───────────────────────────────────────────────────
check('onde achou: um tipo só', [recentSub({ pregacao: 6 }), recentSub({ pregacao: 1 }), recentSub({ estudo: 2 })], ['6 pregações', '1 pregação', '2 estudos'])
check('onde achou: dois tipos', recentSub({ nota: 3, marcacao: 1 }), '4 anotações · notas e marcações')
check('onde achou: três ou mais', recentSub({ nota: 2, marcacao: 5, reflexao: 7, pregacao: 3, aplicacao: 1 }), '18 anotações · em tudo')
check('onde achou: nada', recentSub({}), 'nada encontrado')
check('plural do tipo', [typeNoun('reflexao', 1), typeNoun('reflexao', 7), typeNoun('marcacao', 5)], ['reflexão', 'reflexões', 'marcações'])
const lista = rememberLibrarySearch(rememberLibrarySearch([], { text: 'espera', counts: { nota: 2, marcacao: 5, reflexao: 11 } }), { text: ' Gênesis 39 ', counts: { nota: 2, marcacao: 2 } })
check('recentes: a mais nova em cima, com onde achou', lista, [{ text: 'Gênesis 39', sub: '4 anotações · notas e marcações' }, { text: 'espera', sub: '18 anotações · em tudo' }])
check('recentes: a mesma busca (sem contar acento e caixa) sobe em vez de repetir', rememberLibrarySearch(lista, { text: 'ESPERA', counts: { pregacao: 1 } }).map(r => r.text), ['ESPERA', 'Gênesis 39'])
check('recentes: no máximo cinco', ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'].reduce((l, text) => rememberLibrarySearch(l, { text, counts: {} }), []).length, 5)

// ═══ Os resultados (L5) ═══════════════════════════════════════════════
const norm = w => normalizeForSearch(w)
const mesmoRadical = (...words) => new Set(words.map(w => stemWord(norm(w)))).size === 1

// ── Variações da palavra ──────────────────────────────────────────────
check('radical: as formas de "esperar" são a mesma palavra', mesmoRadical('espera', 'espero', 'esperar', 'esperamos', 'esperando', 'esperou', 'esperei', 'esperava', 'esperam', 'esperas'), true)
check('radical: "esperança" e "esperto" são outras palavras', [stemWord('esperanca') === stemWord('espera'), stemWord('esperto') === stemWord('espera')], [false, false])
check('radical: plurais', [mesmoRadical('oração', 'orações'), mesmoRadical('fiel', 'fiéis'), mesmoRadical('mulher', 'mulheres'), mesmoRadical('medo', 'medos'), mesmoRadical('prisão', 'prisões'), mesmoRadical('promessa', 'promessas'), mesmoRadical('pai', 'pais')], [true, true, true, true, true, true, true])
check('radical: verbos', [mesmoRadical('caminho', 'caminhos', 'caminhar', 'caminhando'), mesmoRadical('sofrimento', 'sofrer', 'sofreu')], [true, true])
check('radical: palavra curta fica como está ("Deus" não vira "deu")', [stemWord('deus'), stemWord('deu'), stemWord('luz'), stemWord('fe')], ['deus', 'deu', 'luz', 'fe'])
check('radical: número não muda', stemWord('2026'), '2026')

// ── O que foi digitado ────────────────────────────────────────────────
check('menos de 2 caracteres: nada a procurar', [parseLibraryQuery(''), parseLibraryQuery(' e '), parseLibraryQuery('"')], [null, null, null])
check('palavras: sem acento, sem caixa, sem pontuação', parseLibraryQuery('  Não, TEMEREI! ').words.map(w => w.word), ['nao', 'temerei'])
check('expressão entre aspas (retas ou curvas) e palavras soltas', [parseLibraryQuery('espera "tempo dele"').phrases, parseLibraryQuery('espera "tempo dele"').words.map(w => w.word), parseLibraryQuery('“fiel bondade”').phrases], [[['tempo', 'dele']], ['espera'], [['fiel', 'bondade']]])
check('o termo guardado é o texto como foi digitado, sem sobras de espaço', parseLibraryQuery('  espera   em Deus ').term, 'espera em Deus')
check('referência: capítulo', parseLibraryQuery('gn 39').reference, [{ book: 'Gênesis', chapter: 39, verse: null, verseEnd: null, chapterEnd: null }])
check('referência: versículo', parseLibraryQuery('jo 3 16').reference, [{ book: 'João', chapter: 3, verse: 16, verseEnd: null, chapterEnd: null }])
check('referência: só o livro', parseLibraryQuery('Salmos').reference, [{ book: 'Salmos', chapter: null, verse: null, verseEnd: null, chapterEnd: null }])
check('palavra comum não é referência; entre aspas também não', [parseLibraryQuery('espera').reference, parseLibraryQuery('"gn 39"').reference], [null, null])

// ── Onde bate ─────────────────────────────────────────────────────────
const q = text => parseLibraryQuery(text)
const trecho = (text, query) => { const m = matchText(text, q(query)); return m.ranges.map(([i, n]) => text.slice(i, i + n)) }
check('acha a palavra e as variações, realçando a palavra inteira', trecho('Hoje eu espero; ontem esperamos, e a espera continua.', 'espera'), ['espero', 'esperamos', 'espera'])
check('ignora acento e caixa, e o realce cai no texto de verdade', trecho('Não temerei: TU ESTÁS comigo.', 'estas'), ['ESTÁS'])
check('enquanto se digita: o começo da palavra já acha', trecho('A esperança não decepciona; a espera cansa.', 'esp'), ['esperança', 'espera'])
check('não acha no meio da palavra', trecho('amedrontado', 'medo'), [])
check('"Deus" não acha "deu"', trecho('Ele deu a vida. Deus é fiel.', 'deus'), ['Deus'])
check('várias palavras: realça todas as ocorrências de cada uma', trecho('Deus é fiel. A espera em Deus não é em vão.', 'deus espera'), ['Deus', 'espera', 'Deus'])
check('expressão exata: só a sequência, com a pontuação que houver no meio', [trecho('Ele age no tempo dele; no tempo, dele.', '"tempo dele"'), trecho('o tempo é dele', '"tempo dele"')], [['tempo dele', 'tempo, dele'], []])
check('expressão exata não aceita variação nem pedaço de palavra', [trecho('os tempos dele', '"tempo dele"'), trecho('contratempo dele', '"tempo dele"')], [[], []])
check('expressão e palavra juntas não se sobrepõem no realce', trecho('a espera no tempo dele', 'tempo "tempo dele"'), ['tempo dele'])

// ── Referências dos itens ─────────────────────────────────────────────
const lidos = chaptersByDay([{ livro: 'Gênesis', capitulo: 41, created_at: ha(0, 6) }, { livro: 'Gênesis', capitulo: 39, created_at: ha(8, 6) }])
const estudos = studyItems({ ai: [{ id: 'e1', title: 'A espera em Filipenses', createdAt: ha(5), sessions: [{ id: 1, book: 'Filipenses', completedAt: ha(4) }, { id: 2, book: 'Filipenses' }, { id: 3, book: 'Filipenses' }] }, { id: 'e2', title: 'Rute', createdAt: ha(90), sessions: [{ id: 1, book: 'Rute', completedAt: ha(80) }] }] })
const base = withReadings(libraryItems({
  highlights: [
    hl('m1', 'Gênesis', 39, [21], 1, { tags: ['espera'] }),
    hl('m2', 'Gênesis', 41, [51], 3, { text: 'a espera tinha companhia' }),
    hl('m3', 'Salmos', 23, [4], 9),
    hl('m4', 'Gênesis', 39, [2, 3], 20),
    hl('n1', 'João', 3, [16], 40, { kind: 'note', text: 'Deus amou primeiro.', tags: ['amor'] }),
    hl('n2', 'Gênesis', 40, [23], 11, { kind: 'note', text: 'Esquecido pelo copeiro, não por Deus. A espera continua.' }),
  ],
  notes: {
    [`reflection:${dia(0)}`]: { text: 'O que a espera de José mostra?\nDeus não desperdiça o tempo.\n\nE você?\nEu espero sem cobrar.', updatedAt: ha(0, 7) },
    [`reflection:${dia(30)}`]: { text: 'Folha livre: esperar cansa.', updatedAt: ha(30, 7) },
    [`application:${dia(8)}`]: { text: 'Hoje eu espero sem cobrar resposta.', updatedAt: ha(8), fulfilled: true },
    'Gênesis:39-40': { text: 'Nota da sessão de leitura.', updatedAt: ha(12) },
    'Rute:reflection': { text: 'Fim de Rute.', updatedAt: ha(2) },
  },
  sermonNotes: [
    pregacao('s1', 2, 'Pr. João Silva', [{ book: 'Gênesis', chapter: 39, verseStart: 21, verseEnd: 23 }, { book: 'Romanos', chapter: 8, verseStart: 28, verseEnd: 28 }], { title: 'A fidelidade que não se explica', church: 'Igreja Batista Central', text: 'Deus é fiel mesmo quando não entendemos o caminho. Três pontos: Ele vê, Ele lembra, Ele age no tempo dele; a espera é parte da resposta.', tags: ['fidelidade'] }),
    pregacao('s2', 30, 'Tim Keller', [{ book: 'Salmos', chapter: 13, verseStart: null }], { title: 'Quando Deus demora', noteType: 'video', text: 'A demora não é ausência.' }),
  ],
  questions: [{ book: 'Gênesis', chapter: 41, verseStart: 1, verseEnd: 1, question: 'Por que dois anos de espera?', answer: { outcome: 'answer', reply: 'O texto só marca o tempo.' }, createdAt: ha(12) }],
}), lidos)
const tudo = [...base, ...estudos]
const versos = { 'marcacao:m1': 'O Senhor estava com José e lhe mostrou sua fiel bondade.', 'marcacao:m3': 'Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum.' }
const item = key => tudo.find(i => i.key === key || i.id === key || i.noteKey === key)
const ctx = { verseTexts: versos, readByDay: lidos, now: agora }
check('a reflexão e a frase do dia ficam ligadas ao que foi lido naquele dia', [booksOf(item(`reflection:${dia(0)}`)), booksOf(item(`application:${dia(8)}`)), booksOf(item(`reflection:${dia(30)}`))], [['Gênesis'], ['Gênesis'], []])
check('referências de um item: versículos, sessão, pregação, pergunta, reflexão do dia, estudo', [itemRefs(item('m4')), itemRefs(item('Gênesis:39-40')), itemRefs(item('s1')).length, itemRefs(item('s2')), itemRefs(item(`reflection:${dia(0)}`)), itemRefs(item('e1'))], [
  [{ book: 'Gênesis', chStart: 39, chEnd: 39, vStart: 2, vEnd: 3 }], [{ book: 'Gênesis', chStart: 39, chEnd: 40, vStart: null, vEnd: null }], 2,
  [{ book: 'Salmos', chStart: 13, chEnd: 13, vStart: null, vEnd: null }], [{ book: 'Gênesis', chStart: 41, chEnd: 41, vStart: null, vEnd: null }], [{ book: 'Filipenses', chStart: null, chEnd: null, vStart: null, vEnd: null }],
])
const ligados = text => tudo.filter(i => matchesReference(i, q(text).reference)).map(i => i.id ?? i.noteKey ?? i.key).sort()
check('referência de capítulo: tudo o que toca Gênesis 39', ligados('gn 39'), ['m1', 'm4', 's1', 'Gênesis:39-40', `application:${dia(8)}`].sort())
check('referência de versículo: só o que cruza com ele (o capítulo inteiro não entra)', ligados('gn 39 21'), ['m1', 's1'])
check('referência de intervalo', ligados('gn 39:1-3'), ['m4'])
check('referência de livro: tudo do livro', ligados('salmos'), ['m3', 's2'])
check('referência de livro: o estudo entra pelo livro', ligados('filipenses'), ['e1'])

// ── Um item contra a busca ────────────────────────────────────────────
const bate = (key, text) => !!matchItem(item(key), q(text), ctx)
check('acha no texto da nota', bate('n2', 'copeiro'), true)
check('acha no trecho bíblico da marcação', bate('m1', 'bondade'), true)
check('acha na nota da marcação', bate('m2', 'companhia'), true)
check('acha pela etiqueta — e a etiqueta não vai no trecho mostrado', [bate('m1', 'espera'), matchItem(item('m1'), q('espera'), ctx).ranges], [true, {}])
check('acha no título, no pregador, na instituição e no tipo da pregação', [bate('s1', 'fidelidade explica'), bate('s1', 'joão silva'), bate('s1', 'batista'), bate('s2', 'vídeo'), bate('s2', 'keller')], [true, true, true, true, true])
check('acha pela referência escrita na pregação', bate('s1', 'romanos'), true)
check('acha no nome do estudo', bate('e1', 'filipenses'), true)
check('várias palavras: todas precisam aparecer (em qualquer campo)', [bate('s1', 'fiel batista'), bate('s1', 'fiel inexistente')], [true, false])
check('a pergunta gerada da reflexão não conta: só as respostas da pessoa', [ownReflectionText(item(`reflection:${dia(0)}`)), bate(`reflection:${dia(0)}`, 'josé'), bate(`reflection:${dia(0)}`, 'desperdiça')], ['Deus não desperdiça o tempo.\n\nEu espero sem cobrar.', false, true])
check('a pergunta guardada e a resposta dela contam', [bate(item('pergunta:Gênesis:41:1-1:' + ha(12)).key, 'dois anos'), bate(item('pergunta:Gênesis:41:1-1:' + ha(12)).key, 'marca')], [true, true])
check('a oração nunca é achada (não é item)', tudo.some(i => /prayer|oracao|pedido/i.test(i.type)), false)

// ── O trecho mostrado ─────────────────────────────────────────────────
const junta = segs => segs.map(sg => (sg.highlighted ? `[${sg.text}]` : sg.text)).join('')
check('trecho: recorta numa pausa antes da palavra, com reticências', junta(excerptSegments(item('s1').text, q('espera'))), '…Ele age no tempo dele; a [espera] é parte da resposta.')
check('trecho: palavra perto do começo não recorta', junta(excerptSegments('A espera continua.', q('espera'))), 'A [espera] continua.')
check('trecho: sem busca, o começo do texto, sem realce', junta(excerptSegments('Um texto qualquer.', null)), 'Um texto qualquer.')
check('trecho: texto longo termina em reticências', junta(excerptSegments(`espera ${'palavra '.repeat(40)}`, q('espera'))).endsWith('…'), true)
check('texto inteiro com todas as ocorrências', junta(fullSegments('Hoje eu espero; amanhã esperamos.', q('espera'))), 'Hoje eu [espero]; amanhã [esperamos].')

// ── As linhas ─────────────────────────────────────────────────────────
const linha = (key, text) => resultRow(item(key), text ? q(text) : null, ctx)
check('linha de nota: referência, quando e o trecho realçado', [linha('n2', 'espera').title, linha('n2', 'espera').when, junta(linha('n2', 'espera').excerpt)], ['Gênesis 40:23', '30 out', 'Esquecido pelo copeiro, não por Deus. A [espera] continua.'])
check('linha de reflexão: o título e a resposta (sem a pergunta)', [linha(`reflection:${dia(0)}`, 'espera').title, linha(`reflection:${dia(0)}`, 'espera').when, junta(linha(`reflection:${dia(0)}`, 'espera').excerpt)], ['Gênesis 41', 'hoje', 'Deus não desperdiça o tempo. Eu [espero] sem cobrar.'])
check('linha de pregação: a data curta e o trecho começa com o pregador', [linha('s1', 'espera').title, linha('s1', 'espera').when, junta(linha('s1', 'espera').excerpt)], ['A fidelidade que não se explica', '8 nov', 'Pr. João Silva · "…Ele age no tempo dele; a [espera] é parte da resposta."'])
check('linha de pregação achada pelo pregador: o nome vem realçado', junta(linha('s2', 'keller').excerpt), 'Tim [Keller] · "A demora não é ausência."')
check('linha de marcação: o trecho, a referência e "Com nota: …", com o realce onde a palavra estiver', [junta(linha('m2', 'espera').note), linha('m2', 'espera').reference, linha('m2', 'espera').quote, junta(linha('m1', 'bondade').quote), linha('m1', 'bondade').note], ['Com nota: "a [espera] tinha companhia"', 'Gênesis 41:51', null, '"O Senhor estava com José e lhe mostrou sua fiel [bondade]."', null])
check('linha de aplicação: a frase com o realce e a linha de baixo', [junta(linha(`application:${dia(8)}`, 'espera').quote), linha(`application:${dia(8)}`, 'espera').meta], ['"Hoje eu [espero] sem cobrar resposta."', 'Frase do dia · 2 nov · cumprida'])
check('linha de pergunta: a pergunta é o título, o trecho é a resposta', [linha(item('pergunta:Gênesis:41:1-1:' + ha(12)).key, 'tempo').title, junta(linha(item('pergunta:Gênesis:41:1-1:' + ha(12)).key, 'tempo').excerpt)], ['Por que dois anos de espera?', 'O texto só marca o [tempo].'])
check('linha de estudo: o nome e "dia x de y"; concluído', [linha('e1').title, linha('e1').sub, linha('e2').sub], ['A espera em Filipenses', 'dia 2 de 3', 'concluído · 1 dia'])

// ── A busca inteira ───────────────────────────────────────────────────
const busca = (search, extra = {}) => searchLibrary({ items: tudo, search: { query: '', type: 'all', ...NO_REFINE, ...search }, ...ctx, ...extra })
check('a tela está em resultados com texto, com refinamento ou com "Ver tudo"; só o tipo escolhido não basta', [isSearching({ query: 'es', ...NO_REFINE }), isSearching({ query: 'e', ...NO_REFINE }), isSearching({ query: '', ...NO_REFINE, book: 'Gênesis' }), isSearching({ query: '', ...NO_REFINE, browse: true }), isSearching({ query: '', type: 'nota', ...NO_REFINE })], [true, false, true, true, false])
const espera = busca({ query: 'espera' })
check('contagens por tipo', espera.counts, { all: 9, nota: 1, marcacao: 2, reflexao: 2, pregacao: 1, aplicacao: 1, pergunta: 1, estudo: 1 })
check('"Tudo" é a soma dos tipos', espera.counts.all, Object.entries(espera.counts).filter(([k]) => k !== 'all').reduce((n, [, v]) => n + v, 0))
check('pastilhas: "Tudo {total}" e só os tipos com resultado, do que tem mais para o que tem menos (no empate, a ordem de sempre)', espera.pills.map(p => `${p.label} ${p.count}`), ['Tudo 9', 'Marcações 2', 'Reflexões 2', 'Notas 1', 'Pregações 1', 'Aplicações 1', 'Perguntas 1', 'Estudos 1'])
check('grupos na ordem das pastilhas, só os que têm resultado', espera.groups.map(g => g.label), espera.pills.slice(1).map(p => p.label))
check('as contagens dos grupos são as das pastilhas', espera.groups.map(g => g.count), espera.pills.slice(1).map(p => p.count))
check('em "Tudo", os dois mais recentes por grupo', [GROUP_PREVIEW, espera.groups.every(g => g.rows.length <= 2), espera.groups.find(g => g.type === 'marcacao').rows.map(r => r.item.id)], [2, true, ['m1', 'm2']])
check('"Ver as N" só quando há mais de dois', espera.groups.map(g => g.more), [null, null, null, null, null, null, null])
const muitas = searchLibrary({ items: libraryItems({ notes: Object.fromEntries(Array.from({ length: 75 }, (_, i) => [`reflection:${dia(i)}`, { text: `Eu espero no dia ${i}.`, updatedAt: ha(i, 7) }])) }), search: { query: 'espera', type: 'all', ...NO_REFINE }, now: agora })
check('"Ver as 75 reflexões" em "Tudo"', [muitas.groups[0].more, muitas.groups[0].rows.length], ['Ver as 75 reflexões', 2])
const pagina = pages => searchLibrary({ items: libraryItems({ notes: Object.fromEntries(Array.from({ length: 75 }, (_, i) => [`reflection:${dia(i)}`, { text: `Eu espero no dia ${i}.`, updatedAt: ha(i, 7) }])) }), search: { query: 'espera', type: 'reflexao', ...NO_REFINE }, now: agora, pages }).groups[0]
check('com um tipo ativo: todos, em páginas de 30', [PAGE_SIZE, pagina(1).rows.length, pagina(1).hasMore, pagina(1).more, pagina(2).rows.length, pagina(3).rows.length, pagina(3).hasMore], [30, 30, true, null, 60, 75, false])
check('com um tipo ativo: só o grupo dele, e as pastilhas seguem com as contagens de todos', [busca({ query: 'espera', type: 'marcacao' }).groups.map(g => g.type), busca({ query: 'espera', type: 'marcacao' }).pills.map(p => p.count)], [['marcacao'], espera.pills.map(p => p.count)])
check('tipo escolhido sem resultado volta para "Tudo"', busca({ query: 'copeiro', type: 'pregacao' }).active, 'all')
check('texto + livro: as contagens já contam o refinamento', busca({ query: 'espera', book: 'Gênesis' }).counts, { all: 7, nota: 1, marcacao: 2, reflexao: 1, pregacao: 1, aplicacao: 1, pergunta: 1, estudo: 0 })
check('texto + livro + período', busca({ query: 'espera', book: 'Gênesis', period: { key: 'week' } }).counts.all, 2)
check('texto + pregador', busca({ query: 'fiel', preacher: 'Pr. João Silva' }).groups.map(g => `${g.type}:${g.count}`), ['pregacao:1'])
check('busca por referência: o que está ligado a Gênesis 39', busca({ query: 'gn 39' }).pills.map(p => `${p.label} ${p.count}`), ['Tudo 5', 'Marcações 2', 'Notas 1', 'Pregações 1', 'Aplicações 1'])
check('busca por versículo', busca({ query: 'gn 39 21' }).pills.map(p => `${p.label} ${p.count}`), ['Tudo 2', 'Marcações 1', 'Pregações 1'])
check('só refinar (sem texto): tudo o que passa pelo filtro', busca({ book: 'Salmos' }).pills.map(p => `${p.label} ${p.count}`), ['Tudo 2', 'Marcações 1', 'Pregações 1'])
const verTudo = busca({ browse: true })
check('"Ver tudo": tudo o que está guardado, por tipo; os seis tipos somam o total da raiz', [verTudo.counts.all - verTudo.counts.estudo, verTudo.term], [libraryCounts(base).total, ''])
check('"Ver tudo": cada grupo do mais recente para o mais antigo', verTudo.groups.find(g => g.type === 'marcacao').rows.map(r => r.item.id), ['m1', 'm2'])
check('nada encontrado: a frase com o termo, sem botão quando não há filtro', busca({ query: 'inexistente' }).empty, { message: 'Nada com "inexistente" no que você guardou.', canClear: false })
check('nada encontrado com filtro aplicado: oferece buscar sem os filtros', [busca({ query: 'copeiro', book: 'Salmos' }).empty, busca({ query: 'copeiro', type: 'pregacao', book: null }).empty], [{ message: 'Nada com "copeiro" no que você guardou.', canClear: true }, null])
check('nada com esses filtros (sem texto)', busca({ preacher: 'Ninguém' }).empty, { message: 'Nada guardado com esses filtros.', canClear: true })
check('"Buscar sem os filtros" mantém o texto e limpa tipo, livro, período e pregador', withoutFilters({ query: 'copeiro', type: 'nota', book: 'Salmos', period: { key: 'week' }, preacher: 'x' }), { query: 'copeiro', type: 'all', book: null, period: { key: 'always' }, preacher: null })
check('para as buscas recentes: só os tipos com resultado', [foundCounts(busca({ query: 'copeiro' })), recentSub(foundCounts(busca({ query: 'copeiro' }))), recentSub(foundCounts(espera))], [{ nota: 1 }, '1 nota', '9 anotações · em tudo'])
check('a busca nunca devolve item de fora dos que recebeu', espera.groups.flatMap(g => g.rows).every(r => tudo.includes(r.item)), true)

// ── Privacidade ───────────────────────────────────────────────────────
const store = ler('biblioteca/buscasRecentesStore.js')
check('as buscas recentes ficam só no aparelho', /localStorage/.test(store) && !/supabase|fetch\(|updateRow|userDataStore/.test(store), true)
const tela = ler('screens/BuscaDaBibliotecaScreen.jsx')
const importsDaTela = [...tela.matchAll(/from '([^']+)'/g)].map(m => m[1])
check('a busca não lê nada além dos itens da pessoa (a tela não importa loja, rede, grupo nem amigo)', [importsDaTela.filter(i => /Store|supabase|groups|friends|prayer|pedidos/i.test(i)), /fetch\(/.test(tela)], [[], false])

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
