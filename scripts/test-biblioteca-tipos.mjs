// Testes das telas de tipo da Biblioteca (handoff-biblioteca-55 §3 e §4),
// parte pura: os filtros e os grupos de Pregações, Marcações por livro,
// por data e com nota, e as peças comuns (datas, abreviações, páginas).
// node scripts/test-biblioteca-tipos.mjs
import { libraryItems, libraryCounts } from '../src/biblioteca/bibliotecaMath.js'
import {
  PAGE_SIZE, pageOf, dateLabel, monthHeading, groupByMonth, bookShort, passageShort, passagePills,
  sermonTypeLabel, sermonsSummary, sermonTypeFilters, effectiveSermonType, SERMON_ORDERS, sermonOrderLabel, sermonList, sermonGroups, sermonCard, EMPTY_SERMONS,
  marksSummary, marksTabs, marksByBook, bookMarksShown, marksList, markRow, withNote, shareText,
} from '../src/biblioteca/tiposMath.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}

// Uma terça, 10 de novembro de 2026 (o dia das capturas).
const agora = new Date(2026, 10, 10, 10, 0)
const ha = (dias, hora = 9) => new Date(2026, 10, 10 - dias, hora, 0).toISOString()
const dia = dias => { const d = new Date(2026, 10, 10 - dias); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// ── Peças comuns ──────────────────────────────────────────────────────
check('data: com o dia da semana até seis dias atrás; depois, só o dia e o mês', [0, 2, 6, 7, 14].map(n => dateLabel(ha(n), agora)), ['ter, 10 nov', 'dom, 8 nov', 'qua, 4 nov', '3 nov', '27 out'])
check('data: outro ano leva o ano', dateLabel(new Date(2025, 10, 9).toISOString(), agora), '9 nov 2025')
check('data: sem data, nada', dateLabel(null, agora), '')
check('cabeçalho de mês', [monthHeading('2026-11'), monthHeading('2025-03')], ['Novembro de 2026', 'Março de 2025'])
check('grupos por mês, na ordem dos itens', groupByMonth([{ at: ha(2) }, { at: ha(6) }, { at: ha(14) }, { at: null }]).map(g => `${g.label}:${g.items.length}`), ['Novembro de 2026:2', 'Outubro de 2026:1', 'Sem data:1'])
check('abreviações', ['Gênesis', 'Êxodo', '1 Samuel', 'Jó', 'João', '1 João', 'Salmos', 'Habacuque', 'Apocalipse', 'Cântico dos Cânticos'].map(b => bookShort(b)), ['Gn', 'Êx', '1Sm', 'Jó', 'Jo', '1Jo', 'Sl', 'Hc', 'Ap', 'Cc'])
check('abreviação em inglês', [bookShort('Gênesis', 'en'), bookShort('1 Samuel', 'en'), bookShort('Jó', 'en')], ['Gen', '1Sa', 'Job'])
check('passagem: versículo, capítulo, intervalo', [passageShort({ book: 'Gênesis', chapter: 39, verseStart: 21, verseEnd: 21 }), passageShort({ book: 'Gênesis', chapter: 37, verseStart: null }), passageShort({ book: 'Tiago', chapter: 1, verseStart: 3, verseEnd: 4 })], ['Gn 39:21', 'Gn 37', 'Tg 1:3–4'])
const seis = [1, 2, 3, 4, 5, 6].map(c => ({ book: 'Salmos', chapter: c, verseStart: 1, verseEnd: 1 }))
check('pastilhas: até quatro e "+n"', [passagePills(seis).pills.map(p => p.label), passagePills(seis).more], [['Sl 1:1', 'Sl 2:1', 'Sl 3:1', 'Sl 4:1'], '+2'])
check('pastilhas: quatro cabem sem "+n"; livro inválido sai', [passagePills(seis.slice(0, 4)).more, passagePills([{ book: 'Inventado', chapter: 1 }, seis[0]]).pills.length], [null, 1])
check('pastilha leva para onde abrir a Bíblia', passagePills([{ book: 'Romanos', chapter: 8, verseStart: 28, verseEnd: 30 }]).pills[0], { label: 'Rm 8:28–30', book: 'Romanos', chapter: 8, verse: 28 })
const cem = Array.from({ length: 75 }, (_, i) => i)
check('páginas de 30', [PAGE_SIZE, pageOf(cem, 1).visible.length, pageOf(cem, 1).hasMore, pageOf(cem, 2).visible.length, pageOf(cem, 3).visible.length, pageOf(cem, 3).hasMore], [30, 30, true, 60, 75, false])

// ── Pregações ─────────────────────────────────────────────────────────
const nota = (id, dias, noteType, extra = {}) => ({ id, date: dia(dias), createdAt: ha(dias, 10), noteType, title: '', preacher: '', church: '', passages: [], text: 'texto da anotação', finalizedAt: ha(dias), ...extra })
const sermonNotes = [
  nota('a', 2, 'sermon', { title: 'A fidelidade que não se explica', preacher: 'Pr. João Silva', church: 'Igreja Batista Central', text: 'Deus é fiel.', passages: [{ book: 'Gênesis', chapter: 39, verseStart: 21, verseEnd: 21 }] }),
  nota('b', 6, 'class', { title: 'Panorama de Gênesis · aula 4', preacher: 'Prof. Lívia Prado', church: 'Escola Bíblica' }),
  nota('c', 14, 'video', { title: 'Quando Deus demora', preacher: 'Tim Keller', church: 'legendado' }),
  nota('d', 40, 'sermon', { preacher: 'pr. joão silva ', church: 'Igreja Batista Central' }),
  nota('e', 50, 'service', { preacher: 'Pra. Ana Reis' }),
  nota('f', 60, 'retiro de casais', { title: 'Retiro' }),
  nota('g', 70, 'free', { text: 'Uma anotação livre que começa assim e segue por várias palavras.' }),
  nota('h', 80, 'sermon', { title: 'Sem pregador' }),
  nota('i', 90, 'class', { title: 'Aula 3', preacher: 'Prof. Lívia Prado' }),
]
const pregacoes = libraryItems({ sermonNotes })
check('nome dos tipos', ['sermon', 'service', 'class', 'lecture', 'video', 'free', 'retiro de casais', undefined].map(sermonTypeLabel), ['Sermão', 'Culto', 'Aula', 'Palestra', 'Vídeo online', 'Livre', 'retiro de casais', 'Sermão'])
check('resumo: anotações e pregadores (o mesmo pregador, escrito diferente, conta uma vez)', sermonsSummary(pregacoes), '9 anotações · 4 pregadores')
check('resumo: singular', sermonsSummary(pregacoes.slice(0, 1)), '1 anotação · 1 pregador')
check('resumo: sem pregador nenhum', sermonsSummary(pregacoes.filter(p => !p.preacher)), '3 anotações')
check('resumo: a contagem é a mesma do quadrado da raiz', sermonsSummary(pregacoes).startsWith(`${libraryCounts(pregacoes).pregacao} `), true)
check('filtros: Todas e só os tipos usados, do mais usado para o menos', sermonTypeFilters(pregacoes).map(f => `${f.label} ${f.count}`), ['Todas 9', 'Sermão 3', 'Aula 2', 'Culto 1', 'Vídeo online 1', 'Livre 1', 'retiro de casais 1'])
check('filtros: tipo com zero não aparece', sermonTypeFilters(pregacoes).some(f => f.label === 'Palestra'), false)
check('filtros: sem anotações, só "Todas 0"', sermonTypeFilters([]).map(f => `${f.label} ${f.count}`), ['Todas 0'])
check('filtro que sumiu volta para "Todas"', [effectiveSermonType('lecture', pregacoes), effectiveSermonType('class', pregacoes), effectiveSermonType('all', pregacoes)], ['all', 'class', 'all'])
check('ordens', SERMON_ORDERS.map(o => o.label), ['Mais recentes', 'Mais antigas', 'Por pregador'])
check('rótulo da ordem (desconhecida cai na primeira)', [sermonOrderLabel('preacher'), sermonOrderLabel('x')], ['Por pregador', 'Mais recentes'])
check('lista: mais recentes', sermonList(pregacoes).map(p => p.id), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'])
check('lista: mais antigas', sermonList(pregacoes, { order: 'oldest' }).map(p => p.id), ['i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'])
check('lista: filtro de tipo', sermonList(pregacoes, { type: 'class' }).map(p => p.id), ['b', 'i'])
check('lista: por pregador (alfabética, sem pregador no fim, recentes primeiro em cada um)', sermonList(pregacoes, { order: 'preacher' }).map(p => p.id), ['a', 'd', 'e', 'b', 'i', 'c', 'f', 'g', 'h'])
check('grupos por mês', sermonGroups(sermonList(pregacoes)).map(g => `${g.label}:${g.items.length}`), ['Novembro de 2026:2', 'Outubro de 2026:2', 'Setembro de 2026:3', 'Agosto de 2026:2'])
check('grupos por pregador', sermonGroups(sermonList(pregacoes, { order: 'preacher' }), 'preacher').map(g => `${g.label}:${g.items.length}`), ['Pr. João Silva:2', 'Pra. Ana Reis:1', 'Prof. Lívia Prado:2', 'Tim Keller:1', 'Sem pregador:3'])
check('grupos seguem a página: 30 itens viram os grupos desses 30', sermonGroups(pageOf(sermonList(pregacoes), 1).visible).reduce((n, g) => n + g.items.length, 0), 9)
const cartao = id => sermonCard(pregacoes.find(p => p.id === id), { now: agora })
check('cartão completo', cartao('a'), { key: 'pregacao:a', type: 'Sermão', date: 'dom, 8 nov', title: 'A fidelidade que não se explica', sub: 'Pr. João Silva · Igreja Batista Central', excerpt: 'Deus é fiel.', pills: [{ label: 'Gn 39:21', book: 'Gênesis', chapter: 39, verse: 21 }], more: null })
check('cartão sem título: "Preletor · Instituição" vira o título e a segunda linha some', [cartao('d').title, cartao('d').sub], ['pr. joão silva · Igreja Batista Central', ''])
check('cartão sem título nem pregador: as primeiras palavras do texto', [cartao('g').title, cartao('g').sub, cartao('g').type], ['Uma anotação livre que começa assim', '', 'Livre'])
check('cartão com título e sem pregador: sem segunda linha', [cartao('h').title, cartao('h').sub], ['Sem pregador', ''])
check('cartão de tipo próprio', cartao('f').type, 'retiro de casais')
check('vazio de Pregações', EMPTY_SERMONS, 'Nenhuma pregação anotada ainda.')

// ── Marcações ─────────────────────────────────────────────────────────
const hl = (id, book, chapter, verses, dias, extra = {}) => ({ id, book, bookEn: book, chapter, verses, text: '', createdAt: ha(dias), ...extra })
const marcas = libraryItems({ highlights: [
  hl('j1', 'João', 16, [33], 29),
  hl('g1', 'Gênesis', 39, [21], 3),
  hl('g2', 'Gênesis', 41, [51], 0, { text: 'esquecer não é apagar' }),
  hl('g3', 'Gênesis', 1, [1], 100, { text: 'no começo' }),
  hl('s1', 'Salmos', 23, [4], 1),
  hl('x1', 'Livro Inventado', 1, [1], 1),
  hl('n1', 'Salmos', 1, [1], 1, { kind: 'note', text: 'nasceu como nota' }),
] }).filter(i => i.type === 'marcacao')
check('resumo: trechos e livros', marksSummary(marcas), '6 trechos · 3 livros')
check('resumo: singular', marksSummary(marcas.filter(m => m.id === 's1')), '1 trecho · 1 livro')
check('resumo: a contagem é a mesma do quadrado da raiz', marksSummary(marcas).startsWith(`${libraryCounts(marcas).marcacao} `), true)
check('segmentado', marksTabs(marcas).map(t => t.label), ['Por livro', 'Por data', 'Com nota · 2'])
check('segmentado: sem nota nenhuma', marksTabs([]).map(t => t.label)[2], 'Com nota · 0')
check('com nota: só as marcações (a nota de versículo não é marcação)', withNote(marcas).map(m => m.id), ['g2', 'g3'])
const livros = marksByBook(marcas)
check('por livro: ordem canônica', livros.map(g => g.name), ['Gênesis', 'Salmos', 'João'])
check('por livro: contagem e cor do bloco', livros.map(g => `${g.count}|${g.blocoId}`), ['3 trechos|lei', '1 trecho|poeticos', '1 trecho|evangelhos-atos'])
check('por livro: os dois mais recentes, e "Ver os N" só com mais de dois', [bookMarksShown(livros[0], false).map(m => m.id), livros[0].more, livros[1].more], [['g2', 'g1'], 'Ver os 3 de Gênesis', null])
check('por livro: aberto, todos', bookMarksShown(livros[0], true).map(m => m.id), ['g2', 'g1', 'g3'])
check('por livro: a soma dos livros é o total com livro válido', livros.reduce((n, g) => n + g.items.length, 0), 5)
check('por data: do mais recente para o mais antigo', marksList(marcas, 'data').map(m => m.id), ['g2', 's1', 'x1', 'g1', 'j1', 'g3'])
check('com nota: por data', marksList(marcas, 'nota').map(m => m.id), ['g2', 'g3'])
check('linha de trecho', markRow(marcas.find(m => m.id === 'g2'), { now: agora }), { key: 'marcacao:g2', reference: 'Gênesis 41:51', when: 'hoje', note: 'Com nota: "esquecer não é apagar"' })
check('linha de trecho sem nota', markRow(marcas.find(m => m.id === 'j1'), { now: agora }), { key: 'marcacao:j1', reference: 'João 16:33', when: '12 out', note: null })

// ── Compartilhar ──────────────────────────────────────────────────────
check('compartilhar uma pregação: título, pregador e só as palavras da pessoa', shareText(pregacoes.find(p => p.id === 'a')), 'A fidelidade que não se explica\nPr. João Silva · Igreja Batista Central\n\nDeus é fiel.')
check('compartilhar uma marcação: o trecho, a referência e a nota — sem etiquetas', shareText({ ...marcas.find(m => m.id === 'g2'), tags: ['espera'] }, { verseText: 'Deus me fez esquecer' }), '"Deus me fez esquecer"\nGênesis 41:51\n\nesquecer não é apagar')

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
