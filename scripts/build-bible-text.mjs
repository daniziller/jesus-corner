// Gera public/bible-text/<versao>/<slug>.json a partir de 3 fontes públicas
// de domínio público / uso livre (rodar 1 vez manualmente, não faz parte do
// build/deploy):
//   - Inglês (WEB): github.com/TehShrike/world-english-bible (66 arquivos/livro)
//   - Português (Almeida 1911): github.com/BibliaJFAAL/JFAAL (1 arquivo, 66 livros)
//   - Português (Bíblia Livre / BLIVRE): github.com/blivre/BibliaLivre (66
//     arquivos/livro, formato de marcação próprio — ver parseBlivreBook)
//
// Usa BIBLE_BLOCKS (a mesma fonte da verdade que o resto do app já usa) pra
// determinar a ordem canônica dos 66 livros e os nomes exatos (pt/en) que o
// app espera — assim o slug gerado aqui bate com o slug que o app calcula em
// runtime (ver src/utils/slugify.js) sem precisar de tabela de mapeamento
// fora deste script.
//
// node scripts/build-bible-text.mjs

import { writeFile, mkdir } from 'node:fs/promises'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const OUT_DIR = new URL('../public/bible-text/', import.meta.url)
const EXPECTED_TOTAL_VERSES = 31102

// TehShrike/world-english-bible não usa nomes deriváveis por slugify direto
// (ex: "Song of Songs" -> "songofsolomon"), então essa tabela pequena
// mapeia cada nome EN (na mesma ordem/grafia de bibleBlocks.js) pro nome de
// arquivo real do repositório-fonte.
const WEB_FILENAMES = {
  'Genesis': 'genesis', 'Exodus': 'exodus', 'Leviticus': 'leviticus', 'Numbers': 'numbers', 'Deuteronomy': 'deuteronomy',
  'Joshua': 'joshua', 'Judges': 'judges', 'Ruth': 'ruth', '1 Samuel': '1samuel', '2 Samuel': '2samuel', '1 Kings': '1kings', '2 Kings': '2kings', '1 Chronicles': '1chronicles', '2 Chronicles': '2chronicles', 'Ezra': 'ezra', 'Nehemiah': 'nehemiah', 'Esther': 'esther',
  'Job': 'job', 'Psalms': 'psalms', 'Proverbs': 'proverbs', 'Ecclesiastes': 'ecclesiastes', 'Song of Songs': 'songofsolomon',
  'Isaiah': 'isaiah', 'Jeremiah': 'jeremiah', 'Lamentations': 'lamentations', 'Ezekiel': 'ezekiel', 'Daniel': 'daniel', 'Hosea': 'hosea', 'Joel': 'joel', 'Amos': 'amos', 'Obadiah': 'obadiah', 'Jonah': 'jonah', 'Micah': 'micah', 'Nahum': 'nahum', 'Habakkuk': 'habakkuk', 'Zephaniah': 'zephaniah', 'Haggai': 'haggai', 'Zechariah': 'zechariah', 'Malachi': 'malachi',
  'Matthew': 'matthew', 'Mark': 'mark', 'Luke': 'luke', 'John': 'john',
  'Acts': 'acts',
  'Romans': 'romans', '1 Corinthians': '1corinthians', '2 Corinthians': '2corinthians', 'Galatians': 'galatians', 'Ephesians': 'ephesians', 'Philippians': 'philippians', 'Colossians': 'colossians', '1 Thessalonians': '1thessalonians', '2 Thessalonians': '2thessalonians', '1 Timothy': '1timothy', '2 Timothy': '2timothy', 'Titus': 'titus', 'Philemon': 'philemon', 'Hebrews': 'hebrews', 'James': 'james', '1 Peter': '1peter', '2 Peter': '2peter', '1 John': '1john', '2 John': '2john', '3 John': '3john', 'Jude': 'jude',
  'Revelation': 'revelation',
}

// blivre/BibliaLivre usa abreviações em português próprias, também não
// deriváveis por slugify (ex: "Jó" -> "jo", mas "1 Samuel" -> "1sa").
const BLIVRE_FILENAMES = {
  'Gênesis': 'gen', 'Êxodo': 'exod', 'Levítico': 'lev', 'Números': 'num', 'Deuteronômio': 'deut',
  'Josué': 'jos', 'Juízes': 'juiz', 'Rute': 'rute', '1 Samuel': '1sa', '2 Samuel': '2sa', '1 Reis': '1rs', '2 Reis': '2rs', '1 Crônicas': '1crn', '2 Crônicas': '2crn', 'Esdras': 'esd', 'Neemias': 'nee', 'Ester': 'est',
  'Jó': 'jo', 'Salmos': 'sal', 'Provérbios': 'prov', 'Eclesiastes': 'ecl', 'Cântico dos Cânticos': 'cant',
  'Isaías': 'isa', 'Jeremias': 'jer', 'Lamentações': 'lam', 'Ezequiel': 'eze', 'Daniel': 'dan', 'Oseias': 'ose', 'Joel': 'joel', 'Amós': 'amos', 'Obadias': 'oba', 'Jonas': 'jon', 'Miquéias': 'miq', 'Naum': 'naum', 'Habacuque': 'hab', 'Sofonias': 'sof', 'Ageu': 'ageu', 'Zacarias': 'zac', 'Malaquias': 'mal',
  'Mateus': 'mat', 'Marcos': 'mar', 'Lucas': 'luc', 'João': 'joao',
  'Atos': 'atos',
  'Romanos': 'rom', '1 Coríntios': '1cor', '2 Coríntios': '2cor', 'Gálatas': 'gal', 'Efésios': 'efes', 'Filipenses': 'fil', 'Colossenses': 'col', '1 Tessalonicenses': '1tes', '2 Tessalonicenses': '2tes', '1 Timóteo': '1tim', '2 Timóteo': '2tim', 'Tito': 'tito', 'Filemon': 'flm', 'Hebreus': 'heb', 'Tiago': 'tiag', '1 Pedro': '1ped', '2 Pedro': '2ped', '1 João': '1joao', '2 João': '2joao', '3 João': '3joao', 'Judas': 'jud',
  'Apocalipse': 'apo',
}

function canonicalBooks() {
  const pt = []
  const en = []
  for (const block of BIBLE_BLOCKS) {
    pt.push(...block.books)
    en.push(...block.booksEn)
  }
  if (pt.length !== 66 || en.length !== 66) {
    throw new Error(`Esperava 66 livros, achei pt=${pt.length} en=${en.length}`)
  }
  return { pt, en }
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao buscar ${url}: ${res.status}`)
  return res.json()
}

// WEB: cada item da lista tem (às vezes) chapterNumber+verseNumber+value —
// junta tudo que cair no mesmo capítulo/versículo, ignorando o campo
// "type" (que varia entre prosa/poesia) já que só o texto importa aqui.
function compactWebBook(rawItems) {
  const chapters = {}
  for (const item of rawItems) {
    if (item.chapterNumber == null || item.verseNumber == null || !item.value) continue
    const ch = String(item.chapterNumber)
    const vs = String(item.verseNumber)
    chapters[ch] ??= {}
    chapters[ch][vs] = (chapters[ch][vs] ? chapters[ch][vs] + ' ' : '') + item.value.trim()
  }
  return chapters
}

function compactAlmeidaBook(bookEntry) {
  const chapters = {}
  for (const chapter of bookEntry.chapters) {
    const verses = {}
    for (const v of chapter.verses) verses[String(v.verse)] = v.text.trim()
    chapters[String(chapter.chapter)] = verses
  }
  return chapters
}

function countVerses(chapters) {
  return Object.values(chapters).reduce((sum, verses) => sum + Object.keys(verses).length, 0)
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao buscar ${url}: ${res.status}`)
  return res.text()
}

// Formato de marcação próprio da BLIVRE: cabeçalho (name-long/name-short/
// abbreviation/ubs-code) antes do 1o "\v", depois um "\v Livro.Cap.Vers" por
// linha seguido do texto do versículo (pode ocupar várias linhas por causa
// de tags inline). \added.../\*added mantém o texto (só remove a marcação
// de "palavra implícita"); \fn/\*fn (nota de rodapé, com \key aninhado) e
// \ref/\*ref (referência cruzada) e \psalm-title/\*psalm-title (cabeçalho
// de salmo) são descartados inteiros — não são texto do versículo em si.
function parseBlivreBook(raw) {
  const lines = raw.split('\n')
  const chapters = {}
  let started = false
  let skipUntil = null
  let curCh = null
  let curVs = null
  let buffer = []

  function flush() {
    if (curCh != null && curVs != null) {
      const text = buffer.join(' ').replace(/\s+/g, ' ').trim()
      if (text) {
        chapters[curCh] ??= {}
        chapters[curCh][curVs] = text
      }
    }
    buffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!started) {
      if (line.startsWith('\\v ')) started = true
      else continue
    }
    if (skipUntil) {
      if (line === skipUntil) skipUntil = null
      continue
    }
    if (line === '\\fn') { skipUntil = '\\*fn'; continue }
    if (line === '\\ref') { skipUntil = '\\*ref'; continue }
    if (line === '\\psalm-title') { skipUntil = '\\*psalm-title'; continue }
    if (line === '\\added' || line === '\\*added') continue
    if (line.startsWith('\\v ')) {
      flush()
      const [, ch, vs] = line.slice(3).trim().split('.')
      curCh = ch
      curVs = vs
      continue
    }
    if (line) buffer.push(line)
  }
  flush()
  return chapters
}

async function main() {
  const { pt, en } = canonicalBooks()

  await mkdir(new URL('en-web/', OUT_DIR), { recursive: true })
  await mkdir(new URL('pt-almeida1911/', OUT_DIR), { recursive: true })
  await mkdir(new URL('pt-blivre/', OUT_DIR), { recursive: true })

  console.log('Baixando Almeida 1911 (JFAAL)...')
  const almeida = await fetchJson('https://raw.githubusercontent.com/BibliaJFAAL/JFAAL/main/original/1911-JFAAtualizada.json')
  if (almeida.books.length !== 66) throw new Error(`JFAAL tem ${almeida.books.length} livros, esperava 66`)

  let ptTotal = 0
  for (let i = 0; i < 66; i++) {
    const chapters = compactAlmeidaBook(almeida.books[i])
    const n = countVerses(chapters)
    if (n === 0) throw new Error(`Capítulo vazio detectado em pt: ${pt[i]}`)
    ptTotal += n
    const slug = slugify(pt[i])
    await writeFile(new URL(`pt-almeida1911/${slug}.json`, OUT_DIR), JSON.stringify(chapters))
  }
  console.log(`PT: ${ptTotal} versículos escritos em 66 arquivos.`)
  if (Math.abs(ptTotal - EXPECTED_TOTAL_VERSES) > 50) {
    throw new Error(`Contagem de versículos PT (${ptTotal}) muito distante do esperado (${EXPECTED_TOTAL_VERSES})`)
  }

  console.log('Baixando World English Bible (livro por livro)...')
  let enTotal = 0
  for (let i = 0; i < 66; i++) {
    const filename = WEB_FILENAMES[en[i]]
    if (!filename) throw new Error(`Sem nome de arquivo WEB mapeado para: ${en[i]}`)
    const raw = await fetchJson(`https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/${filename}.json`)
    const chapters = compactWebBook(raw)
    const n = countVerses(chapters)
    if (n === 0) throw new Error(`Capítulo vazio detectado em en: ${en[i]}`)
    enTotal += n
    const slug = slugify(en[i])
    await writeFile(new URL(`en-web/${slug}.json`, OUT_DIR), JSON.stringify(chapters))
  }
  console.log(`EN: ${enTotal} versículos escritos em 66 arquivos.`)
  if (Math.abs(enTotal - EXPECTED_TOTAL_VERSES) > 50) {
    throw new Error(`Contagem de versículos EN (${enTotal}) muito distante do esperado (${EXPECTED_TOTAL_VERSES})`)
  }

  console.log('Baixando Bíblia Livre (BLIVRE, livro por livro)...')
  let blivreTotal = 0
  for (let i = 0; i < 66; i++) {
    const filename = BLIVRE_FILENAMES[pt[i]]
    if (!filename) throw new Error(`Sem nome de arquivo BLIVRE mapeado para: ${pt[i]}`)
    const raw = await fetchText(`https://raw.githubusercontent.com/blivre/BibliaLivre/master/textos/f4/geral/${filename}.txt`)
    const chapters = parseBlivreBook(raw)
    const n = countVerses(chapters)
    if (n === 0) throw new Error(`Capítulo vazio detectado em blivre: ${pt[i]}`)
    blivreTotal += n
    const slug = slugify(pt[i])
    await writeFile(new URL(`pt-blivre/${slug}.json`, OUT_DIR), JSON.stringify(chapters))
  }
  console.log(`BLIVRE: ${blivreTotal} versículos escritos em 66 arquivos.`)
  if (Math.abs(blivreTotal - EXPECTED_TOTAL_VERSES) > 50) {
    throw new Error(`Contagem de versículos BLIVRE (${blivreTotal}) muito distante do esperado (${EXPECTED_TOTAL_VERSES})`)
  }

  console.log('OK — geração concluída.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
