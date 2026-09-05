// Sugestões de pergunta pro menu "Perguntar" (tela 10a do redesign Bento,
// ver design_handoff_jesus_corner/ADENDO-identidade-e-IA.md): três chips
// gerados pro trecho selecionado. Mesmo molde de api/generate-chapter-
// context.js — GET, público e sem limite, porque o trecho é o mesmo pra
// quem quer que o selecione: o cache é o CDN da Vercel (Cache-Control
// abaixo), a primeira pessoa a selecionar um trecho paga a geração e as
// próximas recebem da borda. Nada sensível sai daqui (só três perguntas
// sobre um versículo público); quem decide se o menu aparece é o cliente
// (session.hasAI + o interruptor "Perguntar sobre o texto" de 10f).
import { suggestPassageQuestions } from './_lib/ai.js'
import { BIBLE_VERSIONS } from '../src/data/bibleVersions.js'
import { BIBLE_BLOCKS } from '../src/data/bibleBlocks.js'
import { slugify } from '../src/utils/slugify.js'

const APP_URL = 'https://app.jesuscorner.app'

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)
const VALID_BOOKS = new Set(BIBLE_BLOCKS.flatMap(b => b.books))

const bookTextCache = new Map()
function fetchBookChapters(folder, bookName) {
  const key = `${folder}:${bookName}`
  if (bookTextCache.has(key)) return bookTextCache.get(key)
  const promise = fetch(`${APP_URL}/bible-text/${folder}/${slugify(bookName)}.json`)
    .then(res => (res.ok ? res.json() : null))
    .catch(err => {
      console.error('[suggest-passage-questions] failed to fetch book text:', bookName, err.message)
      return null
    })
  bookTextCache.set(key, promise)
  return promise
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const { book, bookEn, chapter, verseStart, verseEnd, lang } = req.query
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const chapterNum = Number(chapter)
  const vs = Number(verseStart)
  const ve = Number(verseEnd ?? verseStart)
  if (!book || !VALID_BOOKS.has(book) || !Number.isInteger(chapterNum) || chapterNum < 1
    || !Number.isInteger(vs) || !Number.isInteger(ve) || vs < 1 || ve < vs || ve - vs > 30) {
    return res.status(400).json({ error: 'invalid_passage' })
  }

  const bookNameForFolder = cleanLang === 'en' ? (bookEn || BOOK_EN_BY_PT[book] || book) : book
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  const verses = chapters?.[String(chapterNum)]?.verses
  if (!verses) return res.status(400).json({ error: 'invalid_passage' })
  const passageText = Array.from({ length: ve - vs + 1 }, (_, i) => verses[String(vs + i)]).filter(Boolean).join(' ')
  if (!passageText) return res.status(400).json({ error: 'invalid_passage' })

  let result
  try {
    result = await suggestPassageQuestions({ book, chapter: chapterNum, verseRange: vs === ve ? `${vs}` : `${vs}-${ve}`, passageText, lang: cleanLang })
  } catch (err) {
    console.error('[suggest-passage-questions] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400')
  return res.status(200).json({ ok: true, questions: result.questions })
}
