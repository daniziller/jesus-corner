// Fecho da leitura — tela 37e do pacote 36-37 (ver
// handoff-passos-36-37/HANDOFF-36-37-passos.md). Mesmo espírito de
// api/generate-chapter-context.js/generate-reflection-questions.js: GET
// com conta, cacheado na borda (o conteúdo é igual pra quem leu o mesmo
// trecho — implicação técnica 6 do antigo ADENDO-identidade-e-IA.md,
// reaproveitada aqui). Regra do handoff ("toda referência gerada passa
// pela checagem contra o texto da versão do usuário antes de aparecer"):
// pickMoments() (_lib/readingSummaryCheck.js) confere cada "momento"
// contra o texto bíblico real ANTES de devolver — um momento que não bate
// sai; com menos de 2 certos, a resposta é descartada (502) e não sai
// meio-verificada (mesmo espírito de verifyCitation em
// api/ask-about-passage.js).
import { generateReadingSummary } from './_lib/ai.js'
import { meterAi } from './_lib/aiBudget.js'
import { requireCaller } from './_lib/caller.js'
import { pickMoments, summaryHasText, verificationReport } from './_lib/readingSummaryCheck.js'
import { describeAiFailure } from './_lib/aiErrorReport.js'
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


export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  // Gerar exige o Premium e saldo no limite mensal de IA (api/_lib/aiBudget.js).
  const who = await requireCaller(req, res, { needsAI: true, budget: true })
  if (!who) return

  const { book, chStart, chEnd, lang } = req.query
  const cleanLang = lang === 'en' ? 'en' : 'pt'
  const startNum = Number(chStart)
  const endNum = Number(chEnd ?? chStart)
  if (!book || !VALID_BOOKS.has(book) || !Number.isInteger(startNum) || !Number.isInteger(endNum) || startNum < 1 || endNum < startNum || endNum - startNum >= MAX_CHAPTER_SPAN) {
    return res.status(400).json({ error: 'invalid_passage' })
  }

  const bookNameForFolder = cleanLang === 'en' ? BOOK_EN_BY_PT[book] : book
  const versions = BIBLE_VERSIONS[cleanLang] ?? BIBLE_VERSIONS.pt
  const folder = versions[0].folder

  const chapters = await fetchBookChapters(folder, bookNameForFolder)
  if (!chapters) return res.status(400).json({ error: 'invalid_passage' })
  const chapterText = Array.from({ length: endNum - startNum + 1 }, (_, i) => chapterFullText(chapters[String(startNum + i)]))
    .filter(Boolean).join(' ')
  if (!chapterText) return res.status(400).json({ error: 'invalid_passage' })

  const bookInfoSource = cleanLang === 'en' ? BOOK_INFO_EN : BOOK_INFO
  const bookInfo = bookInfoSource[book] ?? null

  // Duas tentativas: a IA às vezes devolve fora do formato ou com uma
  // faixa de versículos que não existe — a segunda chamada costuma vir
  // certa. Cada momento é conferido contra o texto real
  // (readingSummaryCheck.js); os ruins saem, e o fecho vale com 2 ou 3.
  let result = null
  for (let attempt = 1; attempt <= 2 && !result; attempt++) {
    let candidate
    try {
      candidate = await meterAi(who.caller.id, 'resumo-da-leitura', () => generateReadingSummary({ book, chStart: startNum, chEnd: endNum, chapterText, bookInfo, lang: cleanLang }))
    } catch (err) {
      // Só a forma do problema (qual regra do formato falhou), nunca o texto gerado.
      console.error(`[generate-reading-summary] AI call failed (attempt ${attempt}) ${book} ${startNum}-${endNum} ${cleanLang}: ${describeAiFailure(err)}`)
      continue
    }
    const moments = pickMoments(candidate?.moments, chapters, startNum, endNum)
    if (moments && summaryHasText(candidate)) result = { ...candidate, moments }
    else console.error(`[generate-reading-summary] response failed verification (attempt ${attempt}) ${book} ${startNum}-${endNum} ${cleanLang}: ${verificationReport(candidate, chapters, startNum, endNum)}`)
  }
  if (!result) return res.status(502).json({ error: 'ai_generation_failed' })

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400')
  return res.status(200).json({ ok: true, summary: result })
}
