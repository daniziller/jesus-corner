// Fecho da leitura — tela 37e do pacote 36-37 (ver
// handoff-passos-36-37/HANDOFF-36-37-passos.md). Mesmo espírito de
// api/generate-chapter-context.js/generate-reflection-questions.js: GET
// público, cacheado na borda (o conteúdo é igual pra quem leu o mesmo
// trecho — implicação técnica 6 do antigo ADENDO-identidade-e-IA.md,
// reaproveitada aqui). Regra do handoff ("toda referência gerada passa
// pela checagem contra o texto da versão do usuário antes de aparecer"):
// verifyMoments() abaixo confere cada um dos 3 "momentos" contra o texto
// bíblico real ANTES de devolver — se qualquer um não bater, a resposta
// inteira é descartada (502), nunca sai meio-verificada (mesmo padrão de
// verifyCitation em api/ask-about-passage.js).
import { generateReadingSummary } from './_lib/ai.js'
import { BOOK_INFO } from '../src/data/bookInfo.js'
import { BOOK_INFO_EN } from '../src/data/bookInfo.en.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const APP_URL = 'https://app.jesuscorner.app'
const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const VALID_BOOKS = new Set(BIBLE_BLOCKS.flatMap(b => b.books))
const MAX_CHAPTER_SPAN = 10 // mesma trava de generate-reflection-questions.js — sessões de leitura nunca passam disso

const bookTextCache = new Map()
function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const promise = fetch(`${APP_URL}/bible-text/${folder}/${slugify(bookName)}.json`)
    .then(res => (res.ok ? res.json() : null))
    .catch(err => {
      console.error('[generate-reading-summary] failed to fetch book text:', bookName, err.message)
      return null
    })
  bookTextCache.set(key, promise)
  return promise
}

function chapterFullText(chapterData) {
  if (!chapterData?.verses) return null
  return Object.keys(chapterData.verses)
    .map(Number)
    .sort((a, b) => a - b)
    .map(v => chapterData.verses[String(v)])
    .join(' ')
}

// Confere se os 3 "momentos" gerados apontam pra versículos de verdade —
// capítulo dentro da faixa lida, e verseStart/verseEnd dentro do que o
// capítulo realmente tem (sem cobrir 0 texto, o que indicaria faixa
// inventada). Não bater um só = descarta a resposta inteira.
function verifyMoments(moments, chapters, chStart, chEnd) {
  if (!Array.isArray(moments) || moments.length !== 3) return false
  return moments.every(m => {
    if (m.chapter < chStart || m.chapter > chEnd) return false
    if (m.verseStart < 1 || m.verseEnd < m.verseStart) return false
    const chapterData = chapters[String(m.chapter)]
    if (!chapterData?.verses) return false
    const text = Array.from(
      { length: m.verseEnd - m.verseStart + 1 },
      (_, i) => chapterData.verses[String(m.verseStart + i)]
    ).filter(Boolean).join(' ')
    return text.length > 0
  })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const { book, bookEn, chStart, chEnd, lang } = req.query
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const startNum = Number(chStart)
  const endNum = Number(chEnd ?? chStart)
  if (!book || !VALID_BOOKS.has(book) || !Number.isInteger(startNum) || !Number.isInteger(endNum) || startNum < 1 || endNum < startNum || endNum - startNum >= MAX_CHAPTER_SPAN) {
    return res.status(400).json({ error: 'invalid_passage' })
  }

  const bookNameForFolder = cleanLang === 'en' ? (bookEn || BOOK_EN_BY_PT[book] || book) : book
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  if (!chapters) return res.status(400).json({ error: 'invalid_passage' })
  const chapterText = Array.from({ length: endNum - startNum + 1 }, (_, i) => chapterFullText(chapters[String(startNum + i)]))
    .filter(Boolean).join(' ')
  if (!chapterText) return res.status(400).json({ error: 'invalid_passage' })

  const bookInfoSource = cleanLang === 'en' ? BOOK_INFO_EN : BOOK_INFO
  const bookInfo = bookInfoSource[book] ?? null

  let result
  try {
    result = await generateReadingSummary({ book, chStart: startNum, chEnd: endNum, chapterText, bookInfo, lang: cleanLang })
  } catch (err) {
    console.error('[generate-reading-summary] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  if (!verifyMoments(result.moments, chapters, startNum, endNum)) {
    console.error('[generate-reading-summary] moments failed verification, discarding response')
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400')
  return res.status(200).json({ ok: true, summary: result })
}
