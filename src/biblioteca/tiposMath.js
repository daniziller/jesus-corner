// tiposMath.js — as telas de tipo da Biblioteca (handoff-biblioteca-55 §3
// e §4), parte pura: os filtros de Pregações (só os tipos usados, na
// ordem do mais usado) e o agrupamento por mês e por pregador; Marcações
// por livro (ordem canônica, dois por livro, "Ver os N"), por data e com
// nota; e as peças comuns — a data dos cartões, as referências
// abreviadas e a paginação. As contagens vêm de bibliotecaMath.js, as
// mesmas da raiz. Testes em scripts/test-biblioteca-tipos.mjs.
import { PT_BOOK_ABBREVIATIONS, EN_BOOK_ABBREVIATIONS } from '../bible/bookAbbreviations.js'
import { normalizeForSearch } from '../bible/searchNormalize.js'
import { bookInfo } from '../data/gamificationBlocks.js'
import { bookDisplayName } from '../busca/referencia.js'
import { formatInt, plural, monthName, monthYearLong } from '../gamification/format.js'
import { WEEKDAY_ABBR3 } from '../routine/weeklyDaysMath.js'
import { byRecent, itemReference, whenLabel } from './bibliotecaMath.js'

const oneLine = text => String(text ?? '').replace(/\s+/g, ' ').trim()
const capitalize = text => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

// ── Peças comuns ────────────────────────────────────────────────────────

// As listas de tipo mostram 30 itens e trazem mais 30 quando a rolagem
// chega ao fim.
export const PAGE_SIZE = 30
export function pageOf(list, pages = 1) {
  const visible = list.slice(0, pages * PAGE_SIZE)
  return { visible, hasMore: visible.length < list.length }
}

const dayNumber = date => Math.round(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000)

// A data de um cartão: "dom, 8 nov" na última semana (até seis dias
// atrás, o dia da semana ainda diz qual); depois, "27 out"; fora do ano
// corrente, com o ano.
export function dateLabel(iso, now = new Date()) {
  if (!iso) return ''
  const d = new Date(iso)
  const short = `${d.getDate()} ${monthName(d).slice(0, 3)}`
  if (d.getFullYear() !== now.getFullYear()) return `${short} ${d.getFullYear()}`
  const days = dayNumber(now) - dayNumber(d)
  return days >= 0 && days < 7 ? `${WEEKDAY_ABBR3.pt[(d.getDay() + 6) % 7].toLowerCase()}, ${short}` : short
}

// "Novembro de 2026" (vira maiúscula por CSS, no rótulo do grupo).
export function monthHeading(key) {
  const [year, month] = key.split('-').map(Number)
  return capitalize(monthYearLong(new Date(year, month - 1, 1)))
}

// Itens (já na ordem em que vão aparecer) em grupos por mês. Sem data,
// num grupo final "Sem data".
export function groupByMonth(items) {
  const groups = []
  for (const item of items) {
    const d = item.at ? new Date(item.at) : null
    const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'sem-data'
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, label: d ? monthHeading(key) : 'Sem data', items: [item] })
  }
  return groups
}

// "Gn" · "Êx" · "1Sm" · "Jó" — a forma abreviada de um livro, das mesmas
// abreviações que o interpretador de referências aceita.
const shortByBook = { pt: firstAliases(PT_BOOK_ABBREVIATIONS), en: firstAliases(EN_BOOK_ABBREVIATIONS) }
function firstAliases(map) {
  const first = {}
  for (const [alias, book] of Object.entries(map)) if (!(book in first)) first[book] = alias
  return first
}
export function bookShort(book, lang = 'pt') {
  const name = bookDisplayName(book, lang)
  if (name.length <= 3) return name
  const alias = (shortByBook[lang] ?? shortByBook.pt)[book]
  if (!alias) return name
  const compact = alias.replace(/\s+/g, '')
  // A abreviação que é o começo do nome leva o acento do nome ("Êx").
  if (normalizeForSearch(name).startsWith(compact)) return name.slice(0, compact.length)
  const digit = compact.match(/^\d/)?.[0] ?? ''
  return `${digit}${capitalize(compact.slice(digit.length))}`
}

// "Gn 39:21" · "Gn 37" · "Tg 1:3–4" — a passagem citada numa anotação.
export function passageShort(p, lang = 'pt') {
  const verses = p.verseStart ? `:${p.verseStart}${p.verseEnd && p.verseEnd !== p.verseStart ? `–${p.verseEnd}` : ''}` : ''
  return `${bookShort(p.book, lang)} ${p.chapter}${verses}`
}

// As pastilhas de um cartão de pregação: até quatro passagens e, havendo
// mais, "+{n}". Cada uma leva para onde abrir a Bíblia.
export const PASSAGE_PILLS = 4
export function passagePills(passages, lang = 'pt') {
  const valid = (passages ?? []).filter(p => p?.book && p.chapter && bookInfo(p.book))
  return {
    pills: valid.slice(0, PASSAGE_PILLS).map(p => ({ label: passageShort(p, lang), book: p.book, chapter: p.chapter, verse: p.verseStart ?? null })),
    more: valid.length > PASSAGE_PILLS ? `+${valid.length - PASSAGE_PILLS}` : null,
  }
}

// ── Pregações (L2, §3) ──────────────────────────────────────────────────

// O nome de um tipo de mensagem. Os cinco de sempre (34f), "Livre" (a
// anotação livre) e, fora deles, o tipo que a pessoa criou — com as
// palavras dela.
const SERMON_TYPES = { sermon: 'Sermão', service: 'Culto', class: 'Aula', lecture: 'Palestra', video: 'Vídeo online', free: 'Livre' }
const SERMON_TYPE_ORDER = Object.keys(SERMON_TYPES)
export function sermonTypeLabel(noteType) {
  return SERMON_TYPES[noteType] ?? (oneLine(noteType) || SERMON_TYPES.sermon)
}

const samePerson = name => normalizeForSearch(oneLine(name))

// "14 anotações · 5 pregadores" — sem pregador nenhum, só as anotações.
export function sermonsSummary(items) {
  const n = items.length
  const preachers = new Set(items.map(i => samePerson(i.preacher)).filter(Boolean)).size
  const parts = [`${formatInt(n)} ${plural(n, 'anotação', 'anotações')}`]
  if (preachers > 0) parts.push(`${formatInt(preachers)} ${plural(preachers, 'pregador', 'pregadores')}`)
  return parts.join(' · ')
}

// As pastilhas do filtro: "Todas" e os tipos que a pessoa já usou, do
// mais usado para o menos (no empate, a ordem de 34f; os tipos próprios
// depois, em ordem alfabética). Tipo com zero não aparece.
export function sermonTypeFilters(items) {
  const counts = {}
  for (const item of items) counts[item.noteType] = (counts[item.noteType] ?? 0) + 1
  const rank = type => (SERMON_TYPE_ORDER.includes(type) ? SERMON_TYPE_ORDER.indexOf(type) : SERMON_TYPE_ORDER.length)
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || rank(a) - rank(b) || sermonTypeLabel(a).localeCompare(sermonTypeLabel(b), 'pt'))
  return [
    { key: 'all', label: 'Todas', count: formatInt(items.length) },
    ...types.map(type => ({ key: type, label: sermonTypeLabel(type), count: formatInt(counts[type]) })),
  ]
}

// O filtro que vale: o escolhido, se ainda existe (apagar a última
// anotação de um tipo faz a pastilha sumir); senão, "Todas".
export function effectiveSermonType(type, items) {
  return type !== 'all' && items.some(i => i.noteType === type) ? type : 'all'
}

export const SERMON_ORDERS = [
  { key: 'recent', label: 'Mais recentes' },
  { key: 'oldest', label: 'Mais antigas' },
  { key: 'preacher', label: 'Por pregador' },
]
export function sermonOrderLabel(order) {
  return (SERMON_ORDERS.find(o => o.key === order) ?? SERMON_ORDERS[0]).label
}

// As anotações do filtro, na ordem escolhida (antes de paginar).
export function sermonList(items, { type = 'all', order = 'recent' } = {}) {
  const list = byRecent(type === 'all' ? items : items.filter(i => i.noteType === type))
  if (order === 'oldest') return list.reverse()
  if (order !== 'preacher') return list
  // Por pregador: em ordem alfabética, sem pregador no fim; dentro de
  // cada um, as mais recentes primeiro.
  return list
    .map((item, index) => ({ item, index, who: samePerson(item.preacher) }))
    .sort((a, b) => (!a.who) - (!b.who) || a.who.localeCompare(b.who, 'pt') || a.index - b.index)
    .map(x => x.item)
}

// Os grupos da lista: por mês ("Novembro de 2026") ou, na ordem "Por
// pregador", um grupo por pregador.
export function sermonGroups(list, order = 'recent') {
  if (order !== 'preacher') return groupByMonth(list)
  const groups = []
  for (const item of list) {
    const key = samePerson(item.preacher) || 'sem-pregador'
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, label: item.preacher || 'Sem pregador', items: [item] })
  }
  return groups
}

const firstWords = (text, max = 6) => oneLine(text).split(' ').slice(0, max).join(' ')

// O cartão de uma pregação: tipo · data; o título (o campo "Título"; sem
// ele, "{Preletor} · {Instituição}" vira o título e a segunda linha some;
// sem nenhum dos dois, as primeiras palavras do texto); "{Pregador} ·
// {Instituição}"; o começo do que foi escrito; e as passagens citadas.
export function sermonCard(item, { now = new Date(), lang = 'pt' } = {}) {
  const who = [item.preacher, item.church].filter(Boolean).join(' · ')
  return {
    key: item.key,
    type: sermonTypeLabel(item.noteType),
    date: dateLabel(item.at, now),
    title: item.title || who || firstWords(item.text) || sermonTypeLabel(item.noteType),
    sub: item.title && who ? who : '',
    excerpt: oneLine(item.text),
    ...passagePills(item.passages, lang),
  }
}

export const EMPTY_SERMONS = 'Nenhuma pregação anotada ainda.'

// ── Marcações (L3, §4) ──────────────────────────────────────────────────

// "46 trechos · 11 livros"
export function marksSummary(items) {
  const n = items.length
  const books = new Set(items.map(i => i.book).filter(b => bookInfo(b))).size
  const parts = [`${formatInt(n)} ${plural(n, 'trecho', 'trechos')}`]
  if (books > 0) parts.push(`${formatInt(books)} ${plural(books, 'livro', 'livros')}`)
  return parts.join(' · ')
}

export const withNote = items => items.filter(i => i.note)

// O segmentado: Por livro · Por data · Com nota · {n}.
export function marksTabs(items) {
  return [
    { key: 'livro', label: 'Por livro' },
    { key: 'data', label: 'Por data' },
    { key: 'nota', label: `Com nota · ${formatInt(withNote(items).length)}` },
  ]
}

export const MARKS_PREVIEW = 2

// Por livro: um cartão por livro, em ordem canônica, com a cor do bloco,
// "{n} trechos", os trechos do mais recente para o mais antigo e, com
// mais de dois, "Ver os {n} de {Livro}" — que abre o livro no lugar.
export function marksByBook(items, lang = 'pt') {
  const byBook = new Map()
  for (const item of byRecent(items)) {
    if (!bookInfo(item.book)) continue
    if (!byBook.has(item.book)) byBook.set(item.book, [])
    byBook.get(item.book).push(item)
  }
  return [...byBook.entries()]
    .sort((a, b) => bookInfo(a[0]).posicao - bookInfo(b[0]).posicao)
    .map(([book, list]) => {
      const name = bookDisplayName(book, lang)
      return {
        book, name, blocoId: bookInfo(book).blocoId,
        count: `${formatInt(list.length)} ${plural(list.length, 'trecho', 'trechos')}`,
        items: list,
        more: list.length > MARKS_PREVIEW ? `Ver os ${formatInt(list.length)} de ${name}` : null,
      }
    })
}

// Os trechos de um livro que estão à vista: os dois mais recentes, ou
// todos, se o livro foi aberto.
export function bookMarksShown(group, expanded) {
  return expanded ? group.items : group.items.slice(0, MARKS_PREVIEW)
}

// Por data (todos) e Com nota (só os que têm nota), do mais recente para
// o mais antigo.
export function marksList(items, tab) {
  return byRecent(tab === 'nota' ? withNote(items) : items)
}

// Uma linha de trecho: a referência, quando e, se houver, a nota.
export function markRow(item, { now = new Date(), lang = 'pt' } = {}) {
  return {
    key: item.key,
    reference: itemReference(item, lang),
    when: whenLabel(item.at, now),
    note: item.note ? `Com nota: "${oneLine(item.note)}"` : null,
  }
}

export const EMPTY_MARKS = { livro: 'Nenhum trecho marcado ainda.', data: 'Nenhum trecho marcado ainda.', nota: 'Nenhuma marcação com nota ainda.' }

// ── O menu de um item (segurar) ─────────────────────────────────────────

// O que vai no "Compartilhar" de um item, em texto: o que a pessoa
// escreveu e de onde é. `verseText` é o trecho de uma marcação.
export function shareText(item, { lang = 'pt', verseText = '' } = {}) {
  if (item.type === 'pregacao') {
    const head = [item.title, [item.preacher, item.church].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
    return [head, item.text].filter(Boolean).join('\n\n')
  }
  if (item.type === 'marcacao') {
    const quote = verseText ? `"${oneLine(verseText)}"\n${itemReference(item, lang)}` : itemReference(item, lang)
    return [quote, item.note].filter(Boolean).join('\n\n')
  }
  return [item.text, item.book ? itemReference(item, lang) : ''].filter(Boolean).join('\n\n')
}
