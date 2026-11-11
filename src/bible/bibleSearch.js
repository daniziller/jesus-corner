// O índice de texto da Bíblia e os utilitários que a busca (BuscaScreen.jsx)
// e a tela do tema (ThemeAsStudyScreen.jsx) dividem: carregar o índice
// agregado de uma versão (gerado por scripts/build-bible-search-index.mjs),
// achar o nome em inglês e o testamento de um livro, e recortar um texto
// nos trechos a destacar. A busca em si — comparação, grupos, contagens —
// mora em src/busca/.
import { BIBLE_BLOCKS } from '../data/bibleBlocks'
import { BIBLE_VERSIONS } from '../data/bibleVersions'
import { normalizeForSearch } from './searchNormalize'

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

// Recorta `text` (original, com acento/caixa) em segmentos { text,
// highlighted }, um por ocorrência do termo — `positions`/`termLength` vêm
// de findAllOccurrences (searchNormalize.js), já nas posições certas do
// texto ORIGINAL (ver lá por que isso é seguro).
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
