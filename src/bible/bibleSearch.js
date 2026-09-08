// Busca de texto livre (39k/39l, Bloco 6 do pacote 39) — três tipos de
// resposta (versículos, livros, temas) mais o "palpite de referência" que
// alimenta o bloco "Ir direto". Não existe nenhum dado de busca pronto no
// app hoje (grep confirmado: bibleBlocks.js/bookInfo.js não têm abreviação
// nem índice de texto) — este arquivo monta os dois na hora, a partir do
// que já existe (BIBLE_BLOCKS pros nomes completos, bookAbbreviations.js
// pras formas curtas, o índice agregado gerado por
// scripts/build-bible-search-index.mjs pro texto em si).
import { BIBLE_BLOCKS } from '../data/bibleBlocks'
import { BIBLE_VERSIONS } from '../data/bibleVersions'
import { normalizeForSearch, findAllOccurrences } from './searchNormalize'
import { PT_BOOK_ABBREVIATIONS, EN_BOOK_ABBREVIATIONS } from './bookAbbreviations'

// Nome completo (pt e en, normalizado) de cada livro também é um alias —
// "genesis" ou "gênesis" (sem abreviar) precisam achar o livro tanto
// quanto "gn". Construído 1x, na carga do módulo.
function buildBookAliasMap() {
  const map = new Map()
  for (const block of BIBLE_BLOCKS) {
    for (let i = 0; i < block.books.length; i++) {
      const book = block.books[i]
      map.set(normalizeForSearch(book), book)
      map.set(normalizeForSearch(block.booksEn[i]), book)
    }
  }
  for (const [k, v] of Object.entries(PT_BOOK_ABBREVIATIONS)) map.set(normalizeForSearch(k), v)
  for (const [k, v] of Object.entries(EN_BOOK_ABBREVIATIONS)) map.set(normalizeForSearch(k), v)
  return map
}
const BOOK_ALIAS_MAP = buildBookAliasMap()

// bookEn/testamento a partir do nome canônico (pt) — evita duplicar esses
// dois dados em cada passagem de src/bible/themes.js (derivável de
// BIBLE_BLOCKS, a mesma fonte de sempre). `tag` já vem como "Bloco N · AT"
// ou "Bloco N · NT" (ver bibleBlocks.js) — só olha as duas últimas letras.
function findBlockFor(book) {
  return BIBLE_BLOCKS.find(b => b.books.includes(book))
}
export function bookEnFor(book) {
  const block = findBlockFor(book)
  if (!block) return book
  return block.booksEn[block.books.indexOf(book)]
}
export function testamentForBook(book) {
  const block = findBlockFor(book)
  return block?.tag?.endsWith('NT') ? 'nt' : 'at'
}

// Cache em memória do módulo — 1 fetch por versão por sessão do app (o
// índice agregado não muda depois do build), igual ao padrão de
// bibleTextStore.js.
const indexCache = new Map()

export function loadSearchIndex(lang) {
  const folder = (BIBLE_VERSIONS[lang] ?? BIBLE_VERSIONS.pt)[0].folder
  if (indexCache.has(folder)) return indexCache.get(folder)
  const promise = fetch(`/bible-text/search-index/${folder}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`search index not found: ${folder}`)
      return res.json()
    })
    // Normaliza 1x, na carga — não guardado no arquivo em si (quase
    // dobraria o tamanho baixado só pra economizar um cálculo que roda
    // uma vez por sessão, ver comentário em build-bible-search-index.mjs).
    .then(entries => entries.map(e => ({ ...e, norm: normalizeForSearch(e.text) })))
  indexCache.set(folder, promise)
  return promise
}

// "Ir direto" (39k, bloco 3) — só existe quando a busca parece MESMO uma
// referência: um pedaço de livro (nome completo ou abreviado) seguido de
// um número de capítulo, opcionalmente ":versículo"/".versículo"/
// ",versículo". Valida o capítulo/versículo contra o índice de verdade
// (não uma tabela de "livro tem N capítulos" à parte, que poderia
// dessincronizar) — sem bater, não há palpite (regra do quadro: "quando
// não há palpite claro, o bloco não existe").
export function guessReference(query, entries) {
  const trimmed = query.trim()
  if (!trimmed) return null
  const m = trimmed.match(/^(.+?)\s+(\d{1,3})(?:[:.,](\d{1,3}))?$/)
  if (!m) return null
  const bookPart = m[1].trim()
  const chapter = Number(m[2])
  const verse = m[3] != null ? Number(m[3]) : null
  const canonical = BOOK_ALIAS_MAP.get(normalizeForSearch(bookPart))
  if (!canonical) return null
  const chapterEntries = entries.filter(e => e.book === canonical && e.chapter === chapter)
  if (!chapterEntries.length) return null
  if (verse != null && !chapterEntries.some(e => e.verse === verse)) return null
  return {
    book: canonical,
    bookEn: chapterEntries[0].bookEn,
    chapter,
    verse,
    verseCount: chapterEntries.length,
    firstLine: chapterEntries[0].text,
  }
}

// Versículos cujo texto contém o termo (todas as ocorrências, não só a
// 1ª — ver `positions`, usado pra destacar cada uma). Capítulos já lidos
// sobem (regra do quadro: "é mais provável que ela esteja procurando o
// que já viu") — o resto mantém a ordem canônica em que o índice já vem
// (ver build-bible-search-index.mjs: gerado percorrendo BIBLE_BLOCKS em
// ordem), e Array.prototype.sort é estável, então não precisa recalcular
// essa ordem aqui.
export function searchVerses(query, entries, completedSet) {
  const term = normalizeForSearch(query.trim())
  if (!term) return []
  const matches = []
  for (const e of entries) {
    const positions = findAllOccurrences(e.norm, term)
    if (positions.length) matches.push({ ...e, positions, termLength: term.length })
  }
  matches.sort((a, b) => {
    const aRead = completedSet?.has(`${a.book}:${a.chapter}`) ? 0 : 1
    const bRead = completedSet?.has(`${b.book}:${b.chapter}`) ? 0 : 1
    return aRead - bRead
  })
  return matches
}

// Livros cujo nome (completo, no idioma exibido) contém o termo.
export function searchBooks(query, lang) {
  const term = normalizeForSearch(query.trim())
  if (!term) return []
  const results = []
  for (const block of BIBLE_BLOCKS) {
    for (let i = 0; i < block.books.length; i++) {
      const book = block.books[i]
      const bookEn = block.booksEn[i]
      const display = lang === 'en' ? bookEn : book
      if (normalizeForSearch(display).includes(term)) results.push({ book, bookEn, block })
    }
  }
  return results
}

// Temas cujo título ou palavras-chave batem com o termo (ver
// src/bible/themes.js pro dado em si).
export function searchThemes(query, themes, lang) {
  const term = normalizeForSearch(query.trim())
  if (!term) return []
  return themes.filter(th => {
    const title = lang === 'en' ? th.titleEn : th.title
    if (normalizeForSearch(title).includes(term)) return true
    return (th.keywords ?? []).some(k => normalizeForSearch(k).includes(term))
  })
}

// Recorta `text` (original, com acento/caixa) em segmentos { text,
// highlighted }, um por ocorrência do termo — `positions`/`termLength` vêm
// de searchVerses acima, já nas posições certas do texto ORIGINAL (ver
// searchNormalize.js pra por que isso é seguro).
export function splitHighlightSegments(text, positions, termLength) {
  if (!positions?.length) return [{ text, highlighted: false }]
  const segments = []
  let cursor = 0
  for (const pos of positions) {
    if (pos > cursor) segments.push({ text: text.slice(cursor, pos), highlighted: false })
    segments.push({ text: text.slice(pos, pos + termLength), highlighted: true })
    cursor = pos + termLength
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false })
  return segments
}
