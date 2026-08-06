// Gera public/bible-text/<versao>/<slug>.json a partir da API.Bible
// (rest.api.bible) — versões licenciadas: NLT (inglês) e NVT (português).
// Precisa de API_BIBLE_KEY no ambiente (.env local, nunca commitado).
//
// Usa BIBLE_BLOCKS (a mesma fonte da verdade que o resto do app já usa) pra
// determinar a ordem canônica dos 66 livros e os nomes exatos (pt/en) que o
// app espera — o slug gerado aqui bate com o slug que o app calcula em
// runtime (ver src/utils/slugify.js), sem precisar de tabela de mapeamento
// extra. Os códigos USFM de 3 letras abaixo são universais (mesma ordem
// canônica em qualquer idioma), então bastam UMA tabela pros dois idiomas.
//
// node scripts/build-bible-text.mjs

import { writeFile, mkdir } from 'node:fs/promises'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const OUT_DIR = new URL('../public/bible-text/', import.meta.url)
const EXPECTED_TOTAL_VERSES = 31102
const API_BASE = 'https://rest.api.bible/v1'
const API_KEY = process.env.API_BIBLE_KEY
const REQUEST_DELAY_MS = 150

const VERSIONS = [
  { key: 'en', folder: 'en-nlt', bibleId: 'd6e14a625393b4da-01', label: 'NLT' },
  { key: 'pt', folder: 'pt-nvt', bibleId: '41a6caa722a21d88-01', label: 'NVT' },
]

// Ordem canônica dos 66 livros — mesma posição de BIBLE_BLOCKS.pt/en.
const USFM_CODES = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST',
  'JOB', 'PSA', 'PRO', 'ECC', 'SNG',
  'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN',
  'ACT',
  'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD',
  'REV',
]

function canonicalBooks() {
  const pt = []
  const en = []
  for (const block of BIBLE_BLOCKS) {
    pt.push(...block.books)
    en.push(...block.booksEn)
  }
  if (pt.length !== 66 || en.length !== 66 || USFM_CODES.length !== 66) {
    throw new Error(`Esperava 66 livros, achei pt=${pt.length} en=${en.length} usfm=${USFM_CODES.length}`)
  }
  return { pt, en }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Faz a chamada com retry/backoff em 429 (limite de requisição) — a API não
// expõe headers de rate limit, então trata qualquer 429 genericamente.
async function apiGet(path, attempt = 1) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'api-key': API_KEY } })
  if (res.status === 429 && attempt <= 5) {
    const wait = attempt * 1000
    console.warn(`  429 recebido, esperando ${wait}ms (tentativa ${attempt})...`)
    await sleep(wait)
    return apiGet(path, attempt + 1)
  }
  if (!res.ok) throw new Error(`Falha ao buscar ${path}: ${res.status} ${await res.text().catch(() => '')}`)
  return res.json()
}

// O conteúdo vem em blocos de nível superior (parágrafos/linhas de poesia)
// — cada um com uma lista de items que podem ser texto puro, o marcador de
// número de versículo (tag "verse", só um rótulo "1"/"2", não é texto de
// verdade — pulado inteiro), ou um tag de estilo de caractere (ex: "char"
// com style "sc" pra versaletes em "SENHOR") que embrulha MAIS texto do
// mesmo versículo.
//
// Dois casos diferentes de fragmento "colado sem espaço" aparecem na API:
//   1. Versaletes: "O temor do S" + <char sc>"enhor"</char> — fragmentos
//      DENTRO do mesmo bloco, sem espaço de propósito (é a mesma palavra
//      "Senhor" partida só por causa do estilo visual).
//   2. Parágrafos/linhas de poesia diferentes pro mesmo versículo (comum em
//      genealogias e poesia paralela): "Obed was the father of Jesse." +
//      "Jesse was..." em BLOCOS separados — aqui falta mesmo um espaço.
// A regra: só a PRIMEIRA peça de texto de cada bloco de nível superior
// passa pela checagem de "precisa de espaço" (fronteira entre blocos);
// qualquer fragmento depois disso, dentro do mesmo bloco, é colado cru,
// confiando nos espaços literais que já vêm no próprio texto.
function extractVerses(topLevelBlocks, chapterNum, chapters) {
  for (const block of topLevelBlocks) {
    if (!block.items) continue
    const state = { isFirstInBlock: true }
    walkBlockItems(block.items, chapterNum, chapters, state)
  }
}

function walkBlockItems(items, chapterNum, chapters, state) {
  for (const item of items) {
    if (item.type === 'tag' && item.name === 'verse') continue
    if (item.type === 'text') {
      const verseId = item.attrs?.verseId
      if (!verseId) continue // texto sem verseId = título de seção, pula
      const verseNum = verseId.split('.').pop()
      chapters[chapterNum] ??= {}
      const existing = chapters[chapterNum][verseNum] ?? ''
      let addition = item.text
      if (state.isFirstInBlock) {
        state.isFirstInBlock = false
        const needsSpace = existing.length > 0 && !/\s$/.test(existing) && !/^[\s.,;:!?)'"]/.test(addition)
        if (needsSpace) addition = ' ' + addition
      }
      chapters[chapterNum][verseNum] = existing + addition
      continue
    }
    if (item.items) walkBlockItems(item.items, chapterNum, chapters, state)
  }
}

function countVerses(chapters) {
  return Object.values(chapters).reduce((sum, verses) => sum + Object.keys(verses).length, 0)
}

async function fetchBookChapters(bibleId, bookId) {
  const bookData = await apiGet(`/bibles/${bibleId}/books/${bookId}?include-chapters=true`)
  const chapterNumbers = bookData.data.chapters
    .map(c => c.number)
    .filter(n => n !== 'intro')

  const chapters = {}
  for (const num of chapterNumbers) {
    const chData = await apiGet(`/bibles/${bibleId}/chapters/${bookId}.${num}?content-type=json`)
    extractVerses(chData.data.content, num, chapters)
    await sleep(REQUEST_DELAY_MS)
  }
  return chapters
}

async function main() {
  if (!API_KEY) throw new Error('API_BIBLE_KEY não definida no ambiente (.env local).')
  const { pt, en } = canonicalBooks()
  const namesByLang = { pt, en }

  for (const version of VERSIONS) {
    await mkdir(new URL(`${version.folder}/`, OUT_DIR), { recursive: true })
    const names = namesByLang[version.key]

    console.log(`Baixando ${version.label} (${version.folder}), livro por livro...`)
    let total = 0
    for (let i = 0; i < 66; i++) {
      const usfm = USFM_CODES[i]
      const chapters = await fetchBookChapters(version.bibleId, usfm)
      const n = countVerses(chapters)
      if (n === 0) throw new Error(`Capítulo vazio detectado em ${version.folder}: ${usfm} (${names[i]})`)
      total += n

      // colapsa espaços (fragmentos de texto concatenados podem deixar
      // espaço duplo) igual o parser da BLIVRE já fazia antes.
      for (const ch of Object.keys(chapters)) {
        for (const vs of Object.keys(chapters[ch])) {
          chapters[ch][vs] = chapters[ch][vs].replace(/\s+/g, ' ').trim()
        }
      }

      const slug = slugify(names[i])
      await writeFile(new URL(`${version.folder}/${slug}.json`, OUT_DIR), JSON.stringify(chapters))
      console.log(`  ${i + 1}/66 ${usfm} (${names[i]}) — ${n} versículos`)
    }
    console.log(`${version.label}: ${total} versículos escritos em 66 arquivos.`)
    if (Math.abs(total - EXPECTED_TOTAL_VERSES) > 400) {
      throw new Error(`Contagem de versículos ${version.label} (${total}) muito distante do esperado (${EXPECTED_TOTAL_VERSES})`)
    }
  }

  console.log('OK — geração concluída.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
