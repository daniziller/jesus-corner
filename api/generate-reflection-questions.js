// Perguntas de reflexão geradas — tela 10d do redesign Bento (ver
// design_handoff_jesus_corner/ADENDO-identidade-e-IA.md). Mesmo espírito
// de api/generate-chapter-context.js: GET público, cacheado na borda (as
// PERGUNTAS são iguais pra quem leu o mesmo capítulo — implicação técnica
// 6 do adendo). Só as RESPOSTAS da pessoa e o parágrafo final são
// individuais — isso é api/compose-reflection.js, autenticado e sem cache.
import { generateReflectionQuestions } from './_lib/ai.js'
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
const MAX_CHAPTER_SPAN = 10 // sessões de leitura nunca passam disso (ver src/utils/wordChunking.js) — só uma trava contra abuso

const bookTextCache = new Map()
function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const promise = fetch(`${APP_URL}/bible-text/${folder}/${slugify(bookName)}.json`)
    .then(res => (res.ok ? res.json() : null))
    .catch(err => {
      console.error('[generate-reflection-questions] failed to fetch book text:', bookName, err.message)
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
    result = await generateReflectionQuestions({ book, chStart: startNum, chEnd: endNum, chapterText, bookInfo, lang: cleanLang })
  } catch (err) {
    console.error('[generate-reflection-questions] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400')
  return res.status(200).json({ ok: true, questions: result.questions })
}
