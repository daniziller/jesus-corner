// referencia.js — o interpretador de referências da busca (handoff-
// biblia-52 §6.3). Diz se o que foi digitado pode ser lido como uma
// referência bíblica e de que jeitos: "jo 3 16" é João 3:16, mas também
// pode ser 1 João 3:16, Jó 3:16 ou Joel 3:16. Puro: não busca texto nem
// toca na tela — só nomes de livro, abreviações e a tabela de capítulos e
// versículos (data/versiculosPorCapitulo.js).
//
// Aceita: nome completo ou abreviação, com ou sem acento, com ou sem
// espaço depois do número ("1co", "1 co", "i co", "1 coríntios"); "salmo"
// e "salmos"; capítulo e versículo separados por dois-pontos, ponto,
// vírgula ou espaço ("3:16", "3.16", "3 16"); intervalo de versículos
// ("8:28-39") e de capítulos ("5-7").
//
// Ordem das leituras de uma abreviação ambígua: quem bate exato (a
// abreviação ou o nome inteiro) primeiro, depois quem começa com o que
// foi digitado; empate em ordem canônica. Uma tabela fixa só para "jo"
// (a ordem da captura B7). Só entram leituras que existem: o livro tem
// aquele capítulo e o capítulo tem aquele versículo.
import { GAMIFICATION_BOOKS, bookInfo } from '../data/gamificationBlocks.js'
import { BIBLE_BLOCKS } from '../data/bibleBlocks.js'
import { PT_BOOK_ABBREVIATIONS, EN_BOOK_ABBREVIATIONS } from '../bible/bookAbbreviations.js'
import { verseCount } from '../data/versiculosPorCapitulo.js'

// Minúsculas, sem acento, sem ponto de abreviação, espaços simples.
function clean(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim()
}
// Minúsculas e espaços simples, mas COM acento — só para reconhecer um
// nome escrito inteiro ("Jó" não é "jo").
function withAccents(text) {
  return String(text ?? '').normalize('NFC').toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim()
}
// "1co" e "1 co" viram a mesma chave ("1 co").
function bookKey(token) {
  const m = token.match(/^([123])\s*([a-z].*)$/)
  return m ? `${m[1]} ${m[2]}` : token
}

const BOOK_NAMES_EN = Object.fromEntries(BIBLE_BLOCKS.flatMap(block => block.books.map((book, i) => [book, block.booksEn[i]])))
const ORDER = Object.fromEntries(GAMIFICATION_BOOKS.map(b => [b.nome, bookInfo(b.nome).posicao]))
const canonical = (a, b) => ORDER[a] - ORDER[b]

// Nome do livro no idioma da conta.
export function bookDisplayName(nome, lang = 'pt') {
  return lang === 'en' ? BOOK_NAMES_EN[nome] ?? nome : nome
}

function buildIndex(names, abbreviations) {
  const exact = new Map() // chave → [livros]
  const add = (key, book) => {
    if (!ORDER[book]) return
    const list = exact.get(key) ?? []
    if (!list.includes(book)) exact.set(key, [...list, book])
  }
  const full = [] // [chave do nome inteiro, chave sem o número, livro]
  for (const b of GAMIFICATION_BOOKS) {
    const key = bookKey(clean(names(b.nome)))
    add(key, b.nome)
    full.push([key, key.replace(/^[123] /, ''), b.nome])
  }
  for (const [abbr, book] of Object.entries(abbreviations)) add(bookKey(clean(abbr)), book)
  return { exact, full }
}
const INDEX = {
  pt: buildIndex(nome => nome, PT_BOOK_ABBREVIATIONS),
  en: buildIndex(nome => BOOK_NAMES_EN[nome] ?? nome, EN_BOOK_ABBREVIATIONS),
}

// A ordem da captura B7.
const FIXED_ORDER = { jo: ['João', '1 João', 'Jó', 'Joel', 'Jonas'] }

// Os livros que um pedaço de texto pode querer dizer, na ordem das
// leituras: [{ book, exact }] — `exact` diz se bateu inteiro (abreviação
// ou nome) ou só pelo começo. O idioma da conta vem primeiro; o outro
// idioma completa.
// `written` é o mesmo pedaço como foi digitado, ainda com acento.
function matchBooks(token, lang, written = token) {
  const key = bookKey(clean(token))
  if (key.length < 2) return []
  if (FIXED_ORDER[key]) {
    // Escrito com o acento ("Jó 3"), o nome inteiro vence a ordem fixa —
    // quem digitou o acento disse qual livro quer.
    const named = FIXED_ORDER[key].find(book => withAccents(book) === withAccents(written))
    const order = named ? [named, ...FIXED_ORDER[key].filter(book => book !== named)] : FIXED_ORDER[key]
    return order.map(book => ({ book, exact: true }))
  }
  const order = lang === 'en' ? [INDEX.en, INDEX.pt] : [INDEX.pt, INDEX.en]
  const lookup = k => {
    const exact = []
    const prefix = []
    for (const index of order) {
      for (const book of index.exact.get(k) ?? []) if (!exact.includes(book)) exact.push(book)
      for (const [fullKey, bare, book] of index.full) {
        if ((fullKey.startsWith(k) || bare.startsWith(k)) && !prefix.includes(book)) prefix.push(book)
      }
    }
    return [...exact.map(book => ({ book, exact: true })), ...prefix.filter(b => !exact.includes(b)).sort(canonical).map(book => ({ book, exact: false }))]
  }
  const found = lookup(key)
  if (found.length) return found
  // Número do livro em algarismo romano: "i co", "ii pedro", "iii jo".
  const roman = key.match(/^(i{1,3}) ([a-z].*)$/)
  return roman ? lookup(`${roman[1].length} ${roman[2]}`) : []
}
export function booksForToken(token, lang = 'pt') {
  return matchBooks(token, lang, token).map(m => m.book)
}

// Os números depois do livro: capítulo, versículo, fim do intervalo.
function parseNumbers(rest) {
  const text = rest.replace(/[–—]/g, '-').replace(/[\s.,;:]+$/, '').trim()
  let m = text.match(/^(\d{1,3})(?:\s*[:.,]\s*|\s+)(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/)
  if (m) return { a: Number(m[1]), verse: Number(m[2]), verseEnd: m[3] != null ? Number(m[3]) : null }
  m = text.match(/^(\d{1,3})\s*-\s*(\d{1,3})$/)
  if (m) return { a: Number(m[1]), rangeEnd: Number(m[2]) }
  m = text.match(/^(\d{1,3})$/)
  return m ? { a: Number(m[1]) } : null
}

// Uma leitura só vale se existe. Livro de um capítulo só ("ob 4", "judas
// 5-7"): o número sozinho é o versículo — mas só quando o livro bateu
// inteiro; "joão 3" não vira 2 João 1:3.
function readingFor(book, n, exact) {
  const chapters = bookInfo(book).capitulos
  const reading = (chapter, verse = null, verseEnd = null, chapterEnd = null) => ({ book, chapter, verse, verseEnd, chapterEnd })
  if (n.verse != null) {
    if (n.a < 1 || n.a > chapters) return null
    const count = verseCount(book, n.a)
    if (n.verse < 1 || n.verse > count) return null
    if (n.verseEnd == null) return reading(n.a, n.verse)
    const end = Math.min(n.verseEnd, count)
    return end > n.verse ? reading(n.a, n.verse, end) : reading(n.a, n.verse)
  }
  if (chapters === 1 && n.a > 1 && exact) {
    const count = verseCount(book, 1)
    if (n.a > count) return null
    if (n.rangeEnd == null) return reading(1, n.a)
    const end = Math.min(n.rangeEnd, count)
    return end > n.a ? reading(1, n.a, end) : reading(1, n.a)
  }
  if (n.a < 1 || n.a > chapters) return null
  if (n.rangeEnd == null) return reading(n.a)
  const end = Math.min(n.rangeEnd, chapters)
  return end > n.a ? reading(n.a, null, null, end) : reading(n.a)
}

// O que o texto digitado pode ser:
//   null                                  — não é referência;
//   { type: 'book', books: [...] }        — só o livro (sem cartão; os
//                                           livros vão para o grupo LIVROS);
//   { type: 'ref', readings: [...] }      — referência; a primeira leitura é
//                                           a do cartão, as outras são
//                                           "também pode ser".
// Cada leitura: { book, chapter, verse, verseEnd, chapterEnd } (nulos onde
// não se aplica; `book` é o nome canônico em português).
export function interpretReference(text, { lang = 'pt' } = {}) {
  const cleaned = clean(text)
  const m = cleaned.match(/^((?:[123]\s*)?[a-z][a-z ]*?)\s*(\d.*)?$/)
  if (!m) return null
  // Os dois textos têm o mesmo comprimento (tirar o acento não muda a
  // posição das letras), então o pedaço do livro é o mesmo trecho.
  const matches = matchBooks(m[1], lang, withAccents(text).slice(0, m[1].length))
  if (!matches.length) return null
  if (m[2] == null) return { type: 'book', books: matches.map(x => x.book) }
  const numbers = parseNumbers(m[2])
  if (!numbers) return null
  const readings = matches.map(x => readingFor(x.book, numbers, x.exact)).filter(Boolean)
  return readings.length ? { type: 'ref', readings } : null
}

// "João 3:16" · "João 3" · "Romanos 8:28-39" · "Mateus 5–7".
export function formatReference(r, lang = 'pt') {
  const name = bookDisplayName(r.book, lang)
  if (r.verse != null) return `${name} ${r.chapter}:${r.verse}${r.verseEnd != null ? `-${r.verseEnd}` : ''}`
  return `${name} ${r.chapter}${r.chapterEnd != null ? `–${r.chapterEnd}` : ''}`
}

// O botão do cartão "Ir direto".
export function openReferenceLabel(r, lang = 'pt') {
  const name = bookDisplayName(r.book, lang)
  return r.verse != null ? `Abrir ${name} ${r.chapter} no versículo ${r.verse}` : `Abrir ${name} ${r.chapter}`
}

// Quais versículos o cartão mostra: o versículo pedido; num intervalo, os
// dois primeiros e "…" (quando há mais); só o capítulo, o primeiro.
export function referencePreview(r) {
  if (r.verse == null) return { chapter: r.chapter, verses: [1], ellipsis: false }
  if (r.verseEnd == null) return { chapter: r.chapter, verses: [r.verse], ellipsis: false }
  return { chapter: r.chapter, verses: [r.verse, r.verse + 1], ellipsis: r.verseEnd - r.verse > 1 }
}

// O que era, para o subtítulo das buscas recentes.
export function referenceKind(r) {
  if (r.verseEnd != null) return 'Trecho'
  if (r.verse != null) return 'Versículo'
  return r.chapterEnd != null ? 'Capítulos' : 'Capítulo'
}

// A linha "O capítulo inteiro" — só quando a referência aponta um
// versículo (com o capítulo sozinho, o cartão já abre o capítulo).
export function wholeChapterRow(r, lang = 'pt') {
  if (r.verse == null) return null
  const n = verseCount(r.book, r.chapter)
  return { title: `${bookDisplayName(r.book, lang)} ${r.chapter}`, sub: `${n} ${n === 1 ? 'versículo' : 'versículos'}` }
}
