// Testes das telas de tipo da Biblioteca (handoff-biblioteca-55 §3 e §4),
// parte pura: os filtros e os grupos de Pregações, Marcações por livro,
// por data e com nota, e as peças comuns (datas, abreviações, páginas).
// node scripts/test-biblioteca-tipos.mjs
import { libraryItems, libraryCounts } from '../src/biblioteca/bibliotecaMath.js'
import {
  PAGE_SIZE, pageOf, dateLabel, monthHeading, groupByMonth, bookShort, passageShort, passagePills,
  sermonTypeLabel, sermonsSummary, sermonTypeFilters, effectiveSermonType, sermonOrders, sermonOrderLabel, sermonList, sermonGroups, sermonCard, emptySermons,
  marksSummary, marksTabs, marksByBook, bookMarksShown, marksList, markRow, withNote, shareText,
  notesSummary, notesTabs, notesByBook, noteRow, reflectionsSummary, phrasesByDate, reflectionCard,
  applicationsSummary, applicationFilters, applicationList, applicationCard, questionsSummary, questionCard,
  reflectionBlocks, readingPage, emptyNotes, emptyMarks, emptyApplications, emptyReflections, emptyQuestions,
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
check('abreviações', ['Gênesis', 'Êxodo', '1 Samuel', 'Jó', 'João', '1 João', 'Salmos', 'Habacuque', 'Apocalipse', 'Cântico dos Cânticos'].map(b => bookShort(b)), ['Gn', 'Êx', '1Sm', 'Jó', 'Jo', '1Jo', 'Sl', 'Hc', 'Ap', 'Ct'])
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
check('ordens', sermonOrders().map(o => o.label), ['Mais recentes', 'Mais antigas', 'Por pregador'])
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
check('vazio de Pregações', emptySermons(), 'Nenhuma pregação anotada ainda.')

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

// ── Notas ─────────────────────────────────────────────────────────────
const notas = libraryItems({
  highlights: [
    hl('n1', 'Salmos', 23, [4], 1, { kind: 'note', text: 'O vale é passagem,\nnão endereço.' }),
    hl('n2', 'Gênesis', 40, [23], 11, { kind: 'note', text: 'Esquecido pelo copeiro.' }),
    hl('n3', 'Gênesis', 41, [1], 0, { kind: 'note', text: 'Dois anos depois.' }),
    hl('n4', 'Gênesis', 1, [1], 200, { kind: 'note', text: 'No princípio.' }),
    hl('m1', 'Gênesis', 2, [2], 1, { text: 'marcação com nota não é nota' }),
  ],
  notes: { 'Gênesis:39-40': { text: 'Nota da sessão.', updatedAt: ha(12) } },
}).filter(i => i.type === 'nota')
check('Notas: resumo', notesSummary(notas), '5 notas · 2 livros')
check('Notas: resumo no singular', notesSummary(notas.filter(n => n.id === 'n1')), '1 nota · 1 livro')
check('Notas: a contagem é a mesma do quadrado da raiz', notesSummary(notas).startsWith(`${libraryCounts(notas).nota} `), true)
check('Notas: segmentado', notesTabs().map(t => t.label), ['Por livro', 'Por data'])
const livrosDeNotas = notesByBook(notas)
check('Notas por livro: ordem canônica, contagem e "Ver as N"', livrosDeNotas.map(g => `${g.name}|${g.count}|${g.more}`), ['Gênesis|4 notas|Ver as 4 de Gênesis', 'Salmos|1 nota|null'])
check('Notas por livro: as duas mais recentes (a nota de sessão entra)', bookMarksShown(livrosDeNotas[0], false).map(n => n.key), ['nota:n3', 'nota:n2'])
check('linha de nota: referência, quando e o texto numa linha', noteRow(notas.find(n => n.id === 'n1'), { now: agora }), { key: 'nota:n1', reference: 'Salmos 23:4', when: 'ontem', text: 'O vale é passagem, não endereço.' })
check('linha de nota de sessão: os capítulos', noteRow(notas.find(n => n.noteKey), { now: agora }).reference, 'Gênesis 39–40')

// ── Reflexões e Aplicações ────────────────────────────────────────────
const doDia = libraryItems({ notes: {
  [`reflection:${dia(0)}`]: { text: 'O que a espera mostra?\nDeus não desperdiça a espera.\n\nE você?\nEu espero.', updatedAt: ha(0, 7) },
  [`reflection:${dia(45)}`]: { text: 'Folha livre, sem pergunta.', updatedAt: ha(45, 7) },
  'Rute:reflection': { text: 'Fechando Rute.', updatedAt: ha(20) },
  [`application:${dia(0)}`]: { text: 'Hoje eu espero sem cobrar resposta.', updatedAt: ha(0, 8), fulfilled: true },
  [`application:${dia(70)}`]: { text: 'Confiar antes de entender.', updatedAt: ha(70) },
  [`application:${dia(400)}`]: { text: 'Frase do ano passado.', updatedAt: ha(400) },
} })
const reflexoes = doDia.filter(i => i.type === 'reflexao')
const frases = doDia.filter(i => i.type === 'aplicacao')
check('Reflexões: resumo com o mês mais antigo', reflectionsSummary(reflexoes), '3 reflexões · desde setembro de 2026')
check('Reflexões: singular', reflectionsSummary(reflexoes.slice(0, 1)), `1 reflexão · desde ${reflexoes[0].kind === 'dia' ? 'novembro' : 'outubro'} de 2026`)
check('Reflexões: nenhuma', reflectionsSummary([]), '0 reflexões')
const porData = phrasesByDate(doDia)
check('frase do dia por data (só as frases)', Object.keys(porData).sort(), [dia(0), dia(70), dia(400)].sort())
const lidos = { [dia(0)]: [{ book: 'Gênesis', chapter: 41 }] }
check('cartão de reflexão: título, quando, primeira resposta e a frase do dia', reflectionCard(reflexoes.find(r => r.date === dia(0)), { now: agora, readByDay: lidos, phrases: porData }), { key: `reflexao:reflection:${dia(0)}`, title: 'Gênesis 41', when: 'hoje', excerpt: 'Deus não desperdiça a espera.', phrase: '"Hoje eu espero sem cobrar resposta."' })
check('cartão de reflexão sem frase no dia', reflectionCard(reflexoes.find(r => r.date === dia(45)), { now: agora, phrases: porData }).phrase, null)
check('cartão de reflexão de fim de livro: sem frase, texto corrido', [reflectionCard(reflexoes.find(r => r.kind === 'livro'), { now: agora, phrases: porData }).title, reflectionCard(reflexoes.find(r => r.kind === 'livro'), { now: agora, phrases: porData }).phrase], ['Rute · Reflexão de fechamento', null])
check('Aplicações: resumo', [applicationsSummary(frases), applicationsSummary(frases.slice(0, 1)), applicationsSummary([])], ['3 frases · 1 cumprida', '1 frase · 1 cumprida', '0 frases · 0 cumpridas'])
check('Aplicações: a contagem é a mesma do quadrado da raiz', applicationsSummary(frases).startsWith(`${libraryCounts(frases).aplicacao} `), true)
check('Aplicações: filtros com contagem', applicationFilters(frases).map(f => `${f.label} ${f.count}`), ['Todas 3', 'Cumpridas 1', 'Em aberto 2'])
check('Aplicações: as contagens dos filtros somam o total', applicationList(frases, 'done').length + applicationList(frases, 'open').length, applicationList(frases).length)
check('Aplicações: mais recentes primeiro', applicationList(frases).map(f => f.date), [dia(0), dia(70), dia(400)])
check('cartão de frase: aspas e a linha de baixo', applicationCard(frases.find(f => f.date === dia(0)), { now: agora }), { key: `aplicacao:application:${dia(0)}`, quote: '"Hoje eu espero sem cobrar resposta."', meta: 'Frase do dia · 10 nov · cumprida' })
check('cartão de frase em aberto, de outro ano', applicationCard(frases.find(f => f.date === dia(400)), { now: agora }).meta, 'Frase do dia · 6 out 2025 · em aberto')

// ── Perguntas ─────────────────────────────────────────────────────────
const perguntas = libraryItems({ questions: [
  { book: 'Gênesis', bookEn: 'Genesis', chapter: 41, verseStart: 1, verseEnd: 1, question: 'Por que dois anos?', answer: { outcome: 'answer', reply: 'O texto só marca\no tempo.' }, createdAt: ha(12) },
  { book: 'João', chapter: 3, verseStart: 16, verseEnd: 18, question: 'E esta?', answer: { outcome: 'refused' }, createdAt: ha(80) },
] })
check('Perguntas: resumo', [questionsSummary(perguntas), questionsSummary(perguntas.slice(0, 1)), questionsSummary([])], ['2 perguntas guardadas', '1 pergunta guardada', '0 perguntas guardadas'])
check('cartão de pergunta', questionCard(perguntas[0], { now: agora }), { key: perguntas[0].key, question: 'Por que dois anos?', pill: { label: 'Gn 41:1', book: 'Gênesis', chapter: 41, verse: 1 }, answer: 'O texto só marca o tempo.', when: '29 out' })
check('cartão de pergunta sem resposta guardada', [questionCard(perguntas[1], { now: agora }).answer, questionCard(perguntas[1], { now: agora }).pill.label], ['', 'Jo 3:16–18'])

// ── A página de leitura ───────────────────────────────────────────────
check('blocos: pergunta e resposta; folha livre', reflectionBlocks('O que mostra?\nResposta um.\nSegunda linha.\n\nSem pergunta aqui.'), [{ question: 'O que mostra?', answer: 'Resposta um.\nSegunda linha.' }, { question: null, answer: 'Sem pergunta aqui.' }])
check('blocos: texto vazio', reflectionBlocks('   '), [])
const hoje = readingPage(reflexoes.find(r => r.date === dia(0)), { items: doDia, readByDay: lidos, now: agora })
check('leitura de uma reflexão: título, o dia, os blocos e a frase daquele dia', [hoje.kind, hoje.title, hoje.sub, hoje.blocks.length, hoje.phrase?.quote], ['reflexao', 'Gênesis 41', 'terça, 10 de novembro', 2, '"Hoje eu espero sem cobrar resposta."'])
const pelaFrase = readingPage(frases.find(f => f.date === dia(0)), { items: doDia, readByDay: lidos, now: agora })
check('leitura a partir da frase do dia: a reflexão daquele dia', [pelaFrase.title, pelaFrase.blocks.length, pelaFrase.phrase?.meta], ['Gênesis 41', 2, 'Frase do dia · 10 nov · cumprida'])
const soFrase = readingPage(frases.find(f => f.date === dia(70)), { items: doDia, now: agora })
check('frase de um dia sem reflexão: só a frase, com a data no título', [soFrase.title, soFrase.blocks, soFrase.phrase?.quote], ['Reflexão de 1 de setembro', [], '"Confiar antes de entender."'])
check('leitura de reflexão de fim de livro: sem frase', readingPage(reflexoes.find(r => r.kind === 'livro'), { items: doDia, now: agora }).phrase, null)
const conversa = readingPage(perguntas[0], { now: agora })
check('leitura de uma pergunta: a pergunta, de onde foi feita e a resposta inteira', conversa, { kind: 'pergunta', title: 'Pergunta', sub: 'Gênesis 41:1 · 29 out', question: 'Por que dois anos?', answer: 'O texto só marca\no tempo.', pill: { label: 'Gênesis 41:1', book: 'Gênesis', chapter: 41, verse: 1 } })

// ── Compartilhar ──────────────────────────────────────────────────────
check('compartilhar uma pregação: título, pregador e só as palavras da pessoa', shareText(pregacoes.find(p => p.id === 'a')), 'A fidelidade que não se explica\nPr. João Silva · Igreja Batista Central\n\nDeus é fiel.')
check('compartilhar uma marcação: o trecho, a referência e a nota — sem etiquetas', shareText({ ...marcas.find(m => m.id === 'g2'), tags: ['espera'] }, { verseText: 'Deus me fez esquecer' }), '"Deus me fez esquecer"\nGênesis 41:51\n\nesquecer não é apagar')

check('compartilhar uma pergunta: a pergunta, a referência e a resposta', shareText(perguntas[0]), 'Por que dois anos?\n\nGênesis 41:1\n\nO texto só marca\no tempo.')
check('compartilhar uma nota: o texto e a referência', shareText(notas.find(n => n.id === 'n2')), 'Esquecido pelo copeiro.\n\nGênesis 40:23')

// ── Em inglês ─────────────────────────────────────────────────────────
check('en: resumo e filtros de Pregações', [sermonsSummary(pregacoes, 'en').includes('entries'), sermonTypeFilters(pregacoes, 'en')[0].label, sermonTypeLabel('service', 'en'), sermonTypeLabel('Retiro', 'en')], [true, 'All', 'Service', 'Retiro'])
check('en: ordens', sermonOrders('en').map(o => o.label), ['Newest', 'Oldest', 'By preacher'])
check('en: grupo por mês', groupByMonth([{ at: ha(0) }, {}], 'en').map(g => g.label), ['November 2026', 'No date'])
check('en: data de cartão na semana e fora', [dateLabel(ha(2), agora, 'en'), dateLabel(ha(20), agora, 'en')], ['Sun, Nov 8', 'Oct 21'])
check('en: Marcações', [marksSummary(marcas, 'en').split(' · ')[1].endsWith('books'), marksTabs(marcas, 'en').map(t => t.label.split(' · ')[0])], [true, ['By book', 'By date', 'With a note']])
check('en: "Ver os N" de um livro', marksByBook(marcas, 'en').find(g => g.more)?.more.startsWith('See all'), true)
check('en: Notas', [notesTabs('en').map(t => t.label), emptyNotes('en')], [['By book', 'By date'], 'No notes yet.'])
check('en: Aplicações', [applicationFilters(frases, 'en').map(f => f.label), applicationCard(frases[0], { now: agora, lang: 'en' }).meta.startsWith('Phrase of the day · ')], [['All', 'Done', 'Open'], true])
check('en: Perguntas', [questionsSummary(perguntas, 'en'), questionsSummary(perguntas.slice(0, 1), 'en')], ['2 saved questions', '1 saved question'])
check('en: vazios', [emptySermons('en'), emptyMarks('nota', 'en'), emptyApplications('open', 'en'), emptyReflections('en'), emptyQuestions('en')], ['No sermon notes yet.', 'No highlights with a note yet.', 'No open phrases.', 'No reflections yet.', 'No saved questions yet.'])
check('en: página de uma pergunta', readingPage(perguntas[0], { now: agora, lang: 'en' }).title, 'Question')

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
