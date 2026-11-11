// palavra.js — a busca por palavra ou expressão (handoff-biblia-52 §6.2,
// B6), parte pura: como o texto digitado é comparado (sem acento, sem
// caixa, sem pontuação), o realce de todas as ocorrências, os cinco grupos
// de resultado, as contagens e os filtros de tipo e de testamento.
//
// O índice de versículos é o de sempre (bible/bibleSearch.js,
// loadSearchIndex): cada entrada traz `norm`, o texto em minúsculas e sem
// acento COM O MESMO COMPRIMENTO do original — por isso a posição achada
// em `norm` é a posição do trecho no texto de verdade, e dá para realçar
// sem mapa de posições.
import { normalizeForSearch } from '../bible/searchNormalize.js'
import { formatVerseRanges } from '../utils/verseRanges.js'
import { bookInfo } from '../data/gamificationBlocks.js'
import { verseCount } from '../data/versiculosPorCapitulo.js'
import { formatInt } from '../gamification/format.js'
import { testamentOfBook } from '../biblia/bibliaMath.js'
import { bookDisplayName } from './referencia.js'
import { bookRow, passageReference } from './buscaMath.js'

export const MIN_QUERY_LENGTH = 2
export const VERSES_PREVIEW = 4
export const VERSES_PAGE = 30

// Filtro de testamento (B6).
export const TESTAMENT_FILTERS = [
  { id: 'all', label: 'Toda a Bíblia' },
  { id: 'at', label: 'Antigo Testamento' },
  { id: 'nt', label: 'Novo Testamento' },
]

const inTestament = (book, testament) => testament === 'all' || testamentOfBook(book) === testament
const order = book => bookInfo(book)?.posicao ?? 999

// As palavras do que foi digitado: minúsculas, sem acento, e tudo o que
// não é letra nem número vira separação ("não temerei, mal" → nao temerei
// mal).
export function queryWords(query) {
  return normalizeForSearch(String(query ?? '')).split(/[^a-z0-9]+/).filter(Boolean)
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// O comparador de uma busca; nulo quando ainda não há o que procurar
// (menos de 2 caracteres). `ranges(norm)` devolve todas as ocorrências em
// um texto já normalizado, como [início, comprimento]. Entre duas palavras
// da busca cabe qualquer pontuação ou espaço do texto — "bem aventurados"
// acha "bem-aventurados", "medo pois" acha "medo, pois".
export function buildMatcher(query) {
  const words = queryWords(query)
  const term = words.join(' ')
  if (term.length < MIN_QUERY_LENGTH) return null
  if (words.length === 1) {
    const word = words[0]
    return {
      term,
      test: norm => norm.includes(word),
      ranges(norm) {
        const out = []
        for (let from = norm.indexOf(word); from !== -1; from = norm.indexOf(word, from + word.length)) out.push([from, word.length])
        return out
      },
    }
  }
  const source = words.map(escapeRegExp).join('[^a-z0-9]+')
  const probe = new RegExp(source)
  return {
    term,
    test: norm => probe.test(norm),
    ranges(norm) {
      const out = []
      for (const m of norm.matchAll(new RegExp(source, 'g'))) out.push([m.index, m[0].length])
      return out
    },
  }
}

// Bate em um texto qualquer (nome de passagem, tema, nota)?
export function matchesText(matcher, text) {
  return !!text && matcher.test(normalizeForSearch(String(text)))
}

// Recorta o texto original em pedaços { text, highlighted } — um pedaço
// realçado por ocorrência.
export function highlightSegments(text, ranges) {
  if (!ranges?.length) return [{ text, highlighted: false }]
  const segments = []
  let cursor = 0
  for (const [start, length] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), highlighted: false })
    segments.push({ text: text.slice(start, start + length), highlighted: true })
    cursor = start + length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false })
  return segments
}

// ── Os grupos ───────────────────────────────────────────────────────────

// VERSÍCULOS: as entradas do índice que contêm o termo, na ordem canônica
// em que o índice já vem. Devolve as próprias entradas (sem cópia — podem
// ser milhares); o realce é calculado só para as que vão para a tela.
export function searchVerses(matcher, entries, testament = 'all') {
  const out = []
  for (const e of entries ?? []) if (matcher.test(e.norm) && inTestament(e.book, testament)) out.push(e)
  return out
}

// LIVROS: os que o interpretador de referências já reconhece no texto
// ("joão" → João, 1 João, 2 João, 3 João), mais os que têm o termo no
// meio do nome. `books` é a lista do interpretador (ou vazia).
export function searchBooks(matcher, books, allBooks, progress, lang = 'pt', testament = 'all') {
  const found = [...(books ?? [])]
  const rest = allBooks.filter(nome => !found.includes(nome) && (matchesText(matcher, nome) || matchesText(matcher, bookDisplayName(nome, lang))))
  return [...found, ...rest.sort((a, b) => order(a) - order(b))].filter(nome => inTestament(nome, testament)).map(nome => bookRow(nome, progress, lang))
}

// PASSAGENS: pelo nome ou pelas palavras alternativas. Um capítulo inteiro
// diz quantos versículos tem ("Salmos 23 · 6 versículos").
export function searchPassages(matcher, passages, lang = 'pt', testament = 'all') {
  return (passages ?? [])
    .filter(p => inTestament(p.livro, testament) && (matchesText(matcher, p.nome) || (p.palavras ?? []).some(w => matchesText(matcher, w))))
    .map(p => {
      const whole = p.versInicio == null && p.capInicio === p.capFim
      const n = whole ? verseCount(p.livro, p.capInicio) : 0
      return { passage: p, title: p.nome, sub: whole ? `${passageReference(p, lang)} · ${formatInt(n)} ${n === 1 ? 'versículo' : 'versículos'}` : passageReference(p, lang) }
    })
}

function themeEdge(passage, lang, last) {
  if (lang !== 'en' && passage.book === 'Salmos') return `${last ? 'ao' : 'do'} Salmo ${passage.chStart}`
  return `${last ? 'a' : 'de'} ${bookDisplayName(passage.book, lang)} ${passage.chStart}`
}

// "18 trechos · do Salmo 23 a Apocalipse 7".
export function themeSub(theme, lang = 'pt') {
  const list = theme.passages ?? []
  const n = list.length
  const count = `${formatInt(n)} ${n === 1 ? 'trecho' : 'trechos'}`
  return n ? `${count} · ${themeEdge(list[0], lang, false)} ${themeEdge(list[n - 1], lang, true)}` : count
}

// TEMAS: pelo título ou pelas palavras-chave. Com o filtro de testamento,
// fica o tema que tem algum trecho naquele testamento.
export function searchThemes(matcher, themes, lang = 'pt', testament = 'all') {
  return (themes ?? [])
    .filter(th => matchesText(matcher, lang === 'en' ? th.titleEn : th.title) || matchesText(matcher, th.title) || (th.keywords ?? []).some(k => matchesText(matcher, k)))
    .filter(th => testament === 'all' || (th.passages ?? []).some(p => inTestament(p.book, testament)))
    .map(th => ({ id: th.id, title: (lang === 'en' ? th.titleEn : th.title) ?? th.title, sub: themeSub(th, lang), count: (th.passages ?? []).length }))
}

const oneLine = text => String(text).replace(/\s+/g, ' ').trim()

// NAS SUAS NOTAS: as notas de versículo (uma marcação com texto ou
// etiqueta — a folha de 39f) e as notas de leitura de um capítulo, só as
// que têm referência bíblica. Procura no texto da nota e nas etiquetas.
// Cada linha: a referência e o começo da nota entre aspas (ou as
// etiquetas, quando a nota não tem texto). `noteId` é o da marcação, para
// a leitura abrir com a nota aberta; nulo nas notas de capítulo.
export function searchNotes(matcher, { highlights, notes } = {}, lang = 'pt', testament = 'all') {
  const rows = []
  for (const h of highlights ?? []) {
    if (!h || h.hidden || !h.book || !h.chapter || !h.verses?.length || !bookInfo(h.book)) continue
    const tags = (h.tags ?? []).filter(Boolean)
    if (!h.text?.trim() && !tags.length) continue
    if (!matchesText(matcher, h.text) && !tags.some(tag => matchesText(matcher, tag))) continue
    if (!inTestament(h.book, testament)) continue
    const verse = Math.min(...h.verses)
    rows.push({
      key: `marcacao:${h.id}`, book: h.book, chapter: h.chapter, verse, noteId: h.id,
      title: `${bookDisplayName(h.book, lang)} ${h.chapter}:${formatVerseRanges(h.verses)}`,
      sub: h.text?.trim() ? `"${oneLine(h.text)}"` : tags.join(' · '),
    })
  }
  for (const [key, entry] of Object.entries(notes ?? {})) {
    const m = key.match(/^(.+):(\d+)-(\d+)$/)
    if (!m || !bookInfo(m[1])) continue
    const text = typeof entry === 'string' ? entry : entry?.text
    if (!text?.trim() || !matchesText(matcher, text) || !inTestament(m[1], testament)) continue
    const chStart = Number(m[2])
    const chEnd = Number(m[3])
    rows.push({
      key: `nota:${key}`, book: m[1], chapter: chStart, verse: null, noteId: null,
      title: `${bookDisplayName(m[1], lang)} ${chStart}${chEnd !== chStart ? `–${chEnd}` : ''}`,
      sub: `"${oneLine(text)}"`,
    })
  }
  return rows.sort((a, b) => order(a.book) - order(b.book) || a.chapter - b.chapter || (a.verse ?? 0) - (b.verse ?? 0))
}

// ── Contagens e filtros ─────────────────────────────────────────────────

// Quantos resultados em cada tipo; "Tudo" é a soma.
export function searchCounts({ books = [], verses = [], passages = [], themes = [], notes = [] }) {
  const counts = { books: books.length, verses: verses.length, passages: passages.length, themes: themes.length, notes: notes.length }
  return { all: counts.books + counts.verses + counts.passages + counts.themes + counts.notes, ...counts }
}

const PILLS = [['all', 'Tudo'], ['books', 'Livros'], ['verses', 'Versículos'], ['passages', 'Passagens'], ['themes', 'Temas'], ['notes', 'Notas']]

// As pastilhas com contagem (B6): "Tudo" e só os tipos que têm resultado.
export function filterPills(counts) {
  return PILLS.filter(([id]) => id === 'all' || counts[id] > 0).map(([id, label]) => ({ id, label, count: counts[id] }))
}

// O filtro que vale: o escolhido, se tem resultado; senão, "Tudo".
export function effectiveFilter(filter, counts) {
  return filter !== 'all' && counts[filter] > 0 ? filter : 'all'
}

// ── Textos ──────────────────────────────────────────────────────────────

export function versesLabel(n) {
  return `${formatInt(n)} ${n === 1 ? 'versículo' : 'versículos'}`
}
export function seeAllVersesLabel(n) {
  return `Ver os ${formatInt(n)} versículos`
}
export function themeRecentSub(n) {
  return `Tema · ${formatInt(n)} ${n === 1 ? 'trecho' : 'trechos'}`
}
// Nada encontrado: o termo como foi digitado e o nome curto da versão.
// Quando só o filtro de testamento esvaziou o resultado, diz o testamento.
export function emptyMessage(query, versionShort, testament = 'all') {
  const where = testament === 'at' ? 'no Antigo Testamento' : testament === 'nt' ? 'no Novo Testamento' : `na ${versionShort}`
  return {
    title: `Nada com "${String(query).trim()}" ${where}.`,
    sub: 'A busca é no texto desta versão. Tente outra palavra, ou procure por tema.',
  }
}
