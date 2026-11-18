// Sugestões de pergunta pro menu "Perguntar" (tela 10a do redesign Bento,
// ver design_handoff_jesus_corner/ADENDO-identidade-e-IA.md): três chips
// gerados pro trecho selecionado. Mesmo molde de api/generate-chapter-
// context.js — GET, porque o trecho é o mesmo pra quem quer que o
// selecione: o cache é o CDN da Vercel (Cache-Control abaixo), a primeira
// pessoa a selecionar um trecho paga a geração e as próximas recebem da
// borda. Gerar exige conta com o plano com IA (requireCaller): sem isso,
// qualquer um na internet disparava chamadas pagas variando a URL.
import { suggestPassageQuestions } from './_lib/ai.js'
import { meterAi } from './_lib/aiBudget.js'
import { requireCaller } from './_lib/caller.js'
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

  // O menu "Perguntar" só aparece pra quem tem o plano com IA (ver
  // ReadingBlockView); quem chama sem ele cai nas três sugestões fixas.
  // Gerar exige o Premium e saldo no limite mensal de IA (api/_lib/aiBudget.js).
  const who = await requireCaller(req, res, { needsAI: true, budget: true })
  if (!who) return

  const { book, chapter, verseStart, verseEnd, lang } = req.query
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const chapterNum = Number(chapter)
  const vs = Number(verseStart)
  const ve = Number(verseEnd ?? verseStart)
  if (!book || !VALID_BOOKS.has(book) || !Number.isInteger(chapterNum) || chapterNum < 1
    || !Number.isInteger(vs) || !Number.isInteger(ve) || vs < 1 || ve < vs || ve - vs > 30) {
    return res.status(400).json({ error: 'invalid_passage' })
  }

  const bookNameForFolder = cleanLang === 'en' ? BOOK_EN_BY_PT[book] : book
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  const verses = chapters?.[String(chapterNum)]?.verses
  if (!verses) return res.status(400).json({ error: 'invalid_passage' })
  const passageText = Array.from({ length: ve - vs + 1 }, (_, i) => verses[String(vs + i)]).filter(Boolean).join(' ')
  if (!passageText) return res.status(400).json({ error: 'invalid_passage' })

  let result
  try {
    result = await meterAi(who.caller.id, 'sugestoes-de-pergunta', () => suggestPassageQuestions({ book, chapter: chapterNum, verseRange: vs === ve ? `${vs}` : `${vs}-${ve}`, passageText, lang: cleanLang }))
  } catch (err) {
    console.error('[suggest-passage-questions] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_generation_failed' })
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400')
  return res.status(200).json({ ok: true, questions: result.questions })
}
