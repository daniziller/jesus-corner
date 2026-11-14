// Testes da busca da Biblioteca (handoff-biblioteca-55 §6), parte pura:
// os tipos de "Buscar em", os seletores de refinar e o que cada folha
// oferece, a combinação tipo + livro + período + pregador, as etiquetas e
// as buscas recentes.
// node scripts/test-biblioteca-busca.mjs
import { readFileSync } from 'node:fs'
import { libraryItems } from '../src/biblioteca/bibliotecaMath.js'
import {
  SEARCH_TYPES, searchTypeLabel, NO_REFINE, isRefined, PERIODS, periodRange, periodLabel, normalizePeriod, refineItems,
  bookOptions, preacherOptions, refineSelectors, tagCloud, TAG_CLOUD, typeNoun, recentSub, rememberLibrarySearch,
} from '../src/biblioteca/buscaDaBiblioteca.js'

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

// ── Privacidade ───────────────────────────────────────────────────────
const store = ler('biblioteca/buscasRecentesStore.js')
check('as buscas recentes ficam só no aparelho', /localStorage/.test(store) && !/supabase|fetch\(|updateRow|userDataStore/.test(store), true)
const tela = ler('screens/BuscaDaBibliotecaScreen.jsx')
const importsDaTela = [...tela.matchAll(/from '([^']+)'/g)].map(m => m[1])
check('a busca não lê nada além dos itens da pessoa (a tela não importa loja, rede, grupo nem amigo)', [importsDaTela.filter(i => /Store|supabase|groups|friends|prayer|pedidos/i.test(i)), /fetch\(/.test(tela)], [[], false])

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
if (failures) process.exit(1)
